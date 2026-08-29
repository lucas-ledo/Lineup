# Lineup Lab

Aplicación React para crear un once titular y 11 suplentes a partir de la plantilla actual de un club. Incluye mercado de fichajes, ventas, arrastrar y soltar, temas claro/oscuro y exportación de la alineación como imagen.

## Puesta en marcha

1. Instala las dependencias con `pnpm install`.
2. Crea un archivo `.env` a partir de `.env.example` y añade `VITE_BZZOIRO_API_KEY`.
3. Ejecuta `pnpm dev`.

Para verificar la versión de producción: `pnpm run build`.

## Estructura

```
src/
  components/   Vistas reutilizables: cabecera, selector, campo, plantilla, mercado y banquillo.
  utils/        Formateo de importes, dorsales e iniciales.
  api.js        Cliente de Sports Data Hub (Bzzoiro) y normalización de respuestas.
api/            Proxy de imágenes para que fotos y escudos puedan capturarse sin CORS en Vercel.
  data.js       Formaciones y etiquetas de posición.
  teamTheme.js  Paleta dinámica según el club seleccionado.
  App.jsx       Estado de aplicación y reglas de negocio.
```

## Convenciones

- `App.jsx` no contiene marcado de secciones grandes; coordina estado y eventos.
- Cada componente recibe datos y callbacks explícitos.
- `pnpm-lock.yaml` es el único lockfile del repositorio.
