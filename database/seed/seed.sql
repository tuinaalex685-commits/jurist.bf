-- ============================================================================
-- Seed — données de référence + jeu de démonstration (idempotent).
-- À exécuter après les migrations 0001→0008.
-- ============================================================================

-- Pays
insert into countries (id, iso, name) values
  ('11111111-1111-1111-1111-111111111111', 'BF', 'Burkina Faso')
on conflict (iso) do nothing;

-- Rangs (les 5 grades de l'Académie)
insert into ranks (level, name, xp_threshold) values
  (1, 'Néophyte', 0),
  (2, 'Initié', 500),
  (3, 'Praticien', 1500),
  (4, 'Plaideur', 3500),
  (5, 'Maître', 7000)
on conflict (level) do nothing;

-- Badges / distinctions
insert into badges (code, name, description, condition) values
  ('first_seal', 'Premier Sceau', 'Premier article maîtrisé', '{"seals": 1}'),
  ('ten_articles', 'Dix Articles', '10 articles maîtrisés', '{"seals": 10}'),
  ('perfect_memo', 'Mémoire Parfaite', 'Mémorisation sans faute', '{"perfect_memorization": true}'),
  ('exam_ace', 'Sans Faute', 'Examen réussi sans erreur', '{"perfect_exam": true}'),
  ('streak_30', 'Assidu', '30 jours de série', '{"streak_days": 30}')
on conflict (code) do nothing;

-- Prompt Maître (placeholder — sera édité depuis le cockpit)
insert into prompt_templates (key, version, body, is_active, model)
values (
  'master', 1,
  'Tu es le concepteur pédagogique de Jurist BF. À partir du TEXTE OFFICIEL d''un article de loi '
  || 'et de sa notion, produis un contenu strictement fidèle au droit (jamais d''invention) : '
  || 'introduction, pourquoi la règle existe, ce qu''elle protège, situations pratiques (dont cas pièges), '
  || 'explications, exceptions, mémorisation (texte à trous), flashcards, questions et corrigés. '
  || 'Réponds en JSON structuré.',
  true, 'gemini-2.0-flash'
)
on conflict (key, version) do nothing;

-- --- Jeu de démonstration : Code pénal BF → article 613-1 (abus de confiance) ---
insert into legal_codes (id, country_id, name, type, description) values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'Code pénal burkinabè', 'penal',
   'Loi N° 025-2018/AN portant Code pénal du Burkina Faso.')
on conflict (id) do nothing;

insert into structure_nodes (id, code_id, parent_id, type, label, number, path) values
  ('33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222222', null,
   'livre', 'Des atteintes aux biens', 'III', 'l3')
on conflict (id) do nothing;

insert into articles (id, code_id, node_id, number, title, difficulty, estimated_minutes) values
  ('44444444-4444-4444-4444-444444444444',
   '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333',
   '613-1', 'De l''abus de confiance', 'intermediaire', 15)
on conflict (id) do nothing;

insert into article_versions (id, article_id, version_no, official_text, text_hash, status, published_at) values
  ('55555555-5555-5555-5555-555555555555',
   '44444444-4444-4444-4444-444444444444', 1,
   'L''abus de confiance est le fait par une personne de détourner, au préjudice d''autrui, des fonds, des valeurs ou un bien quelconque qui lui ont été remis et qu''elle a acceptés à charge de les rendre, de les représenter ou d''en faire un usage ou un emploi déterminé.',
   'seed-hash-613-1-v1', 'published', now())
on conflict (id) do nothing;

update articles
  set current_version_id = '55555555-5555-5555-5555-555555555555'
  where id = '44444444-4444-4444-4444-444444444444'
    and current_version_id is null;
