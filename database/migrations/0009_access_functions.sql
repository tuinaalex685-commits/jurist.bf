-- ============================================================================
-- 0009 — Rédemption de code d'accès (SECURITY DEFINER, atomique & idempotente)
-- Appelée par un utilisateur authentifié ; hashe le code (jamais de clair stocké),
-- verrouille la ligne, applique l'idempotence, rattache l'organisation du lot.
-- ============================================================================

create or replace function redeem_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid  uuid := auth.uid();
  v_hash text;
  v_code access_codes;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  v_hash := encode(digest(p_code, 'sha256'), 'hex');

  select * into v_code from access_codes where code_hash = v_hash for update;
  if not found then
    raise exception 'INVALID_CODE';
  end if;

  -- Idempotence : déjà rédimé par le même utilisateur → succès (pas d'erreur).
  if v_code.status = 'active' and v_code.redeemed_by = v_uid then
    return jsonb_build_object('status', 'already', 'batch_id', v_code.batch_id);
  end if;

  if v_code.status <> 'unused' then
    raise exception 'CODE_UNAVAILABLE';
  end if;

  -- Expiration éventuelle du lot.
  if exists (
    select 1 from access_code_batches b
    where b.id = v_code.batch_id and b.expires_at is not null and b.expires_at < now()
  ) then
    update access_codes set status = 'expired' where id = v_code.id;
    raise exception 'CODE_UNAVAILABLE';
  end if;

  update access_codes
     set status = 'active', redeemed_by = v_uid, redeemed_at = now()
   where id = v_code.id;

  -- Rattache l'organisation du lot au profil (si non déjà rattaché).
  update profiles p
     set org_id = b.org_id
    from access_code_batches b
   where b.id = v_code.batch_id
     and p.id = v_uid
     and p.org_id is null
     and b.org_id is not null;

  return jsonb_build_object('status', 'redeemed', 'batch_id', v_code.batch_id);
end $$;

revoke all on function redeem_access_code(text) from public;
grant execute on function redeem_access_code(text) to authenticated;
