-- ============================================================================
-- Seed — Examen « Code pénal — Niveau 1 » (scope: code pénal burkinabè)
-- + banque de questions pour l'article 613-1. Idempotent.
-- ============================================================================
begin;

insert into exams (id, scope, title, difficulty, duration_seconds, pass_threshold, reward, status) values (
  'f0000000-0000-4000-8000-000000000001',
  jsonb_build_object('code_id', '22222222-2222-2222-2222-222222222222', 'question_count', 4),
  'Code pénal — Niveau 1', 'intermediaire', 600, 0.6,
  '{"badge":"exam_ace","xp":150}'::jsonb, 'published'
) on conflict (id) do nothing;

insert into exam_questions_bank (id, article_version_id, type, payload, difficulty, status) values
('e1000000-0000-4000-8000-000000000001','55555555-5555-5555-5555-555555555555','vrai_faux',
 $j${"question":"L'abus de confiance suppose une remise volontaire préalable du bien.","correct":"true"}$j$::jsonb,
 'simple','published'),
('e1000000-0000-4000-8000-000000000002','55555555-5555-5555-5555-555555555555','vrai_faux',
 $j${"question":"Voler un portefeuille dans un sac à l'insu de la victime est un abus de confiance.","correct":"false"}$j$::jsonb,
 'piege','published'),
('e1000000-0000-4000-8000-000000000003','55555555-5555-5555-5555-555555555555','qcm',
 $j${"question":"Quel élément caractérise le détournement dans l'abus de confiance ?","options":["Le vol à l'insu du propriétaire","L'usage du bien conforme à sa destination","Un acte manifestant la volonté de se comporter en propriétaire","Le remboursement immédiat du bien"],"correct":"Un acte manifestant la volonté de se comporter en propriétaire"}$j$::jsonb,
 'intermediaire','published'),
('e1000000-0000-4000-8000-000000000004','55555555-5555-5555-5555-555555555555','qcm',
 $j${"question":"Un employé utilise le véhicule de service de l'entreprise pour un usage personnel lucratif. Cela constitue :","options":["Un vol","Un abus de confiance","Une escroquerie","Aucune infraction"],"correct":"Un abus de confiance"}$j$::jsonb,
 'intermediaire','published'),
('e1000000-0000-4000-8000-000000000005','55555555-5555-5555-5555-555555555555','vrai_faux',
 $j${"question":"L'abus de confiance nécessite un préjudice subi par la victime.","correct":"true"}$j$::jsonb,
 'simple','published')
on conflict (id) do nothing;

commit;
