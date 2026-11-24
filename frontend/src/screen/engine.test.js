import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MATRIX_RULES,
  MATRIX_RULES_HASH,
  MATRIX_V2_RULES,
  MATRIX_V2_RULES_HASH,
  knownRuleset,
  stepInterval,
  createRound,
  playPresses,
  positionAt,
  press,
  toResult,
} from './engine'

const vectors = JSON.parse(
  readFileSync(resolve(process.cwd(), '../contracts/matrix-v1.vectors.json'), 'utf-8'),
)

describe('Matrix v1 engine', () => {
  it('uses the server rules and hash', () => {
    expect(MATRIX_RULES).toEqual(vectors.rules)
    expect(MATRIX_RULES_HASH).toBe(vectors.rulesHash)
  })

  it.each(vectors.vectors.map((v) => [v.name, v]))('matches the server trace: %s', (_, vector) => {
    const round = playPresses(vector.presses)
    const result = toResult(round, '00000000-0000-4000-8000-000000000000')
    expect(result.outcome).toBe(vector.expected.outcome)
    expect(result.durationMs).toBe(vector.expected.durationMs)
    expect(result.placements).toEqual(vector.expected.placements)
    expect(round.score).toBe(vector.expected.score)
  })

  it('bounces the row between the edges', () => {
    const round = createRound()
    expect(positionAt(round, 0)).toBe(0)
    expect(positionAt(round, 60 * 10)).toBe(10)
    expect(positionAt(round, 60 * 11)).toBe(9)
    expect(positionAt(round, 60 * 20)).toBe(0)
  })

  it('refuses a result before the round ends', () => {
    const round = createRound()
    press(round, 400)
    expect(() => toResult(round, 'x')).toThrow()
  })
})

const v2 = JSON.parse(
  readFileSync(resolve(process.cwd(), '../contracts/matrix-v2.vectors.json'), 'utf-8'),
)

describe('Matrix v2 engine (web game screen)', () => {
  it('uses the server rules and hash', () => {
    expect(MATRIX_V2_RULES).toEqual(v2.rules)
    expect(MATRIX_V2_RULES_HASH).toBe(v2.rulesHash)
    expect(knownRuleset(v2.rules, v2.rulesHash)).not.toBeNull()
    expect(knownRuleset(v2.rules, MATRIX_RULES_HASH)).toBeNull()
  })

  it.each(v2.vectors.map((v) => [v.name, v]))('matches the server trace: %s', (_, vector) => {
    const round = playPresses(vector.presses, MATRIX_V2_RULES)
    const result = toResult(round, '00000000-0000-4000-8000-000000000000')
    expect(result.rulesHash).toBe(MATRIX_V2_RULES_HASH)
    expect(result.outcome).toBe(vector.expected.outcome)
    expect(result.durationMs).toBe(vector.expected.durationMs)
    expect(result.placements).toEqual(vector.expected.placements)
    expect(round.score).toBe(vector.expected.score)
  })

  it('moves faster on every level until 35 ms per cell', () => {
    const round = createRound(MATRIX_V2_RULES)
    const steps = []
    for (let level = 0; level < 12; level += 1) {
      round.count = level
      steps.push(stepInterval(round))
    }
    expect(steps).toEqual([90, 84, 78, 72, 66, 60, 54, 48, 42, 36, 35, 35])
  })
})
