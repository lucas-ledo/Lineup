import { positionNames } from '../data'
import { Avatar } from './Avatar'

export function PlayerPoolPanel({
  label = 'POOL DE JUGADORES',
  players,
  results,
  query,
  isLoading,
  message,
  assignedIds,
  starters,
  onQueryChange,
  onSearch,
  onAddToStarting,
  onAddToBench,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  searchEnabled = true,
  searchLabel = 'Buscar jugadores reales',
  countryFilter = '',
  countries = [],
  onCountryFilterChange,
}) {
  const visiblePlayers = query.trim() ? results : players
  return <section className="lineup-squad-panel">
    <div className="lineup-pool-heading"><div><p>EL VESTUARIO</p><h2>¿Quién juega?</h2><span>{label}</span></div></div>
    {searchEnabled && <form className="lineup-pool-search" onSubmit={onSearch}>
      <label htmlFor="player-pool-search">{searchLabel}</label>
      <div><input id="player-pool-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Ej. Aitana, Mbappé, Rodri…" /><button type="submit" disabled={isLoading}>{isLoading ? '…' : 'Buscar'}</button></div>
    </form>}
    {onCountryFilterChange && countries.length > 0 && <label className="lineup-country-filter">País <select value={countryFilter} onChange={(event) => onCountryFilterChange(event.target.value)}><option value="">Todos los países</option>{countries.map((country) => <option key={country}>{country}</option>)}</select></label>}
    {message && <p className="lineup-market-notice">{message}</p>}
    {!visiblePlayers.length && !isLoading && <div className="lineup-empty-state"><span>⚽</span><h3>{query.trim() ? 'Sin resultados' : 'Tu pool está vacío'}</h3><p>{query.trim() ? 'Prueba con otro nombre.' : 'Busca un jugador para empezar tu idea.'}</p></div>}
    {visiblePlayers.length > 0 && <><div className="lineup-results-count"><span>{visiblePlayers.length} RESULTADOS</span><span>ARRASTRA O AÑADE</span></div><div className="lineup-player-list">{visiblePlayers.map((player) => {
      const isUsed = assignedIds.has(player.id)
      const location = Object.values(starters).some((item) => item?.id === player.id) ? 'Titular' : 'Suplente'
      return <article className={`lineup-player-card ${isUsed ? 'is-used' : ''}`} data-number={String(player.number ?? '').padStart(2, '0')} key={player.id} onPointerDown={(event) => onPointerDown?.(event, player)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
        <span className="lineup-player-card__position">{player.position === 'Goalkeeper' ? 'POR' : player.position === 'Defender' ? 'DEF' : player.position === 'Midfielder' ? 'MED' : 'DEL'}</span>
        <div className="lineup-player-card__portrait"><Avatar player={player} /></div>
        <div className="lineup-player-card__copy"><strong>{player.name}</strong><small>{[player.club?.name, player.nationality].filter(Boolean).join(' · ')}</small></div>
        {isUsed ? <span className="lineup-player-card__added" aria-label={location}>✓</span> : <button className="lineup-player-card__add" onClick={() => onAddToStarting(player)} aria-label={`Añadir a ${player.name} al once`}>+</button>}
        {!isUsed && <details className="lineup-player-card__menu"><summary aria-label={`Más acciones para ${player.name}`}>⠿</summary><div><button onClick={() => onAddToBench(player)}>Añadir al banquillo</button></div></details>}
      </article>
    })}</div></>}
  </section>
}
