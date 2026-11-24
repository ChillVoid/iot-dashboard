"""The web game screen's engine (frontend/src/screen/engine.js) is checked against these
same vectors in vitest; here every expected trace must pass the server's replay()."""
import json
from pathlib import Path

import pytest

from app.game import MATRIX_RULES, MATRIX_V2_RULES, replay, rules_hash

CONTRACTS = Path(__file__).resolve().parents[2] / 'contracts'
CASES = [('matrix-v1.vectors.json', MATRIX_RULES), ('matrix-v2.vectors.json', MATRIX_V2_RULES)]


@pytest.mark.parametrize('name,rules', CASES)
def test_vectors_use_the_current_rules(name, rules):
    vectors = json.loads((CONTRACTS / name).read_text(encoding='utf-8'))
    assert vectors['rules'] == rules
    assert vectors['rulesHash'] == rules_hash(rules).hex()


@pytest.mark.parametrize('name,rules', CASES)
def test_every_vector_replays_with_its_score(name, rules):
    vectors = json.loads((CONTRACTS / name).read_text(encoding='utf-8'))
    assert len(vectors['vectors']) >= 10
    assert {v['expected']['outcome'] for v in vectors['vectors']} == {'win', 'loss'}
    for vector in vectors['vectors']:
        expected = vector['expected']
        result = replay(expected['placements'], expected['durationMs'], expected['outcome'], rules)
        assert result['score'] == expected['score'], vector['name']


def test_matrix_v2_speeds_up_every_level_until_its_floor():
    steps = [max(MATRIX_V2_RULES['minimum_step_ms'], MATRIX_V2_RULES['base_step_ms'] - MATRIX_V2_RULES['step_decrease_ms'] * i)
             for i in range(MATRIX_V2_RULES['levels'])]
    assert steps[:10] == [90, 84, 78, 72, 66, 60, 54, 48, 42, 36] and set(steps[10:]) == {35}
    assert MATRIX_V2_RULES['columns'] == 20 and MATRIX_V2_RULES['levels'] + 1 == 18
