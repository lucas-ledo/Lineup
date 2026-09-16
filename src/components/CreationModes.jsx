const modes = [
  { id: 'current-team', title: 'Desde un club' },
  { id: 'custom', title: 'Desde cero' },
  { id: 'national-team', title: 'Selección' },
]

export function CreationModes({ activeMode, onSelect }) {
  return <nav className="creation-modes" aria-label="Modo de creación">
    {modes.map((mode) => <button key={mode.id} className={`creation-mode ${activeMode === mode.id ? 'is-active' : ''}`} onClick={() => onSelect(mode.id)}>{mode.title}</button>)}
    <span className="creation-modes__note">LA PIZARRA ES TUYA ↙</span>
  </nav>
}
