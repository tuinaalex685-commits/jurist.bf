-- ============================================================================
-- 0007 — Index (composites, partiels, recherche floue). FK indexées.
-- ============================================================================

-- Catalogue
create index if not exists legal_codes_country_idx on legal_codes (country_id);
create index if not exists structure_nodes_code_idx on structure_nodes (code_id);
create index if not exists structure_nodes_parent_idx on structure_nodes (parent_id);
create index if not exists structure_nodes_path_gist on structure_nodes using gist (path);
create index if not exists articles_code_idx on articles (code_id);
create index if not exists articles_node_idx on articles (node_id);
create index if not exists article_versions_article_idx on article_versions (article_id);
-- Contenu servi = published uniquement (index partiel)
create index if not exists article_versions_published_idx
  on article_versions (article_id) where status = 'published';

-- Recherche ⌘K (numéro/titre + texte officiel)
create index if not exists articles_number_trgm on articles using gin (number gin_trgm_ops);
create index if not exists articles_title_trgm on articles using gin (title gin_trgm_ops);
create index if not exists article_versions_text_trgm
  on article_versions using gin (official_text gin_trgm_ops);

-- Contenu pédagogique par version
create index if not exists situations_version_idx on situations (article_version_id);
create index if not exists comprehension_version_idx on comprehension_blocks (article_version_id);
create index if not exists memorization_version_idx on memorization_items (article_version_id);
create index if not exists flashcards_version_idx on flashcards (article_version_id);
create index if not exists examqbank_version_idx on exam_questions_bank (article_version_id);

-- Progression / dashboard / biblio
create index if not exists uap_user_status_idx on user_article_progress (user_id, status);
create index if not exists seals_user_idx on seals (user_id, earned_at desc);
create index if not exists xp_ledger_user_idx on xp_ledger (user_id, created_at desc);

-- SRS — la séance du jour
create index if not exists srs_due_idx on srs_cards (user_id, due_at);

-- Examens
create index if not exists exam_sessions_user_idx on exam_sessions (user_id, started_at desc);
create index if not exists esq_session_idx on exam_session_questions (session_id);

-- Notifications
create index if not exists notifications_user_unread_idx
  on notifications (user_id, created_at desc) where read_at is null;

-- Accès
create index if not exists access_codes_unused_idx
  on access_codes (batch_id) where status = 'unused';
create index if not exists subscriptions_user_idx on subscriptions (user_id, status);

-- IA & analytics
create index if not exists ai_usage_created_idx on ai_usage (created_at);
create index if not exists ai_usage_user_idx on ai_usage (user_id, created_at);
create index if not exists ai_generations_version_idx on ai_generations (source_version_id);
create index if not exists analytics_events_name_idx on analytics_events (name, occurred_at);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id, created_at desc);

-- Jobs / file
create index if not exists jobs_type_idx on jobs (type, created_at desc);
