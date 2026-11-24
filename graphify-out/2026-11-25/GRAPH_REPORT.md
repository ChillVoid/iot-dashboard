# Graph Report - iot-dashboard  (2026-11-25)

## Corpus Check
- 279 files · ~198,011 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: (none) 7, .css 7, .cmd 4)

## Summary
- 2470 nodes · 7296 edges · 130 communities (108 shown, 22 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 303 edges (avg confidence: 0.88)
- Token cost: 307,490 input · 0 output

## Graph Freshness
- Built from commit: `67d21fb9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ScreenDevice
- evaluate_holdout.py
- normalize
- assistant.py
- create_app
- Dashboard UI Primitives
- Project Rules and Index
- api
- assistant_language.py
- Assistant Question Pipeline
- Project documentation index (canonical internal guide)
- normalize
- test_device_recovery.py
- run.py
- test_matrix_rules.py
- siteStyles.js
- App.jsx
- rehearse_event.py
- main.py
- npm run online:firmware launcher
- React.js and Tailwind UI conventions
- Question Review Pages
- Analytics.jsx
- QR Player Flow Docs
- Frontend Dependencies
- setup.mjs
- The web game screen (default game display)
- Assistant Training Datasets Doc
- experiment_history.py
- Settings
- asyncio
- Render Blueprint
- Cloudflare Quick Tunnel
- stack_moko_baby connected firmware (protocol v2)
- uuid
- NLP admission repair — 24 November 2026
- Analytics-v1 runtime and development AI system rules
- Offline Classifier Experiment
- Candidate MySQL Schema
- test_player_flow.py
- Device Command Tests
- Conservative review hold
- Architecture and Graphify Docs
- frontend/package.json
- NLP Grounding Research
- Vite and Tailwind Build
- Initial Database Migration
- Queue.jsx
- Cross-system quality audit (19 Nov 2026)
- Playwright Browser Tests
- Scanner.jsx
- Root Package Scripts
- numpy
- assistant_training.py
- Behavioral Expansion Corpus
- check_quality.py
- db-backup.py
- flows.spec.js
- Stack Moko Baby backend
- LiveHub
- Frontend Package Scripts
- answer
- Online Tunnel Launcher
- main.py
- api
- Firmware Transport Job
- dev.mjs
- Physical cabinet bring-up over a phone hotspot
- fetch_nlp_datasets.py
- Player Flow Migration
- Step 8: constrained AI analytics
- fastapi
- quality-checks.mjs
- Boot registration (POST /api/device/boot)
- Wokwi Wiring Diagram
- Context
- test_db_backup.py
- argparse
- Read-only command polling (GET /api/device/commands)
- analytics.py
- Firmware Game Engine
- Prettier Config
- test_nlp_lab.py
- event-check.py
- Backend Dependency Pins
- re
- Game and Firmware Steps
- Frontend HTML Entry
- test_quality_audit.py
- Repository Scaffold Step
- one
- evaluation_review.py
- test-setup.js
- text
- collections
- Persist-before-ACK reservation receipt
- Setting up Stack Moko Baby on a new laptop
- FakeSocket
- Self-test stages (panel chain, orientation, button, strip, audio)
- vite.config.js
- holdout_audit.py
- subprocess
- device.mjs
- NLP lab offline requirements
- Database backups and restore
- Stack Moko Baby — firmware
- GameScreen.jsx
- MemoryStore
- ui.jsx
- origin_allowed
- engine.js
- prepare_candidate_holdout.py
- SerialButton
- environment
- post
- summarize_offline_lab.py
- request_limits.py
- Wrong-topic answers and generic replies — 24 November 2026
- within_deadline
- routing
- .__call__
- fakeServer

## God Nodes (most connected - your core abstractions)
1. `create_app()` - 146 edges
2. `normalize()` - 100 edges
3. `execute()` - 98 edges
4. `one()` - 93 edges
5. `Context` - 72 edges
6. `Assistant` - 71 edges
7. `now()` - 69 edges
8. `api()` - 66 edges
9. `useApp()` - 61 edges
10. `Project documentation index (canonical internal guide)` - 47 edges

## Surprising Connections (you probably didn't know these)
- `Changes` --references--> `contextual_follow_up()`  [INFERRED]
  docs/nlp-admission-repair.md → backend/app/assistant.py
- `Changes` --references--> `project_words()`  [INFERRED]
  docs/nlp-admission-repair.md → backend/app/assistant_language.py
- `Changes` --references--> `topic_choices()`  [INFERRED]
  docs/nlp-admission-repair.md → backend/app/assistant_learning.py
- `Changes` --references--> `asks_live_state()`  [INFERRED]
  docs/nlp-topic-repair.md → backend/app/assistant.py
- `Changes` --references--> `composed_social()`  [INFERRED]
  docs/nlp-topic-repair.md → backend/app/assistant_interactions.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Complete bounded composition preserves mixed subjects and privacy guardrails** — docs_assistant_behavioral_expansion_structural_composed_greeting_failure_and_narrow_spelling_fix, docs_assistant_behavioral_expansion_bounded_full_utterance_social_composition_grammar, docs_assistant_behavioral_expansion_raw_identifier_checks_and_mixed_request_subject_guards, docs_assistant_behavioral_expansion_context_preserving_social_replies_with_honest_day_parts [EXTRACTED 1.00]
- **Backend and API evidence remains separate from broad release or hardware acceptance** — docs_assistant_behavioral_expansion_actual140_backend_and_disposable_api_checks, docs_assistant_behavioral_expansion_local_ollama_mixed_route_and_token_report_verification, docs_assistant_behavioral_expansion_behavioral_validation_excludes_visual_and_training_acceptance [EXTRACTED 1.00]
- **Measured synthetic corpus uses family splits and bounded runtime retrieval without weight training** — docs_assistant_behavioral_expansion_original_behavioral443_categories_and343100_split, docs_assistant_behavioral_expansion_measured_text_tokens18977_with_explicit_exclusions, docs_assistant_behavioral_expansion_qwen_tokenizer_provenance_and_checksum_report, docs_assistant_behavioral_expansion_family_splits_and_prior_evaluation_exclusion, docs_assistant_behavioral_expansion_behavioral_references_are_not_live_answers_or_whole_prompts, docs_assistant_behavioral_expansion_combined634_corpus_and_approval_context_invalidation [EXTRACTED 1.00]
- **Structural freshness and semantic refresh both require source and privacy checks** — docs_graphify_setup_graph_query_structural_update_and_semantic_refresh, docs_graphify_setup_watcher_and_optional_hooks_are_not_startup_services, docs_graphify_setup_privacy_exclusions_and_limits_of_graph_evidence [EXTRACTED 1.00]
- **Current typed semantics select the correct bounded score tool and evidence basis** — docs_nlp_grounding_research_schema_derived_domain_measure_and_operation_features, docs_nlp_grounding_research_current_explicit_measure_and_operation_precedence, docs_nlp_grounding_research_definitions_aggregates_and_individual_scores_are_distinct, docs_nlp_grounding_research_compatible_deduplicated_lexical_demonstrations, docs_nlp_grounding_research_get_player_scores_bounded_best_result_listing, docs_nlp_grounding_research_score_privacy_snapshot_and_no_ddl_context_extension [EXTRACTED 1.00]
- **Primary research motivates locally constrained serving adaptations rather than model guarantees** — docs_nlp_grounding_research_checklist_capability_testing_research_and_adaptation, docs_nlp_grounding_research_canard_typed_ellipsis_research_and_adaptation, docs_nlp_grounding_research_lex_validated_intent_slot_research_and_local_adaptation, docs_nlp_grounding_research_ollama_structured_output_research_versus_semantic_correctness, docs_nlp_grounding_research_google_rules_ml_infrastructure_evaluation_adaptation [EXTRACTED 1.00]
- **Settings relocation and targeted validation retain explicit acceptance limits** — docs_nlp_grounding_research_authenticated_settings_relocation_and_last_answer_review, docs_nlp_grounding_research_shared_administrator_session_settings_state, docs_nlp_grounding_research_actual184_backend_and_score_semantics_verification, docs_nlp_grounding_research_twelve_local_ollama_probes_and_bounded_inference_conclusions, docs_nlp_grounding_research_frontend27_build_and_headless_brave_verification_limits [EXTRACTED 1.00]
- **Future evaluation review isolates held-out cases and versions decisions without rewriting evidence** — docs_assistant_training_evaluation_review_later, docs_assistant_training_evaluation_actions, docs_assistant_training_evaluation_separation, docs_assistant_training_evaluation_blinding, docs_assistant_training_evaluation_history [EXTRACTED 1.00]
- **History experiment evidence remains consumed regression; latercandidateauthoring doesnotimply revieworaccuracy** — docs_nlp_evaluation_history_lab_20261120_history_report, docs_nlp_evaluation_history_lab_20261120_history_measured, docs_nlp_evaluation_history_lab_20261120_coverage_failure, docs_nlp_evaluation_history_lab_20261120_admission_bottleneck, docs_nlp_evaluation_history_lab_20261120_history_no_promotion, docs_nlp_evaluation_history_lab_20261120_final_pending [EXTRACTED 1.00]
- **Constrained interpretation with fresh server-owned facts** — docs_ai_system_rules_language_policy, docs_ai_system_rules_current_measure, docs_ai_system_rules_typed_memory_policy, docs_ai_system_rules_reviewed_example_policy, docs_ai_system_rules_read_only_tools, docs_ai_system_rules_factual_response_enforcement [EXTRACTED 1.00]
- **Boot-bound protocol v2 recovery flow** — docs_device_recovery_boot_registration, docs_device_recovery_journal_endpoint, docs_device_recovery_fence_command, docs_device_recovery_persistent_stop_tombstone, docs_device_recovery_operator_resolution, docs_esp32_online_nvs_journal [EXTRACTED 1.00]
- **Tailwind styling foundation** — docs_tailwind_ui_build_cascade, docs_tailwind_ui_semantic_tokens, docs_tailwind_ui_admin_dark_variant, frontend_src_styles_tailwind, frontend_src_components_ui [EXTRACTED 1.00]
- **V11 assistant language pipeline stages** — docs_nlp_routing_repair_privacy_before_projection, docs_nlp_routing_repair_public_lexical_projection, docs_nlp_routing_repair_deterministic_fast_path, docs_nlp_routing_repair_topical_scope_decision [EXTRACTED 1.00]
- **Matrix v1 ESP32 firmware dependencies** — agents_matrix_v1_device_decision, firmware_stack_moko_baby_libraries_adafruit_neopixel, firmware_stack_moko_baby_libraries_arduinojson [INFERRED 0.75]
- **Free tunnel online firmware pipeline** — docs_free_online_online_firmware_command, docs_free_online_quick_tunnel, docs_free_online_certificate_preparation, docs_free_online_merged_image, docs_hardware_bringup_online_device, docs_hardware_bringup_flash_device_script [INFERRED 0.85]
- **Stack Intelligence NLP evaluation and offline experimentation** — agents_evaluation_holdout_rule, readme_nlp_holdout_results, docs_readme_offline_classifier_comparison, docs_readme_history_ablation, backend_nlp_lab_requirements_setfit [INFERRED 0.85]
- **NLP evaluation freeze/consume/regression discipline** — docs_nlp_evaluation_holdout_v1_frozen_protocol, docs_nlp_evaluation_holdout_v1_consumption_ledger, backend_replay_consumed_holdout, docs_nlp_evaluation_candidate_v2_preparation_review_protocol, docs_nlp_routing_repair_v11_regression [INFERRED 0.85]
- **NVS journal preservation safeguards** — docs_hardware_bringup_flash_device_script, docs_free_online_merged_image, docs_esp32_online_nvs_journal, docs_device_recovery_storage_lineage [INFERRED 0.85]
- **Free HTTPS tunnel and phone-hotspot device operation path** — agents_free_hosting_decision, readme_online_firmware_launcher, agents_phone_hotspot_network_decision, readme_online_device, docs_readme_physical_cabinet_preparation [INFERRED 0.85]

## Communities (130 total, 22 thin omitted)

### Community 0 - "ScreenDevice"
Cohesion: 0.17
Nodes (3): DeviceError, ScreenDevice, uuid()

### Community 1 - "evaluate_holdout.py"
Cohesion: 0.14
Nodes (24): check(), evaluate(), ObservedAssistant, score(), build_rows(), evaluator_fingerprint(), freeze(), inventory() (+16 more)

### Community 2 - "normalize"
Cohesion: 0.11
Nodes (29): interpretation_choices(), normalize(), requested_metrics(), resolve_routing(), RoutingPlan, test_definition_and_ellipsis_are_distinct_from_a_new_data_subject(), test_directional_changes_select_the_requested_operation(), test_explicit_subject_is_invariant_to_old_history_and_wrong_model_label() (+21 more)

### Community 3 - "assistant.py"
Cohesion: 0.09
Nodes (26): asks_live_state(), continuation(), composed_social(), linguistic_text(), project_words(), routing_input(), compatible(), constraints() (+18 more)

### Community 4 - "create_app"
Cohesion: 0.09
Nodes (58): execute(), require_boot(), create_app(), add_operator(), admin_session(), admissions(), assistant_forget_memory(), assistant_memory() (+50 more)

### Community 5 - "Dashboard UI Primitives"
Cohesion: 0.08
Nodes (53): ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, CircuitBoard, Cpu (+45 more)

### Community 6 - "Project Rules and Index"
Cohesion: 0.07
Nodes (28): .claude/CLAUDE.md graphify skill pointer, graphify skill (/graphify trigger), AGENTS.md project instructions, Confirmed stack: React/JSX, Vite, Tailwind, FastAPI, XAMPP MariaDB 10.11.16, Free PC + XAMPP + HTTPS tunnel hosting decision, Frontend conventions (Tailwind v4 tw: prefix, Font Awesome webfonts, Open Sans Variable), html5-qrcode scanner rule, Matrix v1 device decision (16 columns, 15 levels, 1 point per level) (+20 more)

### Community 7 - "api"
Cohesion: 0.13
Nodes (25): AssistantTrainingReview(), choose(), exportApproved(), load(), remove(), review(), save(), submit() (+17 more)

### Community 8 - "assistant_language.py"
Cohesion: 0.08
Nodes (18): contextual_follow_up(), lexical_resource(), tagalog_language_words(), tagalog_words(), topic_choices(), test_choices_only_name_topics_that_the_question_mentions(), test_contextual_follow_up_needs_previous_context_and_no_new_subject(), test_every_topic_choice_routes_to_read_only_analytics_without_the_model() (+10 more)

### Community 9 - "Assistant Question Pipeline"
Cohesion: 0.13
Nodes (24): Assistant, Question, run(), test_new_social_turns_work_with_ollama_disabled_and_preserve_context(), scenario(), test_specific_reported_greeting_through_the_service_without_ollama(), scenario(), test_explicit_request_bypasses_a_busy_inference_gate() (+16 more)

### Community 10 - "Project documentation index (canonical internal guide)"
Cohesion: 0.12
Nodes (23): Device command delivery and review holds, Boot-bound device recovery, Stack Moko Baby step-by-step build plan, Current device/hosting milestone: Wokwi, Matrix v1 and free HTTPS tunnel (22 Nov 2026), Matrix v1 game (16 columns, 15 levels, max 15 points), Project documentation index (canonical internal guide), Documentation reading order, Verified remaining work (+15 more)

### Community 11 - "normalize"
Cohesion: 0.12
Nodes (23): compose(), endpoint(), Intent, empty_summary(), fixture_data(), test_empty_selection_keeps_rates_unavailable(), test_esp32_and_level_numbers_are_supported(), test_facts_are_rendered_from_supplied_metrics_and_cited() (+15 more)

### Community 12 - "test_device_recovery.py"
Cohesion: 0.25
Nodes (25): emulator_setup(), fence(), fence_receipt(), resolution(), setup(), start_event(), test_a_new_boot_invalidates_an_old_fence_and_changed_storage_blocks_never_started(), test_boot_lineage_retries_retirement_and_legacy_bypass() (+17 more)

### Community 13 - "run.py"
Cohesion: 0.26
Nodes (16): run(), text(), fit_temperature(), loss(), policy(), scaled(), evaluate_model(), finish_model() (+8 more)

### Community 14 - "test_matrix_rules.py"
Cohesion: 0.24
Nodes (13): replay(), rules_hash(), simulated_result(), seed_scores(), activate(), test_matrix_assignment_completion_analytics_and_private_leaderboard(), test_matrix_win_timeout_and_invalid_trace(), test_old_reserved_round_keeps_original_rules_after_activation() (+5 more)

### Community 15 - "siteStyles.js"
Cohesion: 0.08
Nodes (24): band, bandLabel, bandTitle, bandValue, box, boxText, boxTitle, button (+16 more)

### Community 16 - "App.jsx"
Cohesion: 0.15
Nodes (19): AdministratorsOnly(), AdminOnly(), App(), PlayerOnly(), About(), Entry(), ScanGate(), Reenter() (+11 more)

### Community 17 - "rehearse_event.py"
Cohesion: 0.22
Nodes (8): test_database(), main(), operator(), percentile(), phone(), Recorder, start_tunnel(), wait_ready()

### Community 18 - "main.py"
Cohesion: 0.11
Nodes (27): acknowledge(), CommandAcknowledgement, hold_for_review(), RecoveryReason, RecoveryResolution, current_boot(), journal(), quarantine() (+19 more)

### Community 19 - "npm run online:firmware launcher"
Cohesion: 0.25
Nodes (9): start-online-preview.ps1 manual tunnel preview, ESP32 core 4.0.0 TLS watchdog reboot, ESP32 core 2.0.17 compatibility build, Merged Wokwi firmware image, npm run online:firmware launcher, Wokwi public IoT gateway connection blocker, npm run device:flash re-upload, flash-device.py NVS-guarded flasher (+1 more)

### Community 20 - "React.js and Tailwind UI conventions"
Cohesion: 0.07
Nodes (17): Dashboard visual contract with Tailwind integration, Step 6: reference-matched web views, Player QR scanner, React.js and Tailwind UI conventions, Selector-controlled dark variant (html[data-admin-theme='dark']), Tailwind 4.3.5 Vite plugin build and layer cascade (tw prefix, no Preflight), Semantic color tokens via @theme inline (ink, muted, note, surface, canvas, line, danger), Access flow contrast mobile and verification refinement passes (+9 more)

### Community 21 - "Question Review Pages"
Cohesion: 0.14
Nodes (18): freshTarget(), kinds, topics, actions, Correction(), changeTopic(), subtypesFor(), decisions (+10 more)

### Community 22 - "Analytics.jsx"
Cohesion: 0.12
Nodes (29): ActivityChart(), axis, ChartTip(), LevelChart(), OutcomesChart(), ScoreChart(), ArrowRight, ChevronRight (+21 more)

### Community 23 - "QR Player Flow Docs"
Cohesion: 0.15
Nodes (17): Authenticated synthetic-tested device integration boundary, Completed-round-only source-matched player leaderboard, Current QR player flow and administrator access, Durable win loss alerts with focus-refresh polling, Explicit Queue-page simulator action sequence, Owner-only persistent ticket across refreshes, Preserved Sourcio-derived player styling and font symbols, Private cabinetState and queueState waiting reasons (+9 more)

### Community 24 - "Frontend Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @fontsource-variable/open-sans@5.3.0, @fortawesome/fontawesome-free@7.3.1, html5-qrcode@2.3.8, qr-scanner@1.4.2, qrcode.react@4.2.0, @radix-ui/react-tooltip@1.4.1, react@19.3.1 (+9 more)

### Community 25 - "setup.mjs"
Cohesion: 0.14
Nodes (31): arduino(), args, backendVenv(), check, checkNode(), cloudflared(), database(), ensureMysql() (+23 more)

### Community 26 - "The web game screen (default game display)"
Cohesion: 0.18
Nodes (11): Button wiring, Code map, Fallbacks and fixes, How a round works, Look and effects (design v2, 25 November), Roles, Setup, Switching back to the LED cabinet (+3 more)

### Community 27 - "Assistant Training Datasets Doc"
Cohesion: 0.07
Nodes (26): Optimistic revision current public context confirmation and409staleapproval, 1000recordsperowner25perpage bounded parameterized statement-deadline queries, Future evaluation UI confirm correct reject versioneddecisions navigation progressfilters, Predictions hidden during pre-evaluation label review, Future evaluation UI question proposedlabel typedprior expectedstate explanations notes, Post-consumption corrections preserve originalresult new annotationversion, No player identities private chats or credentials in future review UI, Planned21November dedicated admin evaluationcase review page not implemented (+18 more)

### Community 28 - "experiment_history.py"
Cohesion: 0.15
Nodes (3): DenseModel, Heads, SparseModel

### Community 29 - "Settings"
Cohesion: 0.23
Nodes (9): Settings, serve(), cloud_env(), test_cloud_origin_and_private_database_without_xampp_paths(), test_production_rejects_insecure_cookies(), test_production_rejects_insecure_or_non_origin_public_urls(), backup_module(), main() (+1 more)

### Community 30 - "asyncio"
Cohesion: 0.33
Nodes (8): manifest(), prepare(), sha(), code_hashes(), freeze(), protected(), audit(), open_run()

### Community 31 - "Render Blueprint"
Cohesion: 0.08
Nodes (24): mountPath, name, sizeGB, fromService, generateValue, key, sync, value (+16 more)

### Community 32 - "Cloudflare Quick Tunnel"
Cohesion: 0.33
Nodes (6): Prepare and run locally, Wokwi connection choices, install-cloudflared.py verified installer, Cloudflare Quick Tunnel, Phone hotspot to ESP32 to HTTPS tunnel topology, Phone/network deployment

### Community 33 - "stack_moko_baby connected firmware (protocol v2)"
Cohesion: 0.25
Nodes (7): Device journal events (POST /api/device/journal), Journal phases (reserved, started, terminal, fenced_unstarted, fenced_interrupted), Conflict quarantine, stack_moko_baby connected firmware (protocol v2), ESP32 cabinet wiring (GPIO18 matrix, GPIO27 button, GPIO25 strip, GPIO17 DFPlayer), Public Wokwi source bundle (package-wokwi.py), Verified root certificate preparation

### Community 34 - "uuid"
Cohesion: 0.23
Nodes (12): matrix(), pair(), screen(), test_only_an_administrator_pairs_and_the_old_token_stops_working(), test_screen_plays_a_ranked_round_and_pairing_waits_for_it(), test_switching_back_to_the_led_cabinet_restores_its_configured_token(), uid(), add_operator() (+4 more)

### Community 35 - "NLP admission repair — 24 November 2026"
Cohesion: 0.25
Nodes (8): Changes, Consumed 325-case replay (regression only), Human-confirmed v2 replay (regression only), Measured results (development data only), NLP admission repair — 24 November 2026, Problem, Still open, Verification

### Community 36 - "Analytics-v1 runtime and development AI system rules"
Cohesion: 0.07
Nodes (23): Stack Intelligence local administrator analytics guide, Explicit owner-reviewed current-version routing examples, Dashboard Settings houses model memory and training controls, Analytics-v1 runtime and development AI system rules, Explicit current measures override history and contradictory model labels, Matrix-aware analytics and cloud AI disabled, Student identity raw questions and private values excluded from model context, Eight bounded allowlisted read-only analytics operations (+15 more)

### Community 37 - "Offline Classifier Experiment"
Cohesion: 0.03
Nodes (65): Admin question review (/admin/question-review, migration 006), Candidate evaluation collection v2 (325 AI-authored questions), Holdout v2 AI-reviewed first use: 130/325, Lexical overlap audit (Jaccard >= .70 and char similarity >= .84), Declared language/semantic families per intent, 40of120supported blocked upstream;84of130admitted31unknown14scope1measurement, 285originaltraining plus792historyvariants1077rows zero new independent questions, Synthetic variants add no missing subtypes language diversity or independent families (+57 more)

### Community 38 - "Candidate MySQL Schema"
Cohesion: 0.25
Nodes (18): ai_admin_memory, ai_requests, ai_training_examples, audit_logs, auth_sessions, device_commands, device_events, events (+10 more)

### Community 39 - "test_player_flow.py"
Cohesion: 0.14
Nodes (22): compose_all(), summary(), test_absent_device_results_are_not_inferred_from_registrations(), test_all_sources_are_separate_and_players_are_deduplicated(), load_script(), test_dry_run_is_the_default(), test_older_backup_selection_only_picks_earlier_backups(), test_purge_removes_only_due_ids_then_all_keeping_players_and_tickets() (+14 more)

### Community 40 - "Device Command Tests"
Cohesion: 0.24
Nodes (13): command_row(), reserve(), test_emulator_refuses_corrupt_journal_before_contacting_device(), test_expired_unknown_start_never_becomes_an_automatic_no_show(), test_invalid_or_stale_receipts_cannot_change_the_command(), test_other_machine_commands_and_maintenance_cannot_be_bypassed(), test_polling_is_authorized_repeatable_and_contains_no_player_identity(), test_receipt_survives_application_recreation_and_emulator_lost_ack() (+5 more)

### Community 41 - "Conservative review hold"
Cohesion: 0.29
Nodes (6): Flag round for review (admin review endpoint), Machine page command diagnostics, Operator recovery workflow (stop, release, void, recover result), Scan-register-assign-play-result flow, First real round and resilience gates, Accessibility and full event rehearsal

### Community 42 - "Architecture and Graphify Docs"
Cohesion: 0.10
Nodes (9): Local Graphify setup and freshness guide, Stack Moko Baby technology and ownership architecture, Authenticated revision-only invalidation and coherent REST snapshots, Tailwind 4.3.5 semantic utilities Open Sans and Font Awesome webfonts, Bundled public lexicon then projection topical scope and intent routing, Active free PC HTTPS origin with private local database and Ollama, Matrix ownership, active free HTTPS and inactive Render topology, Quality hardening and local recovery/load/restore evidence (+1 more)

### Community 43 - "frontend/package.json"
Cohesion: 0.18
Nodes (10): @radix-ui/react-dialog@1.3.1, @radix-ui/react-dropdown-menu@2.2.1, engines, node, name, private, type, version (+2 more)

### Community 45 - "Vite and Tailwind Build"
Cohesion: 0.20
Nodes (10): devDependencies, jsdom@31.0.1, prettier@3.10.1, tailwindcss@4.3.5, @testing-library/react@16.3.3, @testing-library/user-event@14.6.10, vitest@5.1.0, jsdom (+2 more)

### Community 46 - "Initial Database Migration"
Cohesion: 0.28
Nodes (16): ai_requests, audit_logs, auth_sessions, device_commands, device_events, events, game_sessions, machines (+8 more)

### Community 47 - "Queue.jsx"
Cohesion: 0.20
Nodes (29): actions, DeviceRecovery(), GameScreenPairing(), Pause, Play, QrCode, UserRoundX, UsersRound (+21 more)

### Community 48 - "Cross-system quality audit (19 Nov 2026)"
Cohesion: 0.06
Nodes (21): Classic v1 ruleset (preserved), Matrix v1 ruleset, 006_matrix_rules.sql migration, Selected Matrix v1 supersedes Classic-only proposals, Stack Moko Baby — functional specification, Pending physical, identity and network release decisions, Step 7: durable live updates, Step 9: event readiness and release rehearsal (+13 more)

### Community 49 - "Playwright Browser Tests"
Cohesion: 0.09
Nodes (9): sizes, @playwright/test@1.65.1, directory, errors, height, results, routes, width (+1 more)

### Community 50 - "Scanner.jsx"
Cohesion: 0.08
Nodes (37): chatContext(), ChatWidget(), dismissNudge(), openChat(), remember(), seen(), mocks, show() (+29 more)

### Community 51 - "Root Package Scripts"
Cohesion: 0.09
Nodes (22): engines, node, name, private, scripts, db:backup, db:purge-ids, db:verify (+14 more)

### Community 52 - "numpy"
Cohesion: 0.20
Nodes (5): canonical(), main(), plot(), main(), measured()

### Community 53 - "assistant_training.py"
Cohesion: 0.10
Nodes (21): _seed_examples(), Proposal, Review, TrainingInput, TrainingTarget, test_every_training_example_passes_the_current_schema_and_guard(), test_ambiguous_query_does_not_query_live_data_until_choice(), ready() (+13 more)

### Community 55 - "check_quality.py"
Cohesion: 0.15
Nodes (11): make_engine(), main(), start_api(), percentile(), executable(), main(), wait_for(), migrate() (+3 more)

### Community 56 - "db-backup.py"
Cohesion: 0.21
Nodes (19): api_running(), app_login(), backup_dir(), backup_key(), client_args(), client_env(), env_values(), latest() (+11 more)

### Community 57 - "flows.spec.js"
Cohesion: 0.29
Nodes (3): errors, @axe-core/playwright@4.14.0, @axe-core/playwright

### Community 58 - "Stack Moko Baby backend"
Cohesion: 0.07
Nodes (19): Applied typed-memory and reviewed-example migrations, Matrix rules and active free same-origin HTTPS backend, Stack Moko Baby backend, Private player journey, live channels and phone HTTPS, ESP32, Wokwi and online operation, Firmware files and wiring, Journal and operational limits, Keeping XAMPP and local Ollama online (+11 more)

### Community 59 - "LiveHub"
Cohesion: 0.25
Nodes (5): LiveHub, test_outbox_is_atomic_and_recovers_after_dispatcher_restart(), restart(), test_slow_clients_coalesce_and_connection_caps_are_bounded(), check()

### Community 60 - "Frontend Package Scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:backup, db:verify, dev, dev:frontend, device:bridge, device:flash (+9 more)

### Community 61 - "answer"
Cohesion: 0.20
Nodes (13): answer(), classify(), is_tagalog(), line_sentence(), minutes(), stage(), facts(), mine_score() (+5 more)

### Community 62 - "Online Tunnel Launcher"
Cohesion: 0.21
Nodes (15): backend, backupMinutes, backupNow(), children, completed(), ensureMysql(), main(), mysqld (+7 more)

### Community 63 - "main.py"
Cohesion: 0.09
Nodes (17): APIInput, BootRegistration, JournalEvent, Placement, Result, Admissions, Entry, Heartbeat (+9 more)

### Community 64 - "api"
Cohesion: 0.08
Nodes (30): AdminAssistant(), send(), submit(), answerLabels, Evidence(), suggestions, mocks, openChat() (+22 more)

### Community 65 - "Firmware Transport Job"
Cohesion: 0.20
Nodes (7): RequestJob, body, boot, kind, path, response, status

### Community 66 - "dev.mjs"
Cohesion: 0.21
Nodes (10): backend, backendOnly, frontend, health(), main(), owned, portInUse(), root (+2 more)

### Community 67 - "Physical cabinet bring-up over a phone hotspot"
Cohesion: 0.29
Nodes (7): 1. Prepare the hotspot phone, 2. Wiring self-test (do this as soon as the wiring is finished), 3. Flash the game firmware for the hotspot, 4. Connection gates (watch the serial monitor and the Machines page), 5. First real round, Physical cabinet bring-up over a phone hotspot, Tools added for the physical board

### Community 68 - "fetch_nlp_datasets.py"
Cohesion: 0.43
Nodes (3): main(), fetch(), main()

### Community 69 - "Player Flow Migration"
Cohesion: 0.12
Nodes (11): entry_grants, login_attempts, player_notifications, qr_links, ai_admin_memory, ai_training_examples, device_boots, device_journal_events (+3 more)

### Community 70 - "Step 8: constrained AI analytics"
Cohesion: 0.22
Nodes (8): Private per-admin typed memory (migration 003, ai_admin_memory), Reviewed AI training examples (migration 004, ai_training_examples), Stack Intelligence bottom chat (admin shell), Step 0: resolve physical and operational constraints, Step 3: database, identity and staff authentication, Step 4: queue and transactional session assignment, Step 8: constrained AI analytics, Step status and remaining gates table (steps 0-9)

### Community 71 - "fastapi"
Cohesion: 0.31
Nodes (3): mount_frontend(), test_missing_production_build_fails_at_startup(), test_production_spa_preserves_api_and_private_file_boundaries()

### Community 73 - "Boot registration (POST /api/device/boot)"
Cohesion: 0.33
Nodes (7): Boot registration (POST /api/device/boot), ESP-IDF esp_timer restarts after deep sleep, 005_device_recovery.sql migration, Storage lineage (storageId epoch), Enrollment bootstrap (GET /api/device/enrollment), Connection gates (Wi-Fi, time, registration, heartbeat, ready), Hotspot preparation (2.4 GHz, ASCII name, WPA2)

### Community 74 - "Wokwi Wiring Diagram"
Cohesion: 0.29
Nodes (6): author, connections, dependencies, editor, parts, version

### Community 75 - "Context"
Cohesion: 0.08
Nodes (20): inspect(), automatic_scope(), basic_response(), Context, knowledge_response(), MemoryPreferences, model_json(), preference_reply() (+12 more)

### Community 77 - "argparse"
Cohesion: 0.13
Nodes (7): main(), private_lan(), wifi_problem(), main(), flash_helpers(), main(), send()

### Community 78 - "Read-only command polling (GET /api/device/commands)"
Cohesion: 0.33
Nodes (5): Read-only command polling (GET /api/device/commands), X-Device-Token cabinet authentication, RFC 9110 safe and idempotent methods, ESP-IDF NVS flash commit semantics, Boot-targeted fence command

### Community 79 - "analytics.py"
Cohesion: 0.18
Nodes (11): clean(), collect(), collect_all(), _collect_snapshot(), _operations(), select(), stamp(), cabinet_state() (+3 more)

### Community 80 - "Firmware Game Engine"
Cohesion: 0.47
Nodes (3): press(), timeout(), x()

### Community 81 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 82 - "test_nlp_lab.py"
Cohesion: 0.14
Nodes (18): balanced_cases(), partitions(), find(), union(), prepare(), sources(), frame(), Frame (+10 more)

### Community 83 - "event-check.py"
Cohesion: 0.40
Nodes (8): checks(), fix_power(), main(), on_charger(), pending_restart(), port_open(), power_value(), run()

### Community 84 - "Backend Dependency Pins"
Cohesion: 0.67
Nodes (3): Pinned Argon2 and cryptography security dependencies, Pinned backend dependency manifest, Pinned FastAPI SQLAlchemy PyMySQL Uvicorn runtime

### Community 85 - "re"
Cohesion: 0.09
Nodes (23): conversational_reply(), parse(), greeting_answer(), interaction_rows(), interaction_social(), interaction_text(), interaction_words(), social_phrases() (+15 more)

### Community 89 - "test_quality_audit.py"
Cohesion: 0.15
Nodes (6): test_ai_machine_readiness_agrees_with_dashboard_when_cabinet_is_unavailable(), test_chunked_body_limit_cannot_be_bypassed_without_content_length(), test_fresh_disabled_simulator_cannot_accept_a_new_assignment(), test_malformed_login_text_or_unknown_fields_fail_without_server_errors(), test_readiness_requires_applied_migrations_and_schema(), test_unknown_subject_cannot_be_replaced_with_event_data()

### Community 96 - "one"
Cohesion: 0.17
Nodes (23): all_rows(), one(), poll_commands(), requires_review(), active_rules(), stored_rules(), purge(), active() (+15 more)

### Community 98 - "evaluation_review.py"
Cohesion: 0.24
Nodes (6): Annotation, CaseReview, packet(), proposed(), read_reviews(), save_review()

### Community 100 - "text"
Cohesion: 0.25
Nodes (8): question_only(), QuestionOnly, training_variants(), test_augmentation_cannot_ingest_calibration_comparison_or_blocked_rows(), test_existing_contextual_examples_are_never_relabelled_or_given_wrong_subject(), test_history_variants_keep_original_question_target_and_family(), test_question_only_features_do_not_change_with_any_validated_prior_subject(), training_row()

### Community 101 - "collections"
Cohesion: 0.29
Nodes (3): build(), wording(), measure()

### Community 102 - "Persist-before-ACK reservation receipt"
Cohesion: 0.40
Nodes (4): device_emulator.py file-journal emulator, MariaDB FOR UPDATE row locks, Receipt-required session start, recovery_emulator.py protocol-v2 emulator

### Community 103 - "Setting up Stack Moko Baby on a new laptop"
Cohesion: 0.22
Nodes (9): 1. Install the programs (once per laptop), 2. What `npm run setup` does, 3. Run it, For coding agents, Game screen laptop, Setting up Stack Moko Baby on a new laptop, TL;DR, Troubleshooting (+1 more)

### Community 106 - "Self-test stages (panel chain, orientation, button, strip, audio)"
Cohesion: 0.50
Nodes (4): DFPlayer audio cues, npm run device:selftest wiring self-test, pixel() matrix mapping, Self-test stages (panel chain, orientation, button, strip, audio)

### Community 107 - "vite.config.js"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@4.3.5, vite@8.3.8, @vitejs/plugin-react@6.3.0, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 108 - "holdout_audit.py"
Cohesion: 0.10
Nodes (20): constrained_route(), intent_payload(), corpus_digest(), retrieve(), seed_examples(), semantic_features(), signature(), canonical() (+12 more)

### Community 109 - "subprocess"
Cohesion: 0.12
Nodes (11): arduino_cli(), check_layout(), detect_port(), esptool_names(), main(), partitions(), main(), esptool_names() (+3 more)

### Community 110 - "device.mjs"
Cohesion: 0.29
Nodes (4): child, python, root, subcommand

### Community 111 - "NLP lab offline requirements"
Cohesion: 0.28
Nodes (9): NLP lab offline requirements, datasets 3.6.0, scikit-learn 1.9.1, sentence-transformers 3.4.1, setfit 1.1.3, torch 2.9.1 (CPU), transformers 4.57.6, Follow-on history ablation (792 training-only variants) (+1 more)

### Community 112 - "Database backups and restore"
Cohesion: 0.29
Nodes (7): Commands, Database backups and restore, Deleting student IDs after the event, Keys and privacy, Verification record (24 November 2026), What runs automatically, Where and how backups are stored

### Community 113 - "Stack Moko Baby — firmware"
Cohesion: 0.33
Nodes (6): Behaviour worth knowing, Building and flashing, Files, Pins, Stack Moko Baby — firmware, Status

### Community 114 - "GameScreen.jsx"
Cohesion: 0.12
Nodes (30): COLORS, Deadline(), drawBoard(), GameScreen(), connectButton(), fullScreen(), toggleKeyboard(), toggleSound() (+22 more)

### Community 116 - "ui.jsx"
Cohesion: 0.17
Nodes (20): Check, Download, Search, X, PlayerList(), Shell(), tabs, Avatar() (+12 more)

### Community 117 - "origin_allowed"
Cohesion: 0.40
Nodes (4): boundaries(), entry(), canonical_origin(), origin_allowed()

### Community 118 - "engine.js"
Cohesion: 0.17
Nodes (17): FIRMWARE, loadSaved(), sameRules(), STORAGE_KEY, COUNTDOWN_MS, COUNTDOWN_STEP_MS, createRound(), MATRIX_RULES (+9 more)

### Community 119 - "prepare_candidate_holdout.py"
Cohesion: 0.21
Nodes (11): reference_questions(), text_key(), audit(), build(), followup(), main(), references(), test_candidate_internal_duplicates_are_flagged_without_predictions() (+3 more)

### Community 120 - "SerialButton"
Cohesion: 0.21
Nodes (5): BAUD_RATE, ClockMap, parseLine(), SerialButton, serialSupported()

### Community 121 - "environment"
Cohesion: 0.23
Nodes (7): test_review_round_trip_access_and_versioning(), environment(), find(), reentry_token(), test_lost_ticket_is_restored_once_and_old_device_is_signed_out(), test_only_the_newest_code_works_and_expired_codes_fail(), test_reentry_requires_an_admin_and_csrf_and_rejects_bad_tokens()

### Community 122 - "post"
Cohesion: 0.29
Nodes (9): revision(), test_global_revisions_and_idempotent_operations(), test_live_rejects_missing_or_foreign_origin(), test_live_requires_the_right_authenticated_role(), test_logout_revokes_existing_socket_and_commands_are_rejected(), test_player_notifications_are_safe_and_staff_channel_is_private(), test_snapshot_revision_and_rows_share_a_consistent_database_view(), commit_during_read() (+1 more)

### Community 123 - "summarize_offline_lab.py"
Cohesion: 0.39
Nodes (4): publish(), metrics(), primary(), publish()

### Community 125 - "Wrong-topic answers and generic replies — 24 November 2026"
Cohesion: 0.40
Nodes (5): Measured results, Problem, Still open, Verification, Wrong-topic answers and generic replies — 24 November 2026

### Community 126 - "within_deadline"
Cohesion: 0.50
Nodes (3): assistant_query(), within_deadline(), request()

## Knowledge Gaps
- **416 isolated node(s):** `tabs`, `COLORS`, `iconProps`, `app`, `base` (+411 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 802 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Assistant` connect `Assistant Question Pipeline` to `one`, `Context`, `normalize`, `MemoryStore`, `assistant_training.py`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `create_app()` (e.g. with `Question` and `Proposal`) actually correct?**
  _`create_app()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `tabs`, `COLORS`, `iconProps` to the rest of the system?**
  _416 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `evaluate_holdout.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14082503556187767 - nodes in this community are weakly interconnected._
- **Why does `normalize()` connect `normalize` to `assistant_language.py`, `assistant.py`, `re`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Should `normalize` be split into smaller, more focused modules?**
  _Cohesion score 0.113107822410148 - nodes in this community are weakly interconnected._
- **Should `assistant.py` be split into smaller, more focused modules?**
  _Cohesion score 0.09468599033816426 - nodes in this community are weakly interconnected._