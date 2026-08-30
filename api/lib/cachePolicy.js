const HOUR = 60 * 60
const DAY = 24 * HOUR

export const CACHE_POLICY = Object.freeze({
  TEAM: { name: 'team', ttl: 365 * DAY, staleWhileRevalidate: 30 * DAY },
  TEAM_THEME: { name: 'team-theme', ttl: 365 * DAY, staleWhileRevalidate: 30 * DAY },
  TEAM_SEARCH: { name: 'team-search', ttl: 30 * DAY, staleWhileRevalidate: 7 * DAY },
  SQUAD_NORMAL: { name: 'squad-normal', ttl: 14 * DAY, staleWhileRevalidate: 7 * DAY },
  SQUAD_MARKET: { name: 'squad-market', ttl: DAY, staleWhileRevalidate: DAY },
  PLAYER: { name: 'player', ttl: 7 * DAY, staleWhileRevalidate: DAY },
  PLAYER_SEARCH: { name: 'player-search', ttl: DAY, staleWhileRevalidate: DAY },
  TRANSFERS: { name: 'transfers', ttl: 12 * HOUR, staleWhileRevalidate: DAY },
  SPORTS_IMAGE: { name: 'sports-image', ttl: 30 * DAY, staleWhileRevalidate: 7 * DAY },
})

export function applyCachePolicy(response, policy) {
  response.setHeader('Cache-Control', `public, max-age=0, s-maxage=${policy.ttl}, stale-while-revalidate=${policy.staleWhileRevalidate}`)
  response.setHeader('X-Lineup-Cache-Policy', policy.name)
  response.setHeader('X-Lineup-Cache-TTL', String(policy.ttl))
}

export function applyNoStore(response) {
  response.setHeader('Cache-Control', 'no-store')
}
