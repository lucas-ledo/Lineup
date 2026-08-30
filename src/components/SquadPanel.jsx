import { positionNames } from '../data'
import { formatValue } from '../utils/transferValues'
import { Avatar } from './Avatar'

export function SquadPanel({
  team,
  players,
  visiblePlayers,
  positionFilter,
  isLoading,
  assignedIds,
  starters,
  saleDraft,
  saleQuote,
  onFilterChange,
  onResetLineup,
  onAddToStarting,
  onAddToBench,
  onDragStart,
  onDragEnd,
  onStartSale,
  onCancelSale,
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
      const playerFacts = [
        player.age !== null && player.age !== undefined ? `${player.age} años` : null,
        player.nationality || null,
      ].filter(Boolean)
      const hasValuation = typeof player.marketValue === 'number' || typeof player.releaseClause === 'number'

      return <article className={`player-card ${isUsed ? 'player-card--used' : ''}`} key={player.id} draggable onDragStart={(event) => onDragStart(event, player)} onDragEnd={onDragEnd}>
        <div className="player-portrait"><Avatar player={player} /><img className="club-crest" src={player.club?.logo || team.logo} alt={`Escudo de ${player.club?.name || team.name}`} /></div>
        <div className="player-info"><strong>{player.name}</strong><div className="player-meta"><span className="position-pill">{positionNames[player.position] || player.position}</span><span className="number-pill">#{player.number ?? '—'}</span></div>{playerFacts.length > 0 && <small className="player-facts">{playerFacts.join(' · ')}</small>}{hasValuation && <small className="player-value">VM {formatValue(player.marketValue)}{typeof player.releaseClause === 'number' ? ` · Cláusula ${formatValue(player.releaseClause)}` : ''}</small>}</div>
        {isUsed ? <span className="added-label">{playerLocation}</span> : <div className="player-actions"><button onClick={() => onAddToStarting(player)} title="Añadir al once">+11</button><button onClick={() => onAddToBench(player)} title="Añadir al banquillo">+S</button></div>}
        {isEditingSale ? <div className="sale-editor" aria-live="polite"><strong>{saleDraft.loading ? 'Calculando…' : `${saleQuote.label}: ${formatValue(saleQuote.amount)}`}</strong><small>VM {formatValue(saleQuote.marketValue)}{saleQuote.releaseClause !== null ? ` · Cláusula ${formatValue(saleQuote.releaseClause)}` : ''}{saleQuote.contractYears !== null ? ` · ${saleQuote.contractYears === 0 ? 'Contrato vencido' : `${saleQuote.contractYears} años de contrato`}` : ''}</small><small>{!saleDraft.loading && saleQuote.detail}</small><div><button disabled={saleDraft.loading || !saleQuote.available} onClick={onConfirmSale}>Confirmar venta</button><button onClick={onCancelSale} aria-label="Cancelar venta">×</button></div></div> : <button className="sale-trigger" onClick={() => onStartSale(player)}>Vender</button>}
      </article>
    })}{visiblePlayers.length === 0 && <p className="no-filter-results">No hay jugadores de esta posición en la plantilla.</p>}</div>}
  </aside>
}
