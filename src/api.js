// Las imágenes de BSD se normalizan como recursos same-origin para que todos
// los consumidores, incluido html2canvas, puedan cargarlas sin CORS.
import { getClubTheme } from './teamTheme'

const IMAGE_BASE_URL = '/api/sports-images'
// Cambiar esta revisión cuando varíe el cálculo del tema; la respuesta se
// mantiene un año en la CDN por diseño.
const TEAM_THEME_API_VERSION = 4
const TEAM_SEARCH_CACHE_LIMIT = 30
const teamSearchCache = new Map()
const teamCategoryCache = new Map()

const positionMap = {
  G: 'Goalkeeper',
  D: 'Defender',
  M: 'Midfielder',
  F: 'Attacker',
}

// Desempate editorial cuando el feed no ofrece popularidad ni valor de club.
// No sustituye datos del proveedor: solo evita que filiales y juveniles aparezcan
// antes que la entidad principal en una búsqueda ambigua.
const popularTeamIdentities = [
  'real madrid', 'fc barcelona', 'futbol club barcelona', 'atletico de madrid',
  'athletic club', 'sevilla fc', 'valencia cf', 'real betis', 'villarreal',
  'manchester united', 'manchester city', 'liverpool', 'arsenal', 'chelsea',
  'tottenham', 'bayern munich', 'borussia dortmund', 'juventus', 'ac milan',
  'inter milan', 'paris saint germain', 'psg', 'ajax', 'benfica', 'porto',
  'flamengo', 'palmeiras', 'boca juniors', 'river plate',
]

function cachePromise(cache, key, load, limit = TEAM_SEARCH_CACHE_LIMIT) {
  if (cache.has(key)) return cache.get(key)
  if (cache.size >= limit) cache.delete(cache.keys().next().value)
  const pending = load()
  cache.set(key, pending)
  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key)
  })
  return pending
}

function getImageUrl(type, id, query = '') {
  // BSD redirige las rutas sin esta barra a /img/…; tras un proxy same-origin
  // esa redirección perdería el prefijo /api/sports-images.
  if (!id) return null
  if (import.meta.env.DEV) return `${IMAGE_BASE_URL}/${type}/${id}/${query}`

  const parameters = new URLSearchParams(query)
  parameters.set('__lineup_path', `${type}/${id}`)
  return `${IMAGE_BASE_URL}?${parameters.toString()}`
}

function getErrorMessage(payload) {
  if (typeof payload?.detail === 'string') return payload.detail
  if (typeof payload?.message === 'string') return payload.message
  if (typeof payload?.error === 'string') return payload.error
  if (Array.isArray(payload?.errors)) return payload.errors[0]
  return 'No se pudieron obtener los datos deportivos.'
}

async function request(path) {
  const response = await fetch(getFootballUrl(path))
  const payload = await response.json().catch(() => null)

  if (!response.ok) throw new Error(getErrorMessage(payload))
  return payload
}

function getFootballUrl(path) {
  if (import.meta.env.DEV) return `/api/football${path}`

  const [pathname, query = ''] = path.split('?')
  const parameters = new URLSearchParams(query)
  parameters.set('__lineup_path', pathname.replace(/^\/+/, ''))
  return `/api/football?${parameters.toString()}`
}

function getResults(payload) {
  if (Array.isArray(payload)) return payload
  return payload?.results || payload?.players || payload?.squad || payload?.fixtures || payload?.events || []
}

function getRecentFixturesQuery(limit = 50, offset = 0) {
  const now = new Date()
  const twoYearsAgo = new Date(now)
  twoYearsAgo.setUTCFullYear(now.getUTCFullYear() - 2)
  const dateFrom = twoYearsAgo.toISOString().slice(0, 10)
  const dateTo = now.toISOString().slice(0, 10)
  return `date_from=${dateFrom}&date_to=${dateTo}&limit=${limit}&offset=${offset}`
}

function normalizeTeam(team) {
  const id = team.id ?? team.team_id
  return {
    id,
    name: team.name || team.short_name || 'Equipo sin nombre',
    logo: getImageUrl('team', id, '?bg=transparent'),
    isWomen: isWomenTeam(team),
  }
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

function isWomenTeam(team) {
  const category = [
    team.gender,
    team.team_gender,
    team.sex,
    team.category?.gender,
    team.competition?.gender,
    team.name,
    team.short_name,
  ].filter(Boolean).join(' ')
  const normalized = normalizeSearchText(category)
  return /\b(women|womens|female|femenin[oa]?|femeni|ladies|damen|frauen|wfc)\b/.test(normalized)
    || /(?:\s|-|\()w\)?$/.test(normalized)
}

function numericTeamSignal(team, keys) {
  const value = firstValue(...keys.map((key) => team[key]))
  return parseMonetaryValue(value) ?? 0
}

function getTeamSearchScore(team, query) {
  const name = normalizeSearchText(team.name || team.short_name)
  const term = normalizeSearchText(query).trim()
  const explicitPopularity = numericTeamSignal(team, ['popularity', 'popularity_score', 'followers', 'fan_count', 'ranking', 'rank'])
  const marketValue = numericTeamSignal(team, ['market_value_eur', 'market_value', 'marketValue', 'estimated_value', 'transfer_value'])
  const exactName = name === term || normalizeSearchText(team.short_name) === term
  const startsWithQuery = name.startsWith(term)
  const isYouthOrReserve = /\b(u(?:1[0-9]|2[0-3])|juvenil|reserves?|filial|b|ii|iii)\b/.test(name) || name.includes('barcelona atletic')
  const seniorSignal = team.venue_id ? 16 : 0
  const editorialPopularity = !isYouthOrReserve && popularTeamIdentities.some((identity) => name.includes(identity)) ? 150 : 0

  // El proveedor no envía estos valores hoy, pero se usarán automáticamente
  // si aparecen en la respuesta sin obligarnos a cambiar la interfaz.
  return (exactName ? 140 : startsWithQuery ? 90 : name.includes(term) ? 50 : 0)
    + seniorSignal
    + editorialPopularity
    + Math.min(100, Math.log10(explicitPopularity + 1) * 12)
    + Math.min(80, Math.log10(marketValue + 1) * 8)
    - (isYouthOrReserve ? 70 : 0)
}

function normalizePosition(position) {
  if (positionMap[position]) return positionMap[position]
  if (position === 'Goalkeeper' || position === 'Defender' || position === 'Midfielder' || position === 'Attacker') return position
  return 'Unknown'
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null
}

function firstText(...values) {
  const value = firstValue(...values)
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null
}

function normalizeColor(value) {
  const candidate = typeof value === 'object' && value ? firstValue(value.hex, value.value, value.code, value.color) : value
  if (typeof candidate !== 'string') return null

  const hexColor = candidate.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (hexColor) {
    const normalized = hexColor.length === 3 ? hexColor.split('').map((part) => `${part}${part}`).join('') : hexColor
    return `#${normalized.toLowerCase()}`
  }

  const rgbColor = candidate.trim().match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (!rgbColor) return null
  const channels = rgbColor.slice(1).map(Number)
  if (channels.some((channel) => channel > 255)) return null
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function normalizeTeamColors(team) {
  const colors = team.colors ?? team.colours ?? team.team_colors ?? team.team_colours ?? {}
  const colorList = Array.isArray(colors) ? colors : []
  const listedPrimary = colorList.find((color) => /primary|home|main/i.test(color?.type || color?.name || color?.role || ''))
  const listedSecondary = colorList.find((color) => /secondary|away|accent/i.test(color?.type || color?.name || color?.role || ''))
  const primary = normalizeColor(firstValue(
    team.primary_color,
    team.primary_colour,
    team.primaryColor,
    team.primary,
    team.main,
    team.main_color,
    team.main_colour,
    team.shirt_color,
    team.jersey_color,
    team.base,
    team.color,
    team.colour,
    colors.primary,
    colors.primary_color,
    colors.primary_colour,
    colors.main,
    colors.main_color,
    colors.main_colour,
    colors.home,
    listedPrimary,
    colorList[0],
  ))
  const secondary = normalizeColor(firstValue(
    team.secondary_color,
    team.secondary_colour,
    team.secondaryColor,
    team.secondary,
    team.accent,
    team.shorts_color,
    team.sleeve,
    team.number_color,
    team.accent_color,
    team.accent_colour,
    colors.secondary,
    colors.secondary_color,
    colors.secondary_colour,
    colors.accent,
    colors.away,
    listedSecondary,
    colorList[1],
  ))

  return primary ? { primary, secondary } : null
}

function getEventTeamId(event, side) {
  return event?.[`${side}_team`]?.id
    ?? event?.[side]?.id
    ?? event?.[`${side}_team_id`]
    ?? event?.[`${side}TeamId`]
}

function getEventDate(event) {
  const value = firstValue(event?.event_date, event?.start_time, event?.scheduled_at, event?.kickoff, event?.date, event?.start_at)
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

function normalizeKitColors(payload, side) {
  const metadata = payload?.metadata || payload || {}
  const jersey = metadata?.jerseys?.[side]
  const kit = firstValue(
    jersey?.player,
    jersey?.outfield,
    jersey,
    metadata?.jersey_colors?.[side],
    metadata?.kits?.[side],
    metadata?.kit_colors?.[side],
    metadata?.team_kits?.[side],
    metadata?.[`${side}_kit`],
    metadata?.[`${side}Kit`],
    metadata?.[`${side}_kit_colors`],
    metadata?.[`${side}_colors`],
    metadata?.[side]?.kit,
    metadata?.[side]?.colors,
    metadata?.[`${side}_team`]?.kit,
    metadata?.[`${side}_team`]?.colors,
    metadata?.teams?.[side]?.kit,
    metadata?.teams?.[side]?.colors,
  )
  const directColors = {
    primary: firstValue(metadata?.[`${side}_kit_primary`], metadata?.[`${side}_kit_primary_color`], metadata?.[`${side}_primary_color`]),
    secondary: firstValue(metadata?.[`${side}_kit_secondary`], metadata?.[`${side}_kit_secondary_color`], metadata?.[`${side}_secondary_color`]),
  }

  return normalizeTeamColors(kit || directColors)
}

function parseMonetaryValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : null
  if (value && typeof value === 'object') {
    return parseMonetaryValue(firstValue(value.amount, value.value, value.eur, value.euros, value.fee))
  }
  if (typeof value !== 'string') return null

  const match = value.trim().replace(/\s/g, '').match(/([\d.,]+)\s*([kmb])?/i)
  if (!match) return null

  const rawNumber = match[1]
  const lastComma = rawNumber.lastIndexOf(',')
  const lastDot = rawNumber.lastIndexOf('.')
  let normalized = rawNumber

  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? rawNumber.replace(/\./g, '').replace(',', '.') : rawNumber.replace(/,/g, '')
  } else if (lastComma >= 0) {
    normalized = /,\d{1,2}$/.test(rawNumber) ? rawNumber.replace(',', '.') : rawNumber.replace(/,/g, '')
  } else if (lastDot >= 0 && !/\.\d{1,2}$/.test(rawNumber)) {
    normalized = rawNumber.replace(/\./g, '')
  }

  const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2]?.toLowerCase()] || 1
  const parsed = Number(normalized) * multiplier
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}

function getAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const birthDate = new Date(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear()
  const birthdayHasPassed = today.getUTCMonth() > birthDate.getUTCMonth()
    || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate())
  if (!birthdayHasPassed) age -= 1
  return age >= 0 && age < 80 ? age : null
}

function normalizeDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  return Number.isNaN(new Date(value).getTime()) ? null : value
}

function normalizePlayer(player, fallbackClub = null) {
  const teamId = player.team?.id ?? player.team_id ?? player.current_team_id
  const teamName = player.team?.name ?? player.team_name ?? player.current_team_name
  const club = teamId ? {
    id: teamId,
    name: teamName || 'Club actual',
    logo: getImageUrl('team', teamId, '?bg=transparent'),
  } : fallbackClub

  return {
    id: player.id ?? player.player_id,
    name: player.name || player.display_name || 'Jugador sin nombre',
    photo: getImageUrl('player', player.id ?? player.player_id, '?sor=true&bg=transparent'),
    position: normalizePosition(player.position),
    number: player.shirt_number ?? player.number ?? player.jersey_number ?? null,
    club,
    age: parseMonetaryValue(player.age) ?? getAge(firstValue(player.date_of_birth, player.birth_date, player.dob, player.birth?.date)),
    nationality: firstText(player.nationality?.name, player.nationality?.code, player.nationality_name, player.nationalities?.[0]?.name, player.nationalities?.[0]?.code, player.nationality, player.nationality_code, player.country?.name, player.country_name),
    marketValue: parseMonetaryValue(firstValue(player.market_value_eur, player.market_value, player.marketValue, player.current_market_value, player.estimated_value, player.transfer_value)),
    contractEnd: normalizeDate(firstValue(player.contract_end, player.contract_end_date, player.contract_until, player.contract_expires_at, player.contract?.end_date, player.contract?.expires_at, player.contract?.end, player.contract?.until)),
    releaseClause: parseMonetaryValue(firstValue(player.release_clause, player.release_clause_value, player.buyout_clause, player.termination_clause, player.clause_amount, player.contract?.release_clause, player.contract?.buyout_clause)),
  }
}

export async function searchTeams(query) {
  const searchTerm = query.trim()
  const cacheKey = normalizeSearchText(searchTerm)
  return cachePromise(teamSearchCache, cacheKey, async () => {
    const payload = await request(`/teams?name=${encodeURIComponent(searchTerm)}`)
    return getResults(payload).map((team) => ({
      team: normalizeTeam(team),
      venue: team.venue ? { name: team.venue.name } : null,
      country: team.country?.name || team.country_name || team.country_code || '',
      searchScore: getTeamSearchScore(team, searchTerm),
    })).sort((left, right) => right.searchScore - left.searchScore || left.team.name.localeCompare(right.team.name, 'es'))
  })
}

export function getTeamCompetitionCategory(teamId) {
  const cacheKey = String(teamId)
  return cachePromise(teamCategoryCache, cacheKey, () => requestTeamCompetitionCategory(teamId), 80)
}

async function requestTeamCompetitionCategory(teamId) {
  if (import.meta.env.DEV) return getTeamCompetitionCategoryFromProvider(teamId)
  const payload = await request(`/teams/${teamId}/category`)
  if (!payload || typeof payload.isWomen !== 'boolean') return null
  return {
    teamId: payload.teamId ?? Number(teamId),
    leagueId: payload.leagueId ?? null,
    leagueName: payload.leagueName ?? null,
    isWomen: payload.isWomen,
  }
}

async function getTeamCompetitionCategoryFromProvider(teamId) {
  const fixtureSummary = await request(`/teams/${teamId}/fixtures?${getRecentFixturesQuery(1)}`)
  const totalFixtures = Number(fixtureSummary?.count) || 0
  const fixturesPayload = totalFixtures > 1
    ? await request(`/teams/${teamId}/fixtures?${getRecentFixturesQuery(12, Math.max(totalFixtures - 12, 0))}`)
    : fixtureSummary
  const latestFixture = getResults(fixturesPayload)
    .filter((event) => event?.league_id)
    .sort((left, right) => getEventDate(right) - getEventDate(left))[0]
  if (!latestFixture?.league_id) return null

  const league = await request(`/leagues/${latestFixture.league_id}`)
  return {
    teamId: Number(teamId),
    leagueId: latestFixture.league_id,
    leagueName: league?.name || null,
    isWomen: league?.is_women === true,
  }
}

export async function getTeamProfile(teamId) {
  const payload = await request(`/teams/${teamId}`)
  const team = payload?.team || payload
  return {
    ...normalizeTeam(team),
    colors: normalizeTeamColors(team),
  }
}

export async function getTeamTheme(teamId) {
  if (import.meta.env.DEV) {
    const kitColors = await getRecentTeamKitColors(teamId).catch(() => null)
    if (kitColors) return { ...getClubTheme({ colors: kitColors }), source: 'bsd-kit' }

    const profile = await getTeamProfile(teamId).catch(() => null)
    const theme = getClubTheme(profile || {})
    return { ...theme, source: profile?.colors ? 'bsd-team' : 'fallback' }
  }
  return request(`/teams/${teamId}/theme?v=${TEAM_THEME_API_VERSION}`)
}

export async function getRecentTeamKitColors(teamId) {
  const fixtureSummary = await request(`/teams/${teamId}/fixtures?${getRecentFixturesQuery(1)}`)
  const totalFixtures = Number(fixtureSummary?.count) || 0
  const fixturesPayload = totalFixtures > 1
    ? await request(`/teams/${teamId}/fixtures?${getRecentFixturesQuery(50, Math.max(totalFixtures - 50, 0))}`)
    : fixtureSummary
  const fixtures = getResults(fixturesPayload)
  const normalizedTeamId = String(teamId)
  const events = fixtures
    .map((event) => {
      const isHome = String(getEventTeamId(event, 'home')) === normalizedTeamId
      const isAway = String(getEventTeamId(event, 'away')) === normalizedTeamId
      return { event, side: isHome ? 'home' : isAway ? 'away' : null }
    })
    .filter((item) => item.side && (item.event.id ?? item.event.event_id))
    .sort((left, right) => {
      if (left.side !== right.side) return left.side === 'home' ? -1 : 1
      return getEventDate(right.event) - getEventDate(left.event)
    })

  for (const selected of events.slice(0, 4)) {
    const eventId = selected.event.id ?? selected.event.event_id
    const metadata = await request(`/events/${eventId}/metadata`)
    const colors = normalizeKitColors(metadata, selected.side)
    if (colors) return colors
  }

  return null
}

export async function getSquad(teamId, context = 'normal') {
  const normalizedContext = context === 'market' ? 'market' : 'normal'
  const payload = await request(`/teams/${teamId}/squad?context=${normalizedContext}`)
  const players = getResults(payload).map((player) => normalizePlayer(player))
  return { players }
}

export async function getLatestTeamLineup(teamId) {
  if (import.meta.env.DEV) return getLatestTeamLineupFromProvider(teamId)

  const payload = await request(`/teams/${teamId}/latest-lineup`)
  return normalizeLatestTeamLineup(payload)
}

function normalizeLatestTeamLineup(payload) {
  if (!payload?.players?.length) return null

  return {
    teamId: payload.teamId,
    matchId: payload.matchId,
    formation: payload.formation,
    fetchedAt: payload.fetchedAt,
    expiresAt: payload.expiresAt,
    players: payload.players.map((player) => normalizePlayer(player)),
  }
}

async function getLatestTeamLineupFromProvider(teamId) {
  const today = new Date().toISOString().slice(0, 10)
  const payload = await request(`/events?team_id=${teamId}&status=finished&date_to=${today}&limit=8`)
  const events = getResults(payload)
    .filter((event) => event?.status === 'finished' && (event.id ?? event.event_id))
    .sort((left, right) => getEventDate(right) - getEventDate(left))
    .slice(0, 8)

  for (const event of events) {
    const matchId = event.id ?? event.event_id
    const lineups = await request(`/events/${matchId}/lineups`)
    const side = Object.values(lineups?.lineups || {}).find((lineup) => String(lineup?.team_id) === String(teamId))
    if (lineups?.lineup_status === 'confirmed' && side?.players?.length === 11) {
      return normalizeLatestTeamLineup({
        teamId: Number(teamId),
        matchId,
        formation: side.formation || null,
        players: side.players,
      })
    }
  }

  return null
}

export async function searchPlayers(query) {
  const payload = await request(`/players?name=${encodeURIComponent(query)}`)
  const uniquePlayers = new Map()

  getResults(payload).forEach((player) => {
    const normalized = normalizePlayer(player)
    if (normalized.id && !uniquePlayers.has(normalized.id)) uniquePlayers.set(normalized.id, normalized)
  })

  return [...uniquePlayers.values()]
}

export async function getNationalTeamPlayers(nationalTeamId) {
  const payload = await request(`/players?national_team_id=${encodeURIComponent(nationalTeamId)}&limit=50`)
  return getResults(payload).map((player) => normalizePlayer(player))
}

function normalizeHistoricalPosition(position) {
  const value = String(position || '').toLocaleLowerCase('en')
  if (value.includes('goalkeeper') || value.includes('keeper')) return 'Goalkeeper'
  if (value.includes('back') || value.includes('defend')) return 'Defender'
  if (value.includes('midfield') || value.includes('winger')) return 'Midfielder'
  if (value.includes('forward') || value.includes('striker') || value.includes('attacking')) return 'Attacker'
  return 'Unknown'
}

export async function searchHistoricalPlayers(query) {
  const response = await fetch(`/api/historical?name=${encodeURIComponent(query.trim())}`)
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(payload))
  return (payload?.player || []).filter((player) => player.strSport === 'Soccer').map((player) => ({
    id: `tsdb-${player.idPlayer}`,
    source: 'the-sports-db',
    externalId: String(player.idPlayer),
    name: player.strPlayer || 'Jugador sin nombre',
    photo: player.strCutout || player.strThumb || null,
    position: normalizeHistoricalPosition(player.strPosition),
    number: null,
    club: player.idTeam ? { id: `tsdb-team-${player.idTeam}`, name: player.strTeam || 'Equipo histórico', logo: null } : null,
    nationality: player.strNationality || null,
    age: null,
    marketValue: null,
    contractEnd: null,
    historical: { status: player.strStatus || null, formerTeamsAvailable: true },
  }))
}

export async function getHistoricalFormerTeams(playerId) {
  const response = await fetch(`/api/historical?playerId=${encodeURIComponent(playerId)}`)
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(payload))
  return (payload?.formerteams || []).map((team) => ({ name: team.strFormerTeam, joined: team.strJoined, departed: team.strDeparted, type: team.strMoveType }))
}

export async function getPlayerProfile(playerId) {
  const payload = await request(`/players/${playerId}`)
  return normalizePlayer(payload?.player || payload)
}
