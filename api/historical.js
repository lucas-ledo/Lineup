const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123'

function getName(request) {
  const url = new URL(request.url || '/', `https://${request.headers?.host || 'localhost'}`)
  const value = request.query?.name ?? url.searchParams.get('name')
  return typeof value === 'string' ? value.trim() : ''
}

function getPlayerId(request) {
  const url = new URL(request.url || '/', `https://${request.headers?.host || 'localhost'}`)
  const value = request.query?.playerId ?? url.searchParams.get('playerId')
  return typeof value === 'string' && /^\d+$/.test(value) ? value : null
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Método no permitido.' })
    return
  }
  const playerId = getPlayerId(request)
  const name = getName(request)
  if (!playerId && name.length < 2) {
    response.status(400).json({ error: 'Indica al menos 2 caracteres.' })
    return
  }

  try {
    const path = playerId ? `/lookupformerteams.php?id=${playerId}` : `/searchplayers.php?p=${encodeURIComponent(name)}`
    const upstream = await fetch(`${BASE_URL}${path}`)
    const payload = await upstream.json()
    if (!upstream.ok) throw new Error('THE_SPORTS_DB_ERROR')
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400')
    response.status(200).json(payload)
  } catch {
    response.status(502).json({ error: 'No se pudieron obtener jugadores históricos.' })
  }
}
