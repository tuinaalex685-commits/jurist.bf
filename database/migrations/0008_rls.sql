-- ============================================================================
-- 0008 — Row Level Security (deny-by-default + politiques)
-- RLS activée partout. `service_role` (workers/admin serveur) contourne la RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers de rôle (définis ici car ils référencent `profiles`).
-- SECURITY DEFINER pour lire profiles sans récursion RLS.
-- ---------------------------------------------------------------------------
create or replace function current_role_level()
returns int language sql stable security definer set search_path = public as $$
  select case (select role from profiles where id = auth.uid())
    when 'admin' then 3
    when 'content_admin' then 2
    when 'student' then 1
    else 0
  end;
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_content_admin()
returns boolean language sql stable set search_path = public as $$
  select current_role_level() >= 2;
$$;

-- Activer RLS sur toutes les tables applicatives
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','org_members','ranks','badges',
    'countries','legal_codes','structure_nodes','articles','article_versions',
    'article_pedagogy','situations','comprehension_blocks','memorization_items','flashcards','exam_questions_bank',
    'source_documents','prompt_templates','generation_batches',
    'user_article_progress','user_phase_progress','attempts',
    'xp_ledger','user_badges','seals','user_stats',
    'srs_cards','review_logs',
    'exams','exam_sessions','exam_session_questions',
    'notifications','access_code_batches','access_codes','subscriptions','invoices',
    'ai_generations','ai_usage','ai_budget_config','audit_logs','analytics_events','jobs'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- --- Profils ---
create policy profiles_self_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update using (id = auth.uid());
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- --- Tenancy ---
create policy orgs_read on organizations for select using (auth.uid() is not null);
create policy orgs_admin on organizations for all using (is_admin()) with check (is_admin());
create policy orgmembers_self on org_members for select using (user_id = auth.uid() or is_admin());
create policy orgmembers_admin on org_members for all using (is_admin()) with check (is_admin());

-- --- Référentiels lisibles par tout authentifié ; écriture content_admin+ ---
do $$
declare t text;
begin
  foreach t in array array['ranks','badges','countries','legal_codes','structure_nodes','articles'] loop
    execute format('create policy %1$s_read on %1$s for select using (auth.uid() is not null);', t);
    execute format('create policy %1$s_write on %1$s for all using (is_content_admin()) with check (is_content_admin());', t);
  end loop;
end $$;

-- --- Versions & contenu pédagogique : lecture si published, sinon content_admin ---
create policy av_read on article_versions for select
  using (status = 'published' or is_content_admin());
create policy av_write on article_versions for all
  using (is_content_admin()) with check (is_content_admin());

do $$
declare t text;
begin
  foreach t in array array['article_pedagogy','situations','comprehension_blocks','memorization_items','flashcards','exam_questions_bank'] loop
    execute format($f$create policy %1$s_read on %1$s for select using (status = 'published' or is_content_admin());$f$, t);
    execute format('create policy %1$s_write on %1$s for all using (is_content_admin()) with check (is_content_admin());', t);
  end loop;
end $$;

-- --- Content Studio : content_admin/admin uniquement ---
do $$
declare t text;
begin
  foreach t in array array['source_documents','prompt_templates','generation_batches'] loop
    execute format('create policy %1$s_admin on %1$s for all using (is_content_admin()) with check (is_content_admin());', t);
  end loop;
end $$;

-- --- Données utilisateur (scopées user_id = auth.uid()) ---
do $$
declare t text;
begin
  foreach t in array array[
    'user_article_progress','user_phase_progress','attempts','xp_ledger','user_badges',
    'seals','user_stats','srs_cards','review_logs','notifications','subscriptions'
  ] loop
    execute format($f$create policy %1$s_own on %1$s for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
    execute format('create policy %1$s_admin on %1$s for select using (is_admin());', t);
  end loop;
end $$;

-- Invoices : propre lecture + admin
create policy invoices_own on invoices for select using (user_id = auth.uid() or is_admin());

-- --- Examens ---
create policy exams_read on exams for select using (status = 'published' or is_content_admin());
create policy exams_write on exams for all using (is_content_admin()) with check (is_content_admin());
create policy exam_sessions_own on exam_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exam_sessions_admin on exam_sessions for select using (is_admin());
create policy esq_own on exam_session_questions for all
  using (exists (select 1 from exam_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from exam_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- --- Tables internes/business : admin only (service_role contourne pour les workers) ---
do $$
declare t text;
begin
  foreach t in array array['access_code_batches','access_codes','ai_generations','ai_usage','ai_budget_config','audit_logs','analytics_events','jobs'] loop
    execute format('create policy %1$s_admin on %1$s for all using (is_admin()) with check (is_admin());', t);
  end loop;
end $$;
