import hashlib
import json

RULES = {'code': 'classic-v1', 'columns': 8, 'levels': 12, 'initial_width': 3,
         'foundation_x': 2, 'round_limit_ms': 60000, 'base_step_ms': 350,
         'step_decrease_ms': 20, 'minimum_step_ms': 120, 'row_points': 100, 'perfect_bonus': 25}

# A new immutable cohort: never reinterpret earlier classic-v1 results.
MATRIX_RULES = {'code': 'matrix-v1', 'columns': 16, 'levels': 15, 'initial_width': 6,
                'foundation_x': 5, 'round_limit_ms': 60000, 'base_step_ms': 60,
                'step_decrease_ms': 10, 'minimum_step_ms': 50, 'row_points': 1, 'perfect_bonus': 0}
# Matrix v2 (25 Nov 2026, web game screen): a 20-wide, 18-tall board (foundation + 17 levels)
# and a steep speed ramp: 90 ms per cell on level 1, 6 ms faster each level, floor 35 ms.
MATRIX_V2_RULES = {'code': 'matrix-v2', 'columns': 20, 'levels': 17, 'initial_width': 6,
                   'foundation_x': 7, 'round_limit_ms': 60000, 'base_step_ms': 90,
                   'step_decrease_ms': 6, 'minimum_step_ms': 35, 'row_points': 1, 'perfect_bonus': 0}
RULESETS = {r['code']: r for r in (RULES, MATRIX_RULES, MATRIX_V2_RULES)}
# The ruleset each game device plays: the web screen uses v2, the LED firmware is built for v1.
DEVICE_RULESETS = {'screen': 'matrix-v2', 'led': 'matrix-v1'}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


RULES_HASH = hashlib.sha256(canonical(RULES).encode()).digest()


def rules_hash(rules):
    return hashlib.sha256(canonical(rules).encode()).digest()


def active_rules(c):
    from .database import one
    event = one(c, "SELECT settings FROM events WHERE code='acs-day'")
    code = json.loads(event['settings'] or '{}').get('active_ruleset', 'classic-v1')
    return stored_rules(c, code=code)


def stored_rules(c, *, code=None, ruleset_id=None):
    from .database import one
    row = one(c, 'SELECT * FROM rulesets WHERE code=:code' if code else
              'SELECT * FROM rulesets WHERE id=:id', **({'code': code} if code else {'id': ruleset_id}))
    if not row or row['code'] not in RULESETS or json.loads(row['config']) != RULESETS[row['code']] or row['config_hash'] != rules_hash(RULESETS[row['code']]):
        raise ValueError('Unknown or modified game rules. Apply the project setup.')
    return row, RULESETS[row['code']]


def replay(placements, duration_ms, outcome, rules=None):
    rules = rules or RULES
    limit = rules['round_limit_ms']
    if not 0 <= duration_ms <= limit:
        raise ValueError('Invalid round duration.')
    support_x, width, last_time = rules['foundation_x'], rules['initial_width'], 0
    successful, perfect, retained, attempted = 0, 0, 0, 0
    proof = []
    missed = False
    for index, placement in enumerate(placements):
        level = index + 1
        if missed or level > rules['levels']:
            raise ValueError('Placement after the round ended.')
        locked = placement['locked_at_ms']
        x = placement['candidate_x']
        interval = max(rules['minimum_step_ms'], rules['base_step_ms'] - rules['step_decrease_ms'] * index)
        elapsed = locked - last_time
        if elapsed < 30 or locked >= limit or locked > duration_ms:
            raise ValueError('Invalid placement time.')
        steps = elapsed // interval
        span = rules['columns'] - width
        phase = steps % (2 * span)
        expected_x = phase if phase <= span else 2 * span - phase
        if x != expected_x or placement['candidate_width'] != width:
            raise ValueError('Placement does not match the row movement.')
        left, right = max(support_x, x), min(support_x + width, x + width)
        overlap = max(0, right - left)
        if placement['overlap_width'] != overlap:
            raise ValueError('Invalid overlap evidence.')
        proof.append({'level': level, 'x': x, 'width': width, 'support_x': support_x,
                      'support_width': width, 'overlap': overlap, 'locked': locked})
        attempted += width
        retained += overlap
        if overlap:
            successful += 1
            perfect += int(overlap == width)
            support_x, width = left, overlap
        else:
            missed = True
        last_time = locked
    expected_outcome = 'win' if successful == rules['levels'] else 'loss'
    if outcome != expected_outcome or (not missed and successful < rules['levels'] and duration_ms != limit):
        raise ValueError('The outcome does not match the placement evidence.')
    if (missed or successful == rules['levels']) and duration_ms != last_time:
        raise ValueError('Terminal duration must match the final placement time.')
    return {'score': rules['row_points'] * successful + rules['perfect_bonus'] * perfect, 'level': successful, 'perfect': perfect,
            'retained': retained, 'attempted': attempted, 'placements': proof,
            'reason': 'target_reached' if outcome == 'win' else 'zero_overlap' if missed else 'timeout'}


def simulated_result(outcome, rules=None):
    import uuid
    rules = rules or RULES
    placements, clock = [], 0
    count = rules['levels'] if outcome == 'win' else 4
    for index in range(count):
        miss = outcome == 'loss' and index == count - 1
        interval = max(rules['minimum_step_ms'], rules['base_step_ms'] - rules['step_decrease_ms'] * index)
        x = rules['columns'] - rules['initial_width'] if miss else rules['foundation_x']
        clock += interval * x + 5
        overlap = max(0, min(rules['foundation_x'] + rules['initial_width'], x + rules['initial_width']) - max(rules['foundation_x'], x))
        # Matrix v1's six-cell starting bar cannot miss completely yet;
        # its loss fixture times out after three perfect placements.
        if miss and overlap:
            return {'terminalId': str(uuid.uuid4()), 'outcome': 'loss', 'durationMs': rules['round_limit_ms'],
                    'rulesHash': rules_hash(rules).hex(), 'placements': placements}
        placements.append({'candidate_x': x, 'candidate_width': rules['initial_width'],
                           'overlap_width': overlap, 'locked_at_ms': clock})
    return {'terminalId': str(uuid.uuid4()), 'outcome': outcome, 'durationMs': clock,
            'rulesHash': rules_hash(rules).hex(), 'placements': placements}
