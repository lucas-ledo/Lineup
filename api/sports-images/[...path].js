import { applyCachePolicy, applyNoStore, CACHE_POLICY } from '../lib/cachePolicy.js'

const IMAGE_BASE_URL = 'https://sports.bzzoiro.com/img'
const ALLOWED_TYPES = new Set(['team', 'player', 'league', 'manager', 'venue'])
const ALLOWED_PARAMETERS = new Set(['bg', 'sor'])

function getPathParts(path) {
  if (Array.isArray(path)) return path
  return typeof path === 'string' ? path.split('/') : []
}

function getImageParameters(query) {
  const parameters = new URLSearchParams()
  ALLOWED_PARAMETERS.forEach((parameter) => {
    const value = query?.[parameter]
    const normalizedValue = Array.isArray(value) ? value[0] : value
    if (typeof normalizedValue === 'string') parameters.set(parameter, normalizedValue)
  })
  return parameters.toString()
}

export default async function handler(request, response) {
  const [type, id] = getPathParts(request.query.path)
  if (!ALLOWED_TYPES.has(type) || !/^\d+$/.test(id || '')) {
    response.status(400).json({ error: 'Ruta de imagen no válida.' })
    return
  }

  const parameters = getImageParameters(request.query)
  const sourceUrl = `${IMAGE_BASE_URL}/${type}/${id}/${parameters ? `?${parameters}` : ''}`

  try {
    const upstream = await fetch(sourceUrl)
    if (!upstream.ok) {
      applyNoStore(response)
      response.status(upstream.status).json({ error: 'La imagen deportiva no está disponible.' })
      return
    }
    const image = Buffer.from(await upstream.arrayBuffer())
    response.status(upstream.status)
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png')
    applyCachePolicy(response, CACHE_POLICY.SPORTS_IMAGE)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.send(image)
  } catch {
    applyNoStore(response)
    response.status(502).json({ error: 'No se pudo obtener la imagen deportiva.' })
  }
}
