-- ============================================================================
-- Seed pédagogique — article 613-1 (abus de confiance), version publiée
-- version_id = 55555555-5555-5555-5555-555555555555
-- Statut 'published' (visible par les étudiants). Idempotent.
-- (En production, ce contenu sera GÉNÉRÉ par l'IA côté admin — ici on l'amorce
--  manuellement pour valider le moteur d'apprentissage B4.)
-- ============================================================================
begin;

-- Phase 0 — Découverte (narratif)
insert into article_pedagogy (article_version_id, intro, why, protects, outcomes, status) values (
  '55555555-5555-5555-5555-555555555555',
  'L''abus de confiance consiste à détourner des fonds, des valeurs ou un bien remis à charge de les rendre, de les représenter ou d''en faire un usage déterminé. C''est une trahison de la confiance placée en l''auteur.',
  'La vie économique repose sur la confiance : on prête, on confie, on mandate. Sans protection, quiconque reçoit un bien pour un usage précis pourrait le garder impunément.',
  'Elle protège la personne qui a remis un bien de bonne foi — propriétaire, possesseur ou simple détenteur — contre celui qui abuse de la mission confiée.',
  '["Distinguer l''abus de confiance du vol et de l''escroquerie","Repérer une remise volontaire préalable","Identifier le moment où l''usage devient un détournement"]'::jsonb,
  'published'
) on conflict (article_version_id) do update
  set intro = excluded.intro, why = excluded.why, protects = excluded.protects,
      outcomes = excluded.outcomes, status = 'published';

-- Phase 1 — Reconnaissance (situations = dossiers)
insert into situations (id, article_version_id, level, scenario, context, characters, key_facts, question, answer, explanation, status, position) values
  ('a1000001-0000-0000-0000-000000000001','55555555-5555-5555-5555-555555555555','simple',
   'Aminata prête son ordinateur à son collègue Moussa pour le week-end. Le lundi, Moussa refuse de le rendre et le revend au marché.',
   'Un prêt informel entre collègues, avec accord clair de restitution.',
   '[{"name":"Aminata","role":"Propriétaire de l''ordinateur"},{"name":"Moussa","role":"Collègue à qui le bien est confié"}]'::jsonb,
   '["Remise volontaire","Accord de restitution","Revente du bien"]'::jsonb,
   'S''agit-il d''un abus de confiance ?','Oui',
   'Le bien a été remis volontairement à charge de le rendre, et Moussa l''a détourné en le revendant.','published',0),
  ('a1000001-0000-0000-0000-000000000002','55555555-5555-5555-5555-555555555555','piege',
   'Karim vole le portefeuille de Sophie dans son sac alors qu''elle ne regarde pas.',
   'Une soustraction à l''insu de la victime, sans aucune remise préalable.',
   '[{"name":"Karim","role":"Auteur"},{"name":"Sophie","role":"Victime"}]'::jsonb,
   '["Aucune remise volontaire","Bien pris à l''insu"]'::jsonb,
   'S''agit-il d''un abus de confiance ?','Non',
   'Il s''agit d''un vol. L''abus de confiance suppose une remise volontaire préalable du bien.','published',1),
  ('a1000001-0000-0000-0000-000000000003','55555555-5555-5555-5555-555555555555','intermediaire',
   'Une entreprise confie un véhicule de service à un employé pour ses tournées. L''employé l''utilise pour faire le taxi le week-end à son profit.',
   'Un bien remis pour un usage déterminé, détourné à des fins personnelles.',
   '[{"name":"L''entreprise","role":"Propriétaire"},{"name":"L''employé","role":"Détenteur pour un usage déterminé"}]'::jsonb,
   '["Remise pour usage précis","Usage personnel lucratif"]'::jsonb,
   'L''employé a-t-il commis un abus de confiance ?','Oui',
   'Le véhicule a été remis pour un usage déterminé. L''utiliser à des fins personnelles constitue un détournement.','published',2)
on conflict (id) do nothing;

-- Phase 2 — Compréhension (blocs)
insert into comprehension_blocks (id, article_version_id, type, content, status, position) values
  ('b2000001-0000-0000-0000-000000000001','55555555-5555-5555-5555-555555555555','conditions','Une remise volontaire préalable du bien par la victime.','published',0),
  ('b2000001-0000-0000-0000-000000000002','55555555-5555-5555-5555-555555555555','elements','Un accord sur la destination du bien (à rendre, représenter ou pour un usage déterminé).','published',1),
  ('b2000001-0000-0000-0000-000000000003','55555555-5555-5555-5555-555555555555','elements','Un détournement : acte manifestant la volonté de se comporter en propriétaire.','published',2),
  ('b2000001-0000-0000-0000-000000000004','55555555-5555-5555-5555-555555555555','conditions','Un préjudice subi par le propriétaire, le possesseur ou le détenteur du bien.','published',3)
on conflict (id) do nothing;

-- Phase 3 — Mémorisation (texte à trous)
insert into memorization_items (id, article_version_id, cloze_template, blanks, level, status, position) values
  ('c3000001-0000-0000-0000-000000000001','55555555-5555-5555-5555-555555555555',
   'L''abus de confiance est le fait par une personne de [BLANK_1], au préjudice d''autrui, des fonds, des valeurs ou un bien quelconque qui lui ont été [BLANK_2] et qu''elle a acceptés à charge de les [BLANK_3], de les représenter ou d''en faire un usage ou un emploi déterminé.',
   '["détourner","remis","rendre"]'::jsonb, 1, 'published', 0)
on conflict (id) do nothing;

commit;
