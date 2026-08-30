import { defineConfig, loadEnv } from 'vite'

function withTrailingSlash(path) {
  const [pathname, query] = path.split('?')
  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`
  return query ? `${normalizedPath}?${query}` : normalizedPath
}

function rewriteFootballPath(path) {
  const [pathname, query = ''] = path.replace(/^\/api\/football/, '').split('?')
  const parameters = new URLSearchParams(query)
  // `context` clasifica la caché de nuestra Function; BSD no reconoce ese filtro.
  parameters.delete('context')
  const normalizedQuery = parameters.toString()
  return withTrailingSlash(`${pathname}${normalizedQuery ? `?${normalizedQuery}` : ''}`)
}

export default defineConfig(({ mode }) => {
  // loadEnv se ejecuta solo en el proceso de Vite; BZZOIRO_API_KEY nunca se
  // inyecta en import.meta.env ni se envía al navegador.
  const { BZZOIRO_API_KEY: apiKey } = loadEnv(mode, process.cwd(), '')

  return {
    server: {
      proxy: {
        '/api/sports-images': {
          target: 'https://sports.bzzoiro.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sports-images/, '/img'),
        },
        '/api/football': {
          target: 'https://sports.bzzoiro.com/api/v2',
          changeOrigin: true,
          headers: apiKey ? { Authorization: `Token ${apiKey}` } : undefined,
          rewrite: rewriteFootballPath,
        },
      },
    },
  }
})
