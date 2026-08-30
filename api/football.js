import handler from './football/[...path].js'

// Punto de entrada estable para los rewrites de Vercel. El handler compartido
// sigue siendo responsable de validar y despachar cada ruta de fútbol.
export default handler
