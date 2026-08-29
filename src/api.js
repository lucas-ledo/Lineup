const BASE_URL = 'https://v3.football.api-sports.io'

function getKey() {
  return import.meta.env.VITE_API_FOOTBALL_KEY
}

async function request(path) {
  const apiKey = getKey()
  if (!apiKey || apiKey === 'tu_clave_api_football') {
    throw new Error('Añade VITE_API_FOOTBALL_KEY en tu archivo .env para consultar la API.')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-apisports-key': apiKey },
  })
  const data = await response.json()

  const apiErrors = data.errors ? Object.values(data.errors).flat().filter(Boolean) : []
  if (!response.ok || apiErrors.length) {
    throw new Error(String(apiErrors[0] || 'No se pudieron obtener los datos de la API.'))
  }
  return data.response
}

export async function searchTeams(query) {
  return request(`/teams?search=${encodeURIComponent(query)}`)
}

export async function getSquad(teamId) {
  const squads = await request(`/players/squads?team=${teamId}`)
  return squads[0] || null
}

export async function searchPlayers(query) {
  const year = new Date().getFullYear()
  const season = new Date().getMonth() < 6 ? year - 1 : year
  const results = await request(`/players?search=${encodeURIComponent(query)}&season=${season}`)
  const uniquePlayers = new Map()

  results.forEach(({ player, statistics = [] }) => {
    if (!player || uniquePlayers.has(player.id)) return
    const currentClub = statistics[0]?.team
    uniquePlayers.set(player.id, {
      id: player.id,
      name: player.name,
      photo: player.photo,
      position: statistics[0]?.games?.position || 'Unknown',
      number: player.number,
      club: currentClub,
    })
  })
  return [...uniquePlayers.values()]
}
