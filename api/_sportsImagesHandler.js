import { applyCachePolicy, applyNoStore, CACHE_POLICY } from './lib/cachePolicy.js'

const IMAGE_BASE_URL = 'https://sports.bzzoiro.com/img'
const ALLOWED_TYPES = new Set(['team', 'player', 'league', 'manager', 'venue'])
const ALLOWED_PARAMETERS = new Set(['bg', 'sor'])

function getRequestUrl(request) {
  const host = request.headers?.host || 'localhost'
  return new URL(request.url || '/', `https://${host}`)
}

function getPathParts(request) {
  const rewrittenPath = request.query?.__lineup_path
    ?? request.query?.lineup_path
    ?? getRequestUrl(request).searchParams.get('__lineup_path')
    ?? getRequestUrl(request).searchParams.get('lineup_path')
  const normalizedRewrittenPath = Array.isArray(rewrittenPath) ? rewrittenPath[0] : rewrittenPath
  if (typeof normalizedRewrittenPath === 'string' && normalizedRewrittenPath) {
    return normalizedRewrittenPath.split('/').filter(Boolean)
  }
  const pathname = getRequestUrl(request).pathname
  const relativePath = pathname.replace(/^\/api\/sports-images\/?/, '')
  return relativePath.split('/').filter(Boolean)
}

function getImageParameters(request) {
  const parameters = new URLSearchParams()
  ALLOWED_PARAMETERS.forEach((parameter) => {
    const value = request.query?.[parameter] ?? getRequestUrl(request).searchParams.get(parameter)
    const normalizedValue = Array.isArray(value) ? value[0] : value
    if (typeof normalizedValue === 'string') parameters.set(parameter, normalizedValue)
  })
  return parameters.toString()
}

export default async function handler(request, response) {
  const [type, id] = getPathParts(request)
  if (!ALLOWED_TYPES.has(type) || !/^\d+$/.test(id || '')) {
    response.status(400).json({ error: 'Ruta de imagen no válida.' })
    return
  }

  const parameters = getImageParameters(request)
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
