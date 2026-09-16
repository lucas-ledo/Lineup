import { memo } from 'react'
import { positionNames } from '../data'
import { formatValue } from '../utils/transferValues'
import { Avatar } from './Avatar'

function SquadPanelView({
  children,
  team,
  players,
  visiblePlayers,
  positionFilter,
  playerQuery,
  squadMetrics,
  isLoading,
  assignedIds,
  starters,
  saleDraft,
  saleQuote,
  onFilterChange,
  onPlayerQueryChange,
  onResetLineup,
  onClearFilters,
  onAddToStarting,
  onAddToBench,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onStartSale,
  onCancelSale,
  onConfirmSale,
}) {
  const hasLineup = assignedIds.size > 0

  return <section className="lineup-squad-panel">
    <div className="lineup-pool-heading"><div><p>EL VESTUARIO</p><h2>¿Quién juega?</h2><span>{team ? 'Arrastra una tarjeta al campo o usa el botón +.' : 'Elige un club para consultar su plantilla.'}</span></div><details className="lineup-roster-menu"><summary aria-label="Opciones del vestuario">•••</summary><div>{squadMetrics && squadMetrics.totalValue !== null && <span>Valor {formatValue(squadMetrics.totalValue)}</span>}{squadMetrics && squadMetrics.averageAge !== null && <span>Edad {squadMetrics.averageAge.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</span>}<button onClick={onClearFilters} disabled={!playerQuery && positionFilter === 'All'}>Limpiar filtros</button><button onClick={onResetLineup} disabled={!hasLineup}>Vaciar alineación</button></div></details></div>
    {children}
    {team && players.length > 0 && <div className="lineup-squad-controls"><label htmlFor="squad-player-search">⌕</label><input id="squad-player-search" value={playerQuery} onChange={(event) => onPlayerQueryChange(event.target.value)} placeholder="Buscar un jugador…" aria-label="Buscar en plantilla" /><kbd>/</kbd></div>}
    {team && players.length > 0 && <div className="lineup-position-filters" aria-label="Filtrar jugadores por posición">{[['All', 'Todos'], ...Object.entries(positionNames)].map(([value, label]) => <button key={value} className={positionFilter === value ? 'is-active' : ''} onClick={() => onFilterChange(value)}>{value === 'All' ? label : label.slice(0, 3).toUpperCase()}</button>)}</div>}
    {team && players.length > 0 && <div className="lineup-results-count"><span>{visiblePlayers.length} RESULTADOS</span><span>ARRASTRA O AÑADE</span></div>}
    {!team && <div className="lineup-empty-state"><span>⚽</span><h3>Empieza por un equipo</h3><p>Busca arriba para cargar su plantilla actual desde la API.</p></div>}
    {team && isLoading && <div className="lineup-empty-state"><span className="loader" /><h3>Cargando plantilla</h3><p>Estamos preparando los jugadores disponibles.</p></div>}
    {team && !isLoading && players.length > 0 && visiblePlayers.length === 0 && <div className="lineup-empty-state"><span>⚽</span><h3>Sin resultados</h3><p>No hay jugadores que coincidan con la búsqueda y los filtros actuales.</p><button onClick={onClearFilters}>Limpiar filtros</button></div>}
    {team && !isLoading && players.length > 0 && visiblePlayers.length > 0 && <div className="lineup-player-list">{visiblePlayers.map((player) => {
      const isUsed = assignedIds.has(player.id)
      const playerLocation = Object.values(starters).some((item) => item?.id === player.id) ? 'Titular' : 'Suplente'
      const isEditingSale = saleDraft?.player.id === player.id
      const playerFacts = [
        player.age !== null && player.age !== undefined ? `${player.age} años` : null,
        player.nationality || null,
      ].filter(Boolean)
      const hasValuation = typeof player.marketValue === 'number' || typeof player.releaseClause === 'number'

      return <article className={`lineup-player-card ${isUsed ? 'is-used' : ''}`} data-number={String(player.number ?? '').padStart(2, '0')} key={player.id} onPointerDown={(event) => onPointerDown?.(event, player)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
        <span className="lineup-player-card__position">{player.position === 'Goalkeeper' ? 'POR' : player.position === 'Defender' ? 'DEF' : player.position === 'Midfielder' ? 'MED' : 'DEL'}</span>
        <div className="lineup-player-card__portrait"><Avatar player={player} /></div>
        <div className="lineup-player-card__copy"><strong>{player.name}</strong>{playerFacts.length > 0 && <small>{playerFacts.join(' · ')}</small>}{hasValuation && <small>VM {formatValue(player.marketValue)}</small>}</div>
        {isUsed ? <span className="lineup-player-card__added" aria-label={playerLocation}>✓</span> : <button className="lineup-player-card__add" onClick={() => onAddToStarting(player)} aria-label={`Añadir a ${player.name} al once`}>+</button>}
        <details className="lineup-player-card__menu"><summary aria-label={`Más acciones para ${player.name}`}>⠿</summary><div>{!isUsed && <button onClick={() => onAddToBench(player)}>Añadir al banquillo</button>}<button onClick={() => onStartSale(player)}>Vender</button></div></details>
        {isEditingSale && <div className="lineup-sale-editor" aria-live="polite"><strong>{saleDraft.loading ? 'Calculando…' : `${saleQuote.label}: ${formatValue(saleQuote.amount)}`}</strong><small>{!saleDraft.loading && saleQuote.detail}</small><div><button disabled={saleDraft.loading || !saleQuote.available} onClick={onConfirmSale}>Confirmar</button><button onClick={onCancelSale}>Cancelar</button></div></div>}
      </article>
    })}</div>}
    {team && <div className="lineup-source-note">Una nueva piel para LineUp.<br /><span>Plantilla conectada a datos reales; el diseño mantiene la lectura editorial.</span></div>}
  </section>
}

function sameSquadPanelProps(previous, next) {
  return previous.children === next.children
    && previous.team === next.team
    && previous.players === next.players
    && previous.visiblePlayers === next.visiblePlayers
    && previous.positionFilter === next.positionFilter
    && previous.playerQuery === next.playerQuery
    && previous.squadMetrics === next.squadMetrics
    && previous.isLoading === next.isLoading
    && previous.assignedIds === next.assignedIds
    && previous.starters === next.starters
    && previous.saleDraft === next.saleDraft
    && previous.saleQuote === next.saleQuote
}

export const SquadPanel = memo(SquadPanelView, sameSquadPanelProps)
