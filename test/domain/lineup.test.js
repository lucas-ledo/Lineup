import test from 'node:test'
import assert from 'node:assert/strict'
import { LineupType, createLineup, hydrateLineup, withPlayerPool } from '../../src/domain/lineup.js'

test('a lineup stores participant references separately from available players', () => {
  const lineup = createLineup({
    type: LineupType.CURRENT_TEAM,
    context: { type: 'team', id: 7, name: 'Example FC' },
    playerPool: [{ id: 1 }, { id: 2 }],
    starters: { gk: { id: 1 } },
    bench: [{ id: 2 }],
  })

  assert.deepEqual(lineup.starters.gk, { playerId: '1', slotId: 'gk', role: 'starter' })
  assert.deepEqual(lineup.bench, [{ playerId: '2', role: 'bench', benchOrder: 0 }])
  assert.deepEqual(lineup.playerPool, ['1', '2'])
})

test('a player cannot simultaneously occupy starter and bench roles', () => {
  const lineup = createLineup({ starters: { st: { id: 10 } }, bench: [{ id: 10 }, { id: 11 }] })
  assert.equal(lineup.bench.length, 1)
  assert.equal(lineup.bench[0].playerId, '11')
})

test('hydration resolves participant references without putting UI state on Player', () => {
  const lineup = createLineup({ starters: { gk: { id: 1 } }, bench: [{ id: 2 }] })
  const hydrated = hydrateLineup(lineup, [{ id: 1, name: 'Portero' }, { id: 2, name: 'Suplente' }])
  assert.equal(hydrated.starters.gk.name, 'Portero')
  assert.equal(hydrated.bench[0].name, 'Suplente')
  assert.equal(withPlayerPool(lineup, [{ id: 1 }, { id: 2 }, { id: 3 }]).playerPool.length, 3)
})
