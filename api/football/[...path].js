import { applyCachePolicy, applyNoStore, CACHE_POLICY } from '../lib/cachePolicy.js'
import { getKitColors, resolveTeamTheme } from '../lib/teamTheme.js'
import { getClubColorsFromWikidata } from '../lib/wikidata.js'

const BASE_URL = 'https://sports.bzzoiro.com/api/v2'

function getPathParts(path) {
  if (Array.isArray(path)) return path
  return typeof path === 'string' ? path.split('/') : []
}

function getQueryValue(query, key) {
  const value = query[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getFixturesPath(teamId, limit = 50, offset = 0) {
  const now = new Date()
  const twoYearsAgo = new Date(now)
  twoYearsAgo.setUTCFullYear(now.getUTCFullYear() - 2)
  const dateFrom = twoYearsAgo.toISOString().slice(0, 10)
  const dateTo = now.toISOString().slice(0, 10)
  return `/teams/${teamId}/fixtures/?date_from=${dateFrom}&date_to=${dateTo}&limit=${limit}&offset=${offset}`
}

function createEndpoint(request) {
  const path = getPathParts(request.query.path)
  const name = getQueryValue(request.query, 'name')

  if (path.length === 1 && path[0] === 'teams') {
    if (!name) return { error: 'Indica el nombre del equipo.' }
    return { path: `/teams/?name=${encodeURIComponent(name)}&limit=8`, policy: CACHE_POLICY.TEAM_SEARCH }
  }

  if (path.length === 3 && path[0] === 'teams' && /^\d+$/.test(path[1]) && path[2] === 'squad') {
    const policy = getQueryValue(request.query, 'context') === 'market' ? CACHE_POLICY.SQUAD_MARKET : CACHE_POLICY.SQUAD_NORMAL
    return { path: `/teams/${path[1]}/squad/`, policy }
  }

  if (path.length === 3 && path[0] === 'teams' && /^\d+$/.test(path[1]) && path[2] === 'fixtures') {
    return { path: getFixturesPath(path[1]), policy: CACHE_POLICY.TEAM_THEME }
  }

  if (path.length === 3 && path[0] === 'teams' && /^\d+$/.test(path[1]) && path[2] === 'theme') {
    return { kind: 'theme', teamId: path[1], policy: CACHE_POLICY.TEAM_THEME }
  }

  if (path.length === 2 && path[0] === 'teams' && /^\d+$/.test(path[1])) {
    return { path: `/teams/${path[1]}/`, policy: CACHE_POLICY.TEAM }
  }

  if (path.length === 1 && path[0] === 'players') {
    if (!name) return { error: 'Indica el nombre del jugador.' }
    return { path: `/players/?name=${encodeURIComponent(name)}&limit=20`, policy: CACHE_POLICY.PLAYER_SEARCH }
  }

  if (path.length === 2 && path[0] === 'players' && /^\d+$/.test(path[1])) {
    return { path: `/players/${path[1]}/`, policy: CACHE_POLICY.PLAYER }
  }

  if (path.length === 1 && path[0] === 'transfers') {
    return { path: '/transfers/?limit=50', policy: CACHE_POLICY.TRANSFERS }
  }

  if (path.length === 3 && path[0] === 'events' && /^\d+$/.test(path[1]) && path[2] === 'metadata') {
    return { path: `/events/${path[1]}/metadata/`, policy: CACHE_POLICY.TEAM_THEME }
  }

  return { error: 'Ruta de fútbol no válida.' }
}

async function fetchBsd(path, apiKey) {
  const upstream = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Token ${apiKey}` },
  })
  const payload = await upstream.json().catch(() => ({ error: 'Respuesta inválida de Sports Data Hub.' }))
  if (!upstream.ok) {
    const error = new Error('BSD_RESPONSE_ERROR')
    error.status = upstream.status
    error.payload = payload
    throw error
  }
  return payload
}

function getResults(payload) {
  if (Array.isArray(payload)) return payload
  return payload?.results || payload?.fixtures || payload?.events || []
}

function getEventTeamId(event, side) {
  return event?.[`${side}_team`]?.id
    ?? event?.[side]?.id
    ?? event?.[`${side}_team_id`]
    ?? event?.[`${side}TeamId`]
}

function getEventDate(event) {
  const value = event?.event_date ?? event?.start_time ?? event?.scheduled_at ?? event?.kickoff ?? event?.date
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

async function getThemeKitColors(teamId, apiKey) {
  const normalizedTeamId = String(teamId)
  const fixtureSummary = await fetchBsd(getFixturesPath(teamId, 1), apiKey)
  const totalFixtures = Number(fixtureSummary?.count) || 0
  const fixturesPayload = totalFixtures > 1
    ? await fetchBsd(getFixturesPath(teamId, 50, Math.max(totalFixtures - 50, 0)), apiKey)
    : fixtureSummary
  const fixtures = getResults(fixturesPayload)
  const events = fixtures
    .map((event) => {
      const isHome = String(getEventTeamId(event, 'home')) === normalizedTeamId
      return { event, side: isHome ? 'home' : null }
    })
    .filter((item) => item.side && (item.event.id ?? item.event.event_id))
    .sort((left, right) => getEventDate(right.event) - getEventDate(left.event))

  for (const selected of events.slice(0, 4)) {
    const eventId = selected.event.id ?? selected.event.event_id
    const metadata = await fetchBsd(`/events/${eventId}/metadata/`, apiKey)
    const colors = getKitColors(metadata, selected.side)
    if (colors) return colors
  }

  return null
}

async function getProcessedTheme(teamId, apiKey) {
  const kitColors = await getThemeKitColors(teamId, apiKey).catch(() => null)
  if (kitColors) return resolveTeamTheme(null, kitColors)

  const team = await fetchBsd(`/teams/${teamId}/`, apiKey)
  const teamTheme = resolveTeamTheme(team)
  if (teamTheme.source === 'bsd-team') return teamTheme

  const wikidataColors = await getClubColorsFromWikidata(team?.name)
  return resolveTeamTheme(team, null, wikidataColors)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    applyNoStore(response)
    response.status(405).json({ error: 'Método no permitido.' })
    return
  }

  const endpoint = createEndpoint(request)
  if (endpoint.error) {
    applyNoStore(response)
    response.status(400).json({ error: endpoint.error })
    return
  }

  const apiKey = process.env.BZZOIRO_API_KEY
  if (!apiKey) {
    applyNoStore(response)
    response.status(500).json({ error: 'BZZOIRO_API_KEY no está configurada en el servidor.' })
    return
  }

  try {
    const payload = endpoint.kind === 'theme'
      ? await getProcessedTheme(endpoint.teamId, apiKey)
      : await fetchBsd(endpoint.path, apiKey)
    applyCachePolicy(response, endpoint.policy)
    response.status(200).json(payload)
  } catch (error) {
    applyNoStore(response)
    if (error?.status) {
      response.status(error.status).json(error.payload)
      return
    }
    response.status(502).json({ error: 'No se pudieron obtener los datos deportivos.' })
  }
}
