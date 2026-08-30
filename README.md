# Lineup Lab

Aplicación React para crear un once titular y 11 suplentes a partir de la plantilla actual de un club. Incluye mercado de fichajes, ventas, arrastrar y soltar, temas claro/oscuro y exportación de la alineación como imagen.

## Puesta en marcha

1. Instala las dependencias con `pnpm install`.
2. Crea un archivo `.env` a partir de `.env.example` y añade `BZZOIRO_API_KEY`. No uses el prefijo `VITE_`: esta clave solo se lee en las funciones serverless y en el proxy de desarrollo.
3. Ejecuta `pnpm dev`.

Para verificar la versión de producción: `pnpm run build`.

## Estructura

```
src/
  components/   Vistas reutilizables: cabecera, selector, campo, plantilla, mercado y banquillo.
  utils/        Formateo de importes, dorsales e iniciales.
  api.js        Cliente relativo de nuestra API y normalización de respuestas.
api/            Funciones serverless: fútbol autenticado e imágenes para capturas sin CORS.
  data.js       Formaciones y etiquetas de posición.
  teamTheme.js  Paleta dinámica según el club seleccionado.
  App.jsx       Estado de aplicación y reglas de negocio.
```

## Convenciones

- `App.jsx` no contiene marcado de secciones grandes; coordina estado y eventos.
- Cada componente recibe datos y callbacks explícitos.
- `pnpm-lock.yaml` es el único lockfile del repositorio.

-----
