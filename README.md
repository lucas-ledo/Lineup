# Lineup Lab

## Modelo de alineación

El editor usa un único modelo `Lineup` (`src/domain/lineup.js`): `type`, `context` opcional, `formation`, `playerPool`, `starters` y `bench`. `Player` mantiene los datos del proveedor; un participante de la alineación solo guarda `playerId`, rol y, para titulares, `slotId`. Una alineación no depende de un `teamId` y puede representar club actual, creación libre o selección.

Los modos activos son equipo actual, creación desde cero y selección/convocatoria. La convocatoria parte de los jugadores llamados por la selección, pero permite buscar y añadir cualquier jugador de ese país. BSD mantiene los datos de equipos, jugadores y convocatorias.

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
