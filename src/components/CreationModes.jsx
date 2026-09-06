const modes = [
  { id: 'current-team', index: '01', title: 'Crear desde un equipo', description: 'Parte del último XI oficial y de su plantilla actual.', available: true },
  { id: 'custom', index: '02', title: 'Crear desde cero', description: 'Elige una formación y busca jugadores reales.', available: true },
  { id: 'national-team', index: '03', title: 'Selección / convocatoria', description: 'Construye una lista, un XI y su banquillo.', available: true },
  { id: 'historical-free', index: '04', title: 'XI histórico', description: 'Busca leyendas y construye tu once.', available: true },
  { id: 'historical-country', index: '05', title: 'Histórico por país', description: 'Solo admite jugadores de ese país.', available: true },
  { id: 'historical-club', index: '06', title: 'Histórico por club', description: 'Valida que hayan jugado en ese club.', available: true },
]

export function CreationModes({ activeMode, onSelect }) {
  return <nav className="creation-modes" aria-label="Modo de creación">
    {modes.map((mode) => <button key={mode.id} className={`creation-mode ${activeMode === mode.id ? 'is-active' : ''}`} onClick={() => onSelect(mode.id)}>
      <span>{mode.index}</span><strong>{mode.title}</strong><small>{mode.available ? mode.description : 'Próximamente · faltan datos históricos en el proveedor actual.'}</small>
    </button>)}
  </nav>
}
