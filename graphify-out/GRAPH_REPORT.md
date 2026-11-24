# Graph Report - iot-dashboard  (2026-11-25)

## Corpus Check
- 281 files · ~201,053 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: (none) 7, .css 7, .cmd 4)

## Summary
- 2482 nodes · 7306 edges · 114 communities (93 shown, 21 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 296 edges (avg confidence: 0.88)
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
- icons.jsx
- Project Rules and Index
- api
- assistant_language.py
- Assistant Question Pipeline
- Project documentation index (canonical internal guide)
- Cross-system quality audit (19 Nov 2026)
- build_language_lexicon.py
- run.py
- pytest
- Analytics-v1 runtime and development AI system rules
- App.jsx
- rehearse_event.py
- main.py
- npm run online:firmware launcher
- React.js and Tailwind UI conventions
- test_assistant_continuation.py
- demo.js
- QR Player Flow Docs
- Frontend Dependencies
- setup.mjs
- The web game screen (default game display)
- Assistant Training Datasets Doc
- prepare-online-firmware.py
- Settings
- set-device-url.py
- Render Blueprint
- stack_moko_baby connected firmware (protocol v2)
- uuid
- NLP admission repair — 24 November 2026
- Stack Intelligence local administrator analytics guide
- Offline Classifier Experiment
- Candidate MySQL Schema
- test_player_flow.py
- Device Command Tests
- Architecture and Graphify Docs
- NLP Grounding Research
- Vite and Tailwind Build
- Initial Database Migration
- ui.jsx
- Cross-system quality audit (19 Nov 2026)
- Playwright Browser Tests
- Scanner.jsx
- Root Package Scripts
- json
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
- Player Flow Migration
- Step 8: constrained AI analytics
- fastapi
- quality-checks.mjs
- Wokwi Wiring Diagram
- Context
- test_db_backup.py
- argparse
- Firmware Game Engine
- Prettier Config
- test_nlp_lab.py
- event-check.py
- Backend Dependency Pins
- re
- Game and Firmware Steps
- Frontend HTML Entry
- Repository Scaffold Step
- test-setup.js
- text
- hashlib
- Setting up Stack Moko Baby on a new laptop
- FakeSocket
- assistant_training.py
- subprocess
- device.mjs
- NLP lab offline requirements
- Database backups and restore
- Stack Moko Baby — firmware
- GameScreen.jsx
- os
- useApp
- engine.js
- prepare_candidate_holdout.py
- SerialButton
- request_limits.py
- Wrong-topic answers and generic replies — 24 November 2026
- within_deadline
- routing

## God Nodes (most connected - your core abstractions)
1. `create_app()` - 139 edges
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
- `Changes` --references--> `project_words()`  [INFERRED]
  docs/nlp-topic-repair.md → backend/app/assistant_language.py
- `Changes` --references--> `contextual_follow_up()`  [INFERRED]
  docs/nlp-admission-repair.md → backend/app/assistant.py
- `Changes` --references--> `project_words()`  [INFERRED]
  docs/nlp-admission-repair.md → backend/app/assistant_language.py
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

## Communities (114 total, 21 thin omitted)

### Community 0 - "ScreenDevice"
Cohesion: 0.17
Nodes (3): DeviceError, ScreenDevice, uuid()

### Community 1 - "evaluate_holdout.py"
Cohesion: 0.12
Nodes (28): check(), evaluate(), ObservedAssistant, score(), route_label(), build_rows(), evaluator_fingerprint(), freeze() (+20 more)

### Community 2 - "normalize"
Cohesion: 0.08
Nodes (48): compose(), endpoint(), interpretation_choices(), normalize(), requested_metrics(), resolve_routing(), RoutingPlan, empty_summary() (+40 more)

### Community 3 - "assistant.py"
Cohesion: 0.11
Nodes (27): asks_live_state(), automatic_scope(), constrained_route(), contextual_follow_up(), intent_payload(), composed_social(), linguistic_text(), MemoryPreferences (+19 more)

### Community 4 - "create_app"
Cohesion: 0.08
Nodes (85): all_rows(), execute(), one(), poll_commands(), requires_review(), require_boot(), read_reviews(), active_rules() (+77 more)

### Community 5 - "icons.jsx"
Cohesion: 0.09
Nodes (31): ArrowLeft, CalendarDays, CheckCircle2, CircuitBoard, Cpu, Gamepad2, glyphs, HardDrive (+23 more)

### Community 6 - "Project Rules and Index"
Cohesion: 0.07
Nodes (28): .claude/CLAUDE.md graphify skill pointer, graphify skill (/graphify trigger), AGENTS.md project instructions, Confirmed stack: React/JSX, Vite, Tailwind, FastAPI, XAMPP MariaDB 10.11.16, Free PC + XAMPP + HTTPS tunnel hosting decision, Frontend conventions (Tailwind v4 tw: prefix, Font Awesome webfonts, Open Sans Variable), html5-qrcode scanner rule, Matrix v1 device decision (16 columns, 15 levels, 1 point per level) (+20 more)

### Community 7 - "api"
Cohesion: 0.09
Nodes (35): AssistantTrainingReview(), choose(), exportApproved(), load(), remove(), review(), save(), freshTarget() (+27 more)

### Community 8 - "assistant_language.py"
Cohesion: 0.11
Nodes (12): lexical_resource(), test_choices_only_name_topics_that_the_question_mentions(), test_contextual_follow_up_needs_previous_context_and_no_new_subject(), test_every_topic_choice_routes_to_read_only_analytics_without_the_model(), test_everyday_wording_is_no_longer_unknown(), test_lexicon_v2_keeps_everyday_words_and_still_excludes_names(), test_possible_names_stay_unknown(), test_unknown_name_gets_one_tap_choices_but_no_answer() (+4 more)

### Community 9 - "Assistant Question Pipeline"
Cohesion: 0.11
Nodes (26): Assistant, Question, run(), test_new_social_turns_work_with_ollama_disabled_and_preserve_context(), scenario(), test_specific_reported_greeting_through_the_service_without_ollama(), scenario(), test_explicit_request_bypasses_a_busy_inference_gate() (+18 more)

### Community 10 - "Project documentation index (canonical internal guide)"
Cohesion: 0.12
Nodes (23): Device command delivery and review holds, Boot-bound device recovery, Stack Moko Baby step-by-step build plan, Current device/hosting milestone: Wokwi, Matrix v1 and free HTTPS tunnel (22 Nov 2026), Matrix v1 game (16 columns, 15 levels, max 15 points), Project documentation index (canonical internal guide), Documentation reading order, Verified remaining work (+15 more)

### Community 11 - "Cross-system quality audit (19 Nov 2026)"
Cohesion: 0.08
Nodes (13): Step 7: durable live updates, Step 9: event readiness and release rehearsal, Local React and backend setup, Player QR scanner, Cross-system quality audit (19 Nov 2026), 23 confirmed defects fixed (CSRF, origin, identity switching, QR, readiness, NLP scope), Audit coverage ledger, CSRF and configured-origin trust hardening (+5 more)

### Community 12 - "build_language_lexicon.py"
Cohesion: 0.20
Nodes (6): build(), build_v2(), digest(), Links, word_form(), wordnet_rows()

### Community 13 - "run.py"
Cohesion: 0.11
Nodes (27): manifest(), prepare(), run(), sha(), text(), DenseModel, fit_temperature(), loss() (+19 more)

### Community 14 - "pytest"
Cohesion: 0.07
Nodes (29): clean(), collect(), collect_all(), _collect_snapshot(), _operations(), select(), stamp(), replay() (+21 more)

### Community 15 - "Analytics-v1 runtime and development AI system rules"
Cohesion: 0.19
Nodes (5): Analytics-v1 runtime and development AI system rules, Explicit current measures override history and contradictory model labels, Matrix-aware analytics and cloud AI disabled, Student identity raw questions and private values excluded from model context, Eight bounded allowlisted read-only analytics operations

### Community 16 - "App.jsx"
Cohesion: 0.14
Nodes (35): AdministratorsOnly(), App(), PlayerOnly(), ArrowUpRight, ChevronLeft, ChevronRight, Download, Eye (+27 more)

### Community 17 - "rehearse_event.py"
Cohesion: 0.22
Nodes (8): test_database(), main(), operator(), percentile(), phone(), Recorder, start_tunnel(), wait_ready()

### Community 18 - "main.py"
Cohesion: 0.12
Nodes (23): acknowledge(), CommandAcknowledgement, hold_for_review(), current_boot(), journal(), quarantine(), recovery_view(), register_boot() (+15 more)

### Community 19 - "npm run online:firmware launcher"
Cohesion: 0.12
Nodes (16): Firmware NVS journal snapshot and delivery high-water mark, Prepare and run locally, start-online-preview.ps1 manual tunnel preview, ESP32 core 4.0.0 TLS watchdog reboot, Wokwi connection choices, ESP32 core 2.0.17 compatibility build, install-cloudflared.py verified installer, Merged Wokwi firmware image (+8 more)

### Community 20 - "React.js and Tailwind UI conventions"
Cohesion: 0.09
Nodes (16): Dashboard visual contract with Tailwind integration, Step 6: reference-matched web views, React.js and Tailwind UI conventions, Selector-controlled dark variant (html[data-admin-theme='dark']), Tailwind 4.3.5 Vite plugin build and layer cascade (tw prefix, no Preflight), Semantic color tokens via @theme inline (ink, muted, note, surface, canvas, line, danger), Access flow contrast mobile and verification refinement passes, Documented current Edge accessibility unit and production checks (+8 more)

### Community 21 - "test_assistant_continuation.py"
Cohesion: 0.26
Nodes (5): continuation(), test_edit_preserves_every_unmentioned_field(), test_new_subject_or_unresolved_content_does_not_reuse_previous_tools(), test_real_query_carries_metric_and_clarifies_missing_subject(), test_underdefined_or_incompatible_edits_clarify()

### Community 22 - "demo.js"
Cohesion: 0.24
Nodes (8): activity, EVENT, initialQueue, names, players, rounds, scoreBuckets(), summarize()

### Community 23 - "QR Player Flow Docs"
Cohesion: 0.15
Nodes (17): Authenticated synthetic-tested device integration boundary, Completed-round-only source-matched player leaderboard, Current QR player flow and administrator access, Durable win loss alerts with focus-refresh polling, Explicit Queue-page simulator action sequence, Owner-only persistent ticket across refreshes, Preserved Sourcio-derived player styling and font symbols, Private cabinetState and queueState waiting reasons (+9 more)

### Community 24 - "Frontend Dependencies"
Cohesion: 0.09
Nodes (29): dependencies, @fontsource-variable/open-sans@5.3.0, @fortawesome/fontawesome-free@7.3.1, html5-qrcode@2.3.8, qr-scanner@1.4.2, qrcode.react@4.2.0, @radix-ui/react-dialog@1.3.1, @radix-ui/react-dropdown-menu@2.2.1 (+21 more)

### Community 25 - "setup.mjs"
Cohesion: 0.14
Nodes (31): arduino(), args, backendVenv(), check, checkNode(), cloudflared(), database(), ensureMysql() (+23 more)

### Community 26 - "The web game screen (default game display)"
Cohesion: 0.17
Nodes (12): Button wiring, Code map, Fallbacks and fixes, How a round works, Look and effects (design v2, 25 November), Roles, Rules: Matrix v2 (25 November), Setup (+4 more)

### Community 27 - "Assistant Training Datasets Doc"
Cohesion: 0.07
Nodes (26): Optimistic revision current public context confirmation and409staleapproval, 1000recordsperowner25perpage bounded parameterized statement-deadline queries, Future evaluation UI confirm correct reject versioneddecisions navigation progressfilters, Predictions hidden during pre-evaluation label review, Future evaluation UI question proposedlabel typedprior expectedstate explanations notes, Post-consumption corrections preserve originalresult new annotationversion, No player identities private chats or credentials in future review UI, Planned21November dedicated admin evaluationcase review page not implemented (+18 more)

### Community 28 - "prepare-online-firmware.py"
Cohesion: 0.29
Nodes (4): esptool_names(), main(), merge_firmware(), trust_bundle()

### Community 29 - "Settings"
Cohesion: 0.42
Nodes (6): Settings, serve(), cloud_env(), test_cloud_origin_and_private_database_without_xampp_paths(), test_production_rejects_insecure_cookies(), test_production_rejects_insecure_or_non_origin_public_urls()

### Community 30 - "set-device-url.py"
Cohesion: 0.48
Nodes (3): flash_helpers(), main(), send()

### Community 31 - "Render Blueprint"
Cohesion: 0.08
Nodes (24): mountPath, name, sizeGB, fromService, generateValue, key, sync, value (+16 more)

### Community 33 - "stack_moko_baby connected firmware (protocol v2)"
Cohesion: 0.06
Nodes (33): Flag round for review (admin review endpoint), Read-only command polling (GET /api/device/commands), device_emulator.py file-journal emulator, X-Device-Token cabinet authentication, Machine page command diagnostics, MariaDB FOR UPDATE row locks, Receipt-required session start, RFC 9110 safe and idempotent methods (+25 more)

### Community 34 - "uuid"
Cohesion: 0.23
Nodes (12): matrix(), pair(), screen(), test_only_an_administrator_pairs_and_the_old_token_stops_working(), test_screen_plays_a_ranked_round_and_pairing_waits_for_it(), test_switching_back_to_the_led_cabinet_restores_its_configured_token(), uid(), add_operator() (+4 more)

### Community 35 - "NLP admission repair — 24 November 2026"
Cohesion: 0.29
Nodes (7): Consumed 325-case replay (regression only), Human-confirmed v2 replay (regression only), Measured results (development data only), NLP admission repair — 24 November 2026, Problem, Still open, Verification

### Community 36 - "Stack Intelligence local administrator analytics guide"
Cohesion: 0.05
Nodes (41): Stack Intelligence local administrator analytics guide, Explicit owner-reviewed current-version routing examples, Dashboard Settings houses model memory and training controls, System grounded learning retrieval and development corpora, Admin question review (/admin/question-review, migration 006), Candidate evaluation collection v2 (325 AI-authored questions), Holdout v2 AI-reviewed first use: 130/325, Lexical overlap audit (Jaccard >= .70 and char similarity >= .84) (+33 more)

### Community 37 - "Offline Classifier Experiment"
Cohesion: 0.06
Nodes (38): 40of120supported blocked upstream;84of130admitted31unknown14scope1measurement, 285originaltraining plus792historyvariants1077rows zero new independent questions, Synthetic variants add no missing subtypes language diversity or independent families, Augmentedpolicy answerszero question-onlypolicy answersone of120supported, Collection was empty at history run;later325AI candidates filled independentreviewpending, Frozen multilingual E5 hierarchical heads history and question-only ablations, Retained protocol variants heads predictions and14offlinechecks, AugmentedE5 ordinary61of130 stress47of120 vsoriginal63and14 (+30 more)

### Community 38 - "Candidate MySQL Schema"
Cohesion: 0.25
Nodes (18): ai_admin_memory, ai_requests, ai_training_examples, audit_logs, auth_sessions, device_commands, device_events, events (+10 more)

### Community 39 - "test_player_flow.py"
Cohesion: 0.09
Nodes (38): compose_all(), purge(), summary(), test_absent_device_results_are_not_inferred_from_registrations(), test_all_sources_are_separate_and_players_are_deduplicated(), load_script(), test_dry_run_is_the_default(), test_older_backup_selection_only_picks_earlier_backups() (+30 more)

### Community 40 - "Device Command Tests"
Cohesion: 0.20
Nodes (15): CommandEmulator, main(), command_row(), reserve(), test_emulator_refuses_corrupt_journal_before_contacting_device(), test_expired_unknown_start_never_becomes_an_automatic_no_show(), test_invalid_or_stale_receipts_cannot_change_the_command(), test_other_machine_commands_and_maintenance_cannot_be_bypassed() (+7 more)

### Community 42 - "Architecture and Graphify Docs"
Cohesion: 0.09
Nodes (14): Address and availability, Daily startup, Free online operation with XAMPP, Verification and remaining checks, Wokwi firmware, Local Graphify setup and freshness guide, Stack Moko Baby technology and ownership architecture, Authenticated revision-only invalidation and coherent REST snapshots (+6 more)

### Community 45 - "Vite and Tailwind Build"
Cohesion: 0.12
Nodes (16): devDependencies, jsdom@31.0.1, prettier@3.10.1, tailwindcss@4.3.5, @tailwindcss/vite@4.3.5, @testing-library/react@16.3.3, @testing-library/user-event@14.6.10, vite@8.3.8 (+8 more)

### Community 46 - "Initial Database Migration"
Cohesion: 0.28
Nodes (16): ai_requests, audit_logs, auth_sessions, device_commands, device_events, events, game_sessions, machines (+8 more)

### Community 47 - "ui.jsx"
Cohesion: 0.12
Nodes (51): ActivityChart(), axis, ChartTip(), LevelChart(), OutcomesChart(), ScoreChart(), actions, DeviceRecovery() (+43 more)

### Community 48 - "Cross-system quality audit (19 Nov 2026)"
Cohesion: 0.09
Nodes (8): Classic v1 ruleset (preserved), Matrix v1 ruleset, 006_matrix_rules.sql migration, Selected Matrix v1 supersedes Classic-only proposals, Stack Moko Baby — functional specification, Pending physical, identity and network release decisions, Durable browser updates, Migration 006 Matrix rules and authenticated command ordering

### Community 49 - "Playwright Browser Tests"
Cohesion: 0.09
Nodes (9): sizes, @playwright/test@1.65.1, directory, errors, height, results, routes, width (+1 more)

### Community 50 - "Scanner.jsx"
Cohesion: 0.05
Nodes (58): chatContext(), ChatWidget(), dismissNudge(), openChat(), remember(), seen(), mocks, show() (+50 more)

### Community 51 - "Root Package Scripts"
Cohesion: 0.09
Nodes (22): engines, node, name, private, scripts, db:backup, db:purge-ids, db:verify (+14 more)

### Community 52 - "json"
Cohesion: 0.09
Nodes (10): canonical(), main(), plot(), main(), measured(), publish(), metrics(), primary() (+2 more)

### Community 53 - "assistant_training.py"
Cohesion: 0.08
Nodes (30): retrieve(), seed_examples(), _seed_examples(), semantic_features(), signature(), topic_choices(), compatible(), Proposal (+22 more)

### Community 55 - "check_quality.py"
Cohesion: 0.17
Nodes (8): replace(), main(), start_api(), percentile(), executable(), main(), wait_for(), main()

### Community 56 - "db-backup.py"
Cohesion: 0.22
Nodes (19): api_running(), app_login(), backup_dir(), backup_key(), client_args(), client_env(), env_values(), latest() (+11 more)

### Community 57 - "flows.spec.js"
Cohesion: 0.29
Nodes (3): errors, @axe-core/playwright@4.14.0, @axe-core/playwright

### Community 58 - "Stack Moko Baby backend"
Cohesion: 0.11
Nodes (13): Applied typed-memory and reviewed-example migrations, Matrix rules and active free same-origin HTTPS backend, Stack Moko Baby backend, Private player journey, live channels and phone HTTPS, ESP32, Wokwi and online operation, Firmware files and wiring, Journal and operational limits, Keeping XAMPP and local Ollama online (+5 more)

### Community 59 - "LiveHub"
Cohesion: 0.24
Nodes (4): LiveHub, restart(), test_slow_clients_coalesce_and_connection_caps_are_bounded(), check()

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
Cohesion: 0.08
Nodes (44): APIInput, BootRegistration, JournalEvent, Placement, RecoveryReason, RecoveryResolution, Result, Admissions (+36 more)

### Community 64 - "api"
Cohesion: 0.05
Nodes (54): AdminAssistant(), send(), submit(), answerLabels, Evidence(), suggestions, mocks, openChat() (+46 more)

### Community 65 - "Firmware Transport Job"
Cohesion: 0.20
Nodes (7): RequestJob, body, boot, kind, path, response, status

### Community 66 - "dev.mjs"
Cohesion: 0.21
Nodes (10): backend, backendOnly, frontend, health(), main(), owned, portInUse(), root (+2 more)

### Community 67 - "Physical cabinet bring-up over a phone hotspot"
Cohesion: 0.29
Nodes (7): 1. Prepare the hotspot phone, 2. Wiring self-test (do this as soon as the wiring is finished), 3. Flash the game firmware for the hotspot, 4. Connection gates (watch the serial monitor and the Machines page), 5. First real round, Physical cabinet bring-up over a phone hotspot, Tools added for the physical board

### Community 69 - "Player Flow Migration"
Cohesion: 0.12
Nodes (11): entry_grants, login_attempts, player_notifications, qr_links, ai_admin_memory, ai_training_examples, device_boots, device_journal_events (+3 more)

### Community 70 - "Step 8: constrained AI analytics"
Cohesion: 0.22
Nodes (8): Private per-admin typed memory (migration 003, ai_admin_memory), Reviewed AI training examples (migration 004, ai_training_examples), Stack Intelligence bottom chat (admin shell), Step 0: resolve physical and operational constraints, Step 3: database, identity and staff authentication, Step 4: queue and transactional session assignment, Step 8: constrained AI analytics, Step status and remaining gates table (steps 0-9)

### Community 71 - "fastapi"
Cohesion: 0.31
Nodes (3): mount_frontend(), test_missing_production_build_fails_at_startup(), test_production_spa_preserves_api_and_private_file_boundaries()

### Community 74 - "Wokwi Wiring Diagram"
Cohesion: 0.29
Nodes (6): author, connections, dependencies, editor, parts, version

### Community 75 - "Context"
Cohesion: 0.10
Nodes (15): basic_response(), Context, Intent, knowledge_response(), preference_reply(), SavedMemory, Observer, predict() (+7 more)

### Community 77 - "argparse"
Cohesion: 0.13
Nodes (8): canonical_origin(), main(), private_lan(), wifi_problem(), main(), backup_module(), main(), older_backups()

### Community 80 - "Firmware Game Engine"
Cohesion: 0.47
Nodes (3): press(), timeout(), x()

### Community 81 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 82 - "test_nlp_lab.py"
Cohesion: 0.15
Nodes (16): balanced_cases(), partitions(), find(), union(), prepare(), sources(), Frame, collection() (+8 more)

### Community 83 - "event-check.py"
Cohesion: 0.40
Nodes (8): checks(), fix_power(), main(), on_charger(), pending_restart(), port_open(), power_value(), run()

### Community 84 - "Backend Dependency Pins"
Cohesion: 0.67
Nodes (3): Pinned Argon2 and cryptography security dependencies, Pinned backend dependency manifest, Pinned FastAPI SQLAlchemy PyMySQL Uvicorn runtime

### Community 85 - "re"
Cohesion: 0.11
Nodes (21): conversational_reply(), parse(), greeting_answer(), interaction_rows(), interaction_social(), interaction_text(), interaction_words(), social_phrases() (+13 more)

### Community 100 - "text"
Cohesion: 0.25
Nodes (8): question_only(), QuestionOnly, training_variants(), test_augmentation_cannot_ingest_calibration_comparison_or_blocked_rows(), test_existing_contextual_examples_are_never_relabelled_or_given_wrong_subject(), test_history_variants_keep_original_question_target_and_family(), test_question_only_features_do_not_change_with_any_validated_prior_subject(), training_row()

### Community 101 - "hashlib"
Cohesion: 0.12
Nodes (14): inspect(), corpus_digest(), model_json(), scope_payload(), ScopePlan, build(), wording(), measure() (+6 more)

### Community 103 - "Setting up Stack Moko Baby on a new laptop"
Cohesion: 0.22
Nodes (9): 1. Install the programs (once per laptop), 2. What `npm run setup` does, 3. Run it, For coding agents, Game screen laptop, Setting up Stack Moko Baby on a new laptop, TL;DR, Troubleshooting (+1 more)

### Community 108 - "assistant_training.py"
Cohesion: 0.12
Nodes (9): canonical(), context_version(), Review, TrainingStore, Annotation, CaseReview, packet(), proposed() (+1 more)

### Community 109 - "subprocess"
Cohesion: 0.27
Nodes (6): arduino_cli(), check_layout(), detect_port(), esptool_names(), main(), partitions()

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
Nodes (32): COLORS, Deadline(), drawBoard(), GameScreen(), connectButton(), fullScreen(), toggleKeyboard(), toggleSound() (+24 more)

### Community 115 - "os"
Cohesion: 0.12
Nodes (10): MemoryStore, make_engine(), migrate(), seed(), main(), test_forget_has_csrf_and_prevents_old_inflight_memory_from_returning(), test_persistent_memory_restores_subject_without_storing_messages(), test_preferences_are_private_and_memory_can_be_disabled() (+2 more)

### Community 116 - "useApp"
Cohesion: 0.31
Nodes (11): AdminOnly(), Check, X, Shell(), tabs, IconButton(), Logo(), UpdateStatus() (+3 more)

### Community 118 - "engine.js"
Cohesion: 0.12
Nodes (21): FIRMWARE, loadSaved(), STORAGE_KEY, fakeServer(), server, COUNTDOWN_MS, COUNTDOWN_STEP_MS, knownRuleset() (+13 more)

### Community 119 - "prepare_candidate_holdout.py"
Cohesion: 0.18
Nodes (14): feature_key(), overlap_audit(), reference_questions(), text_key(), audit(), build(), followup(), main() (+6 more)

### Community 120 - "SerialButton"
Cohesion: 0.21
Nodes (5): BAUD_RATE, ClockMap, parseLine(), SerialButton, serialSupported()

### Community 124 - "request_limits.py"
Cohesion: 0.25
Nodes (3): RequestSizeLimit, bounded_receive(), receive()

### Community 125 - "Wrong-topic answers and generic replies — 24 November 2026"
Cohesion: 0.40
Nodes (5): Measured results, Problem, Still open, Verification, Wrong-topic answers and generic replies — 24 November 2026

### Community 126 - "within_deadline"
Cohesion: 0.50
Nodes (3): assistant_query(), within_deadline(), request()

## Knowledge Gaps
- **420 isolated node(s):** `COLORS`, `iconProps`, `FIRMWARE`, `RULESETS`, `MIN_GAP_MS` (+415 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 811 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Assistant` connect `Assistant Question Pipeline` to `assistant.py`, `create_app`, `pytest`, `os`, `assistant_training.py`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `create_app()` (e.g. with `BootRegistration` and `JournalEvent`) actually correct?**
  _`create_app()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `COLORS`, `iconProps`, `FIRMWARE` to the rest of the system?**
  _420 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `evaluate_holdout.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1178743961352657 - nodes in this community are weakly interconnected._
- **Why does `Verified remaining work` connect `Project documentation index (canonical internal guide)` to `stack_moko_baby connected firmware (protocol v2)`, `Stack Intelligence local administrator analytics guide`, `Offline Classifier Experiment`, `npm run online:firmware launcher`, `React.js and Tailwind UI conventions`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Should `normalize` be split into smaller, more focused modules?**
  _Cohesion score 0.07923497267759563 - nodes in this community are weakly interconnected._
- **Why does `create_app()` connect `create_app` to `fastapi`, `Assistant Question Pipeline`, `Context`, `assistant_training.py`, `pytest`, `main.py`, `os`, `answer`, `re`, `LiveHub`, `Settings`, `within_deadline`, `main.py`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._