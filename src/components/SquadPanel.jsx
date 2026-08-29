import { positionNames } from '../data'
import { Avatar } from './Avatar'

export function SquadPanel({
  team,
  players,
  visiblePlayers,
  positionFilter,
  isLoading,
  assignedIds,
  saleDraft,
  onFilterChange,
  onResetLineup,
  onAddToStarting,
  onAddToBench,
  onDragStart,
  onDragEnd,
  onSaleDraftChange,
  onConfirmSale,
}) {
  const hasLineup = assignedIds.size > 0

  return <aside className="squad-panel">
    <div className="panel-heading"><div><p className="eyebrow">{team ? team.name.toUpperCase() : 'PLANTILLA'}</p><h2>Jugadores <span>{players.length ? `${visiblePlayers.length}/${players.length}` : '—'}</span></h2></div><button className="text-button" onClick={onResetLineup} disabled={!hasLineup}>Limpiar</button></div>
    {team && players.length > 0 && <div className="position-filters" aria-label="Filtrar jugadores por posición">{[['All', 'Todos'], ...Object.entries(positionNames)].map(([value, label]) => <button key={value} className={positionFilter === value ? 'is-active' : ''} onClick={() => onFilterChange(value)}>{label}</button>)}</div>}
    {!team && <div className="empty-state"><span>⚽</span><h3>Empieza por un equipo</h3><p>Busca arriba para cargar su plantilla actual desde la API.</p></div>}
    {team && isLoading && <div className="empty-state"><span className="loader" /><h3>Cargando plantilla</h3><p>Estamos preparando los jugadores disponibles.</p></div>}
    {team && !isLoading && players.length > 0 && <div className="player-list">{visiblePlayers.map((player) => {
      const isUsed = assignedIds.has(player.id)
      const playerLocation = Object.values(starters).some((item) => item?.id === player.id) ? 'Titular' : 'Suplente'
      const isEditingSale = saleDraft?.player.id === player.id

      return <article className={`player-card ${isUsed ? 'player-card--used' : ''}`} key={player.id} draggable onDragStart={(event) => onDragStart(event, player)} onDragEnd={onDragEnd}>
        <div className="player-portrait"><Avatar player={player} /><img className="club-crest" src={player.club?.logo || team.logo} alt={`Escudo de ${player.club?.name || team.name}`} /></div>
        <div className="player-info"><strong>{player.name}</strong><div className="player-meta"><span className="position-pill">{positionNames[player.position] || player.position}</span><span className="number-pill">#{player.number ?? '—'}</span></div></div>
        {isUsed ? <span className="added-label">{playerLocation}</span> : <div className="player-actions"><button onClick={() => onAddToStarting(player)} title="Añadir al once">+11</button><button onClick={() => onAddToBench(player)} title="Añadir al banquillo">+S</button></div>}
        {isEditingSale ? <div className="sale-editor"><label>€<input autoFocus type="number" min="1" step="1" value={saleDraft.price} onChange={(event) => onSaleDraftChange((current) => ({ ...current, price: event.target.value }))} aria-label={`Precio de venta de ${player.name} en euros`} /></label><button onClick={onConfirmSale}>Confirmar</button><button onClick={() => onSaleDraftChange(null)}>×</button></div> : <button className="sale-trigger" onClick={() => onSaleDraftChange({ player, price: '' })}>Vender</button>}
      </article>
    })}{visiblePlayers.length === 0 && <p className="no-filter-results">No hay jugadores de esta posición en la plantilla.</p>}</div>}
  </aside>
}
