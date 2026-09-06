export const LineupType = Object.freeze({
  CURRENT_TEAM: 'current-team',
  CUSTOM: 'custom',
  NATIONAL_TEAM: 'national-team',
  HISTORICAL_CLUB: 'historical-club',
  HISTORICAL_COUNTRY: 'historical-country',
  HISTORICAL_FREE: 'historical-free',
})

export const ReferenceContextType = Object.freeze({
  TEAM: 'team',
  NATIONAL_TEAM: 'national-team',
})

export const DEFAULT_FORMATION = '4-3-3'
export const MAX_BENCH_PLAYERS = 11

const lineupTypes = new Set(Object.values(LineupType))
const contextTypes = new Set(Object.values(ReferenceContextType))

function playerId(value) {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

function uniqueIds(values) {
  const seen = new Set()
  return values.reduce((ids, value) => {
    const id = playerId(value?.playerId ?? value?.id ?? value)
    if (!id || seen.has(id)) return ids
    seen.add(id)
    ids.push(id)
    return ids
  }, [])
}

function normalizeContext(context) {
  const id = playerId(context?.id)
  if (!id || !contextTypes.has(context?.type)) return null
  return { type: context.type, id, name: context.name || null }
}

export function createLineup({
  type = LineupType.CUSTOM,
  title = '',
  formation = DEFAULT_FORMATION,
  context = null,
  playerPool = [],
  starters = {},
  bench = [],
  metadata = {},
} = {}) {
  const normalizedStarters = {}
  const starterIds = new Set()

  Object.entries(starters || {}).forEach(([slotId, entry]) => {
    const id = playerId(entry?.playerId ?? entry?.id ?? entry)
    if (!slotId || !id || starterIds.has(id)) return
    starterIds.add(id)
    normalizedStarters[slotId] = { playerId: id, slotId, role: 'starter' }
  })

  const normalizedBench = []
  uniqueIds(bench).forEach((id) => {
    if (starterIds.has(id) || normalizedBench.length >= MAX_BENCH_PLAYERS) return
    normalizedBench.push({ playerId: id, role: 'bench', benchOrder: normalizedBench.length })
  })

  const selectedIds = [...starterIds, ...normalizedBench.map((entry) => entry.playerId)]
  return {
    version: 2,
    type: lineupTypes.has(type) ? type : LineupType.CUSTOM,
    title: typeof title === 'string' ? title : '',
    formation: typeof formation === 'string' && formation ? formation : DEFAULT_FORMATION,
    context: normalizeContext(context),
    playerPool: uniqueIds([...playerPool, ...selectedIds]),
    starters: normalizedStarters,
    bench: normalizedBench,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  }
}

export function withPlayerPool(lineup, players) {
  const playerPool = uniqueIds(players)
  const selectedIds = getSelectedPlayerIds(lineup)
  const nextPool = uniqueIds([...playerPool, ...selectedIds])
  const hasSamePool = nextPool.length === lineup.playerPool.length && nextPool.every((id, index) => id === lineup.playerPool[index])
  return hasSamePool ? lineup : { ...lineup, playerPool: nextPool }
}

export function getSelectedPlayerIds(lineup) {
  return [
    ...Object.values(lineup?.starters || {}).map((entry) => entry.playerId),
    ...(lineup?.bench || []).map((entry) => entry.playerId),
  ]
}

export function hydrateLineup(lineup, players) {
  const byId = new Map(players.map((player) => [String(player.id), player]))
  const starters = Object.fromEntries(Object.entries(lineup.starters)
    .map(([slotId, entry]) => [slotId, byId.get(entry.playerId)])
    .filter(([, player]) => Boolean(player)))
  const bench = lineup.bench.map((entry) => byId.get(entry.playerId)).filter(Boolean)
  return { starters, bench }
}

export function toLineupDraft(lineup) {
  return createLineup(lineup)
}
