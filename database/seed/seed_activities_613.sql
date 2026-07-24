-- ============================================================================
-- Seed d'ACTIVITÉS — article 613-1 (abus de confiance), version publiée
-- version_id = 55555555-5555-5555-5555-555555555555
-- Démontre le moteur polymorphe : discovery, situation_choice, select_elements,
-- ordering, matching, argued_answer, cloze. Idempotent (on conflict do nothing).
-- (En prod : ce contenu sera GÉNÉRÉ par l'IA côté admin.)
-- Prompts en dollar-quoting pour éviter l'échappement des apostrophes.
-- ============================================================================
begin;

-- ---- Activités (contenu PUBLIC) ----
insert into activities (id, article_version_id, phase, position, type, objective, difficulty, weight, prompt, status) values
-- Phase 0 — Découverte
('d0000000-0000-4000-8000-000000000000','55555555-5555-5555-5555-555555555555',0,0,'discovery',
 'Comprendre la notion avant de l''appliquer', null, 0,
 $j${"intro":"L'abus de confiance consiste à détourner des fonds, valeurs ou biens remis à charge de les rendre, représenter ou d'en faire un usage déterminé.","why":"La vie économique repose sur la confiance : on prête, on confie, on mandate. Sans protection, quiconque reçoit un bien pour un usage précis pourrait le garder impunément.","protects":"Elle protège celui qui a remis un bien de bonne foi — propriétaire, possesseur ou détenteur — contre l'abus de la mission confiée.","outcomes":["Distinguer l'abus de confiance du vol et de l'escroquerie","Repérer une remise volontaire préalable","Identifier le moment où l'usage devient un détournement"]}$j$::jsonb,
 'published'),

-- Phase 1 — Reconnaissance
('a1000000-0000-4000-8000-000000000001','55555555-5555-5555-5555-555555555555',1,0,'situation_choice',
 'Reconnaître un abus de confiance évident','simple',1,
 $j${"scenario":"Aminata prête son ordinateur à son collègue Moussa pour le week-end. Le lundi, Moussa refuse de le rendre et le revend au marché.","context":"Un prêt informel entre collègues, avec accord clair de restitution.","characters":[{"name":"Aminata","role":"Propriétaire"},{"name":"Moussa","role":"Détenteur du bien confié"}],"keyFacts":["Remise volontaire","Accord de restitution","Revente du bien"],"question":"S'agit-il d'un abus de confiance ?","options":["Oui","Non"]}$j$::jsonb,
 'published'),
('a1000000-0000-4000-8000-000000000002','55555555-5555-5555-5555-555555555555',1,1,'situation_choice',
 'Ne pas confondre avec le vol (cas piège)','piege',1,
 $j${"scenario":"Karim prend le portefeuille de Sophie dans son sac à son insu.","context":"Soustraction sans aucune remise préalable.","characters":[{"name":"Karim","role":"Auteur"},{"name":"Sophie","role":"Victime"}],"keyFacts":["Aucune remise volontaire","Bien pris à l'insu"],"question":"S'agit-il d'un abus de confiance ?","options":["Oui","Non"]}$j$::jsonb,
 'published'),
('a1000000-0000-4000-8000-000000000003','55555555-5555-5555-5555-555555555555',1,2,'select_elements',
 'Isoler les éléments caractéristiques','intermediaire',1,
 $j${"instruction":"Sélectionnez les éléments qui caractérisent l'abus de confiance dans ce cas.","scenario":"Une entreprise confie un véhicule de service à un employé pour ses tournées. L'employé l'utilise pour faire le taxi le week-end à son profit.","options":[{"id":"o1","label":"Remise du bien pour un usage déterminé"},{"id":"o2","label":"Soustraction à l'insu du propriétaire"},{"id":"o3","label":"Détournement à des fins personnelles"},{"id":"o4","label":"Absence totale de remise"}]}$j$::jsonb,
 'published'),

-- Phase 2 — Compréhension
('c2000000-0000-4000-8000-000000000001','55555555-5555-5555-5555-555555555555',2,0,'ordering',
 'Reconstituer le raisonnement juridique','intermediaire',1,
 $j${"instruction":"Remettez les étapes du raisonnement dans le bon ordre.","items":[{"id":"i1","label":"Une remise volontaire préalable du bien"},{"id":"i2","label":"Un accord sur la destination du bien"},{"id":"i3","label":"Un détournement du bien"},{"id":"i4","label":"Un préjudice pour la victime"}]}$j$::jsonb,
 'published'),
('c2000000-0000-4000-8000-000000000002','55555555-5555-5555-5555-555555555555',2,1,'matching',
 'Associer les faits aux conditions légales','complexe',1,
 $j${"instruction":"Associez chaque fait à la condition de l'article qu'il remplit.","left":[{"id":"l1","label":"Aminata prête son ordinateur"},{"id":"l2","label":"Moussa le revend"}],"right":[{"id":"r1","label":"Remise volontaire préalable"},{"id":"r2","label":"Détournement"}]}$j$::jsonb,
 'published'),
('c2000000-0000-4000-8000-000000000003','55555555-5555-5555-5555-555555555555',2,2,'argued_answer',
 'Expliquer la distinction avec le vol','complexe',1,
 $j${"question":"En quoi l'abus de confiance se distingue-t-il du vol ? Rédigez une réponse argumentée.","hint":"Pensez à l'origine de la détention du bien."}$j$::jsonb,
 'published'),

-- Phase 3 — Mémorisation
('e3000000-0000-4000-8000-000000000001','55555555-5555-5555-5555-555555555555',3,0,'cloze',
 'Restituer le texte officiel exact','intermediaire',1,
 $j${"template":"L'abus de confiance est le fait par une personne de [BLANK_1], au préjudice d'autrui, des fonds, des valeurs ou un bien quelconque qui lui ont été [BLANK_2] et qu'elle a acceptés à charge de les [BLANK_3], de les représenter ou d'en faire un usage ou un emploi déterminé."}$j$::jsonb,
 'published')
on conflict (id) do nothing;

-- ---- Solutions + évaluation + feedback (SECRET) ----
insert into activity_solutions (activity_id, solution, evaluation, feedback) values
('d0000000-0000-4000-8000-000000000000', '{}'::jsonb, $j${"method":"acknowledge","pass_threshold":0}$j$::jsonb, '{}'::jsonb),

('a1000000-0000-4000-8000-000000000001', $j${"answer":"Oui"}$j$::jsonb, $j${"method":"exact","pass_threshold":1}$j$::jsonb,
 $j${"correct":"Exact. Le bien a été remis volontairement à charge de le rendre : la revente est un détournement.","incorrect":"Reprenez : il y a bien eu une remise volontaire préalable, puis un détournement."}$j$::jsonb),
('a1000000-0000-4000-8000-000000000002', $j${"answer":"Non"}$j$::jsonb, $j${"method":"exact","pass_threshold":1,"confusions":{"Oui":"vol"}}$j$::jsonb,
 $j${"correct":"Exact. Sans remise volontaire préalable, c'est un vol, pas un abus de confiance.","incorrect":"Attention à la confusion avec le VOL : ici il n'y a eu aucune remise volontaire."}$j$::jsonb),
('a1000000-0000-4000-8000-000000000003', $j${"correct":["o1","o3"]}$j$::jsonb, $j${"method":"set","pass_threshold":1}$j$::jsonb,
 $j${"correct":"Bien vu : remise pour un usage déterminé + détournement à des fins personnelles.","incorrect":"Les deux éléments clés sont la remise pour un usage déterminé et le détournement."}$j$::jsonb),

('c2000000-0000-4000-8000-000000000001', $j${"order":["i1","i2","i3","i4"]}$j$::jsonb, $j${"method":"order","pass_threshold":1}$j$::jsonb,
 $j${"correct":"Parfait, le raisonnement est reconstitué.","incorrect":"L'ordre logique part de la remise jusqu'au préjudice."}$j$::jsonb),
('c2000000-0000-4000-8000-000000000002', $j${"pairs":[["l1","r1"],["l2","r2"]]}$j$::jsonb, $j${"method":"matching","pass_threshold":1}$j$::jsonb,
 $j${"correct":"Exact : le prêt = remise volontaire ; la revente = détournement.","incorrect":"Reliez le prêt à la remise volontaire et la revente au détournement."}$j$::jsonb),
('c2000000-0000-4000-8000-000000000003', $j${"keywords":["remise volontaire","préalable","détournement","confiance"]}$j$::jsonb, $j${"method":"keywords","pass_threshold":0.5,"ai_assisted":true}$j$::jsonb,
 $j${"correct":"Votre réponse mobilise les bons concepts.","incorrect":"Mentionnez la remise volontaire préalable et le détournement — c'est ce qui distingue du vol."}$j$::jsonb),

('e3000000-0000-4000-8000-000000000001', $j${"blanks":["détourner","remis","rendre"]}$j$::jsonb, $j${"method":"cloze","pass_threshold":1}$j$::jsonb,
 $j${"correct":"Exactitude parfaite.","incorrect":"Les mots manquants sont : détourner, remis, rendre."}$j$::jsonb)
on conflict (activity_id) do nothing;

commit;
