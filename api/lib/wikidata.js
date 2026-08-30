const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql'
const WIKIDATA_TIMEOUT_MS = 5_000

function normalizeName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function getNameVariants(teamName) {
  const original = teamName?.trim()
  const normalized = normalizeName(teamName)
  const variants = new Set([original, normalized])

  if (/\bde a\b/i.test(normalized)) variants.add(normalized.replace(/\bde a\b/i, 'de la'))
  if (/\bde la\b/i.test(normalized)) variants.add(normalized.replace(/\bde la\b/i, 'de a'))

  return [...variants].filter(Boolean).slice(0, 3)
}

function escapeSparqlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function createQuery(teamName) {
  const search = escapeSparqlString(teamName)
  return `
    SELECT ?club ?clubLabel ?hex WHERE {
      SERVICE wikibase:mwapi {
        bd:serviceParam wikibase:api "EntitySearch";
                        wikibase:endpoint "www.wikidata.org";
                        mwapi:search "${search}";
                        mwapi:language "es";
                        mwapi:limit "5".
        ?club wikibase:apiOutputItem mwapi:item.
      }
      ?club wdt:P462 ?colour.
      ?colour wdt:P465 ?hex.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 20
  `
}

function normalizeColor(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (!match) return null
  const hex = match.length === 3 ? match.split('').map((part) => `${part}${part}`).join('') : match
  return `#${hex.toLowerCase()}`
}

async function queryWikidata(teamName) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WIKIDATA_TIMEOUT_MS)

  try {
    const url = new URL(WIKIDATA_SPARQL_URL)
    url.searchParams.set('format', 'json')
    url.searchParams.set('query', createQuery(teamName))
    const response = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'LineupMaker/1.0 (club theme lookup)',
      },
      signal: controller.signal,
    })
    if (!response.ok) return []
    const payload = await response.json()
    return payload?.results?.bindings || []
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

export async function getClubColorsFromWikidata(teamName) {
  for (const variant of getNameVariants(teamName)) {
    const bindings = await queryWikidata(variant)
    const colors = [...new Set(bindings.map((binding) => normalizeColor(binding?.hex?.value)).filter(Boolean))]
    if (colors.length) {
      return {
        primary: colors[0],
        secondary: colors[1] || null,
        source: 'wikidata',
      }
    }
  }

  return null
}
