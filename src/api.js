const BASE_URL = 'https://sports.bzzoiro.com/api/v2'
const IMAGE_BASE_URL = 'https://sports.bzzoiro.com/img'

const positionMap = {
  G: 'Goalkeeper',
  D: 'Defender',
  M: 'Midfielder',
  F: 'Attacker',
}

function getApiKey() {
  return import.meta.env.VITE_BZZOIRO_API_KEY
}

function getImageUrl(type, id, query = '') {
  return id ? `${IMAGE_BASE_URL}/${type}/${id}/${query}` : null
}

function getErrorMessage(payload) {
  if (typeof payload?.detail === 'string') return payload.detail
  if (typeof payload?.message === 'string') return payload.message
  if (typeof payload?.error === 'string') return payload.error
  if (Array.isArray(payload?.errors)) return payload.errors[0]
  return 'No se pudieron obtener los datos deportivos.'
}

async function request(path) {
  const apiKey = getApiKey()
  if (!apiKey || apiKey === 'tu_token_de_bzzoiro') {
    throw new Error('Añade VITE_BZZOIRO_API_KEY en tu archivo .env para consultar Sports Data Hub.')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Token ${apiKey}` },
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) throw new Error(getErrorMessage(payload))
  return payload
}

function getResults(payload) {
  if (Array.isArray(payload)) return payload
  return payload?.results || payload?.players || payload?.squad || []
}

function normalizeTeam(team) {
  const id = team.id ?? team.team_id
  return {
    id,
    name: team.name || team.short_name || 'Equipo sin nombre',
    logo: getImageUrl('team', id, '?bg=transparent'),
  }
}

function normalizePosition(position) {
  if (positionMap[position]) return positionMap[position]
  if (position === 'Goalkeeper' || position === 'Defender' || position === 'Midfielder' || position === 'Attacker') return position
  return 'Unknown'
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
  }
}

export async function searchTeams(query) {
  const payload = await request(`/teams/?name=${encodeURIComponent(query)}&limit=8`)
  return getResults(payload).map((team) => ({
    team: normalizeTeam(team),
    venue: team.venue ? { name: team.venue.name } : null,
    country: team.country?.name || team.country_name || team.country_code || '',
  }))
}

export async function getSquad(teamId) {
  const payload = await request(`/teams/${teamId}/squad/`)
  const players = getResults(payload).map((player) => normalizePlayer(player))
  return { players }
}

export async function searchPlayers(query) {
  const payload = await request(`/players/?name=${encodeURIComponent(query)}&limit=20`)
  const uniquePlayers = new Map()

  getResults(payload).forEach((player) => {
    const normalized = normalizePlayer(player)
    if (normalized.id && !uniquePlayers.has(normalized.id)) uniquePlayers.set(normalized.id, normalized)
  })

  return [...uniquePlayers.values()]
}
