-- Matrix v2 (25 Nov 2026): 20 columns, 17 levels, 6-cell start centred at column 7, 60 s,
-- 90 ms per cell on level 1, 6 ms faster each level, never faster than 35 ms.
-- Matrix v1 results are preserved and ranked separately; only new assignments use v2.
-- The web game screen plays v2; switching back to the LED cabinet makes v1 active again.
INSERT IGNORE INTO rulesets(code,version,config,config_hash,created_by)
SELECT 'matrix-v2',1,'{"base_step_ms":90,"code":"matrix-v2","columns":20,"foundation_x":7,"initial_width":6,"levels":17,"minimum_step_ms":35,"perfect_bonus":0,"round_limit_ms":60000,"row_points":1,"step_decrease_ms":6}',
UNHEX('b2ec6a7cdc7dfb10afb092b46cb6e8e4725c16b0f1e693e2a2dac7ea10390d27'),id FROM staff_users ORDER BY id LIMIT 1;

UPDATE events SET settings=JSON_SET(settings,'$.active_ruleset','matrix-v2'),revision=revision+1
WHERE code='acs-day' AND JSON_UNQUOTE(JSON_EXTRACT(settings,'$.active_ruleset'))='matrix-v1';
