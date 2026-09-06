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
  searchEnabled = true,
  countryFilter = '',
  countries = [],
  onCountryFilterChange,
}) {
  const visiblePlayers = query.trim() ? results : players
  return <aside className="squad-panel player-pool-panel">
    <div className="panel-heading"><div><p className="eyebrow">{label}</p><h2>Jugadores <span>{players.length}</span></h2></div></div>
    {searchEnabled && <form className="pool-search" onSubmit={onSearch}>
      <label htmlFor="player-pool-search">Buscar jugadores reales</label>
      <div><input id="player-pool-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Ej. Aitana, Mbappé, Rodri…" /><button type="submit" disabled={isLoading}>{isLoading ? '…' : 'Buscar'}</button></div>
    </form>}
    {onCountryFilterChange && countries.length > 0 && <label className="pool-country-filter">País <select value={countryFilter} onChange={(event) => onCountryFilterChange(event.target.value)}><option value="">Todos los países</option>{countries.map((country) => <option key={country}>{country}</option>)}</select></label>}
    {message && <p className="market-notice">{message}</p>}
    {!visiblePlayers.length && !isLoading && <div className="empty-state"><span>⚽</span><h3>{query.trim() ? 'Sin resultados' : 'Tu pool está vacío'}</h3><p>{query.trim() ? 'Prueba con otro nombre.' : 'Busca un jugador para empezar tu idea.'}</p></div>}
    {visiblePlayers.length > 0 && <div className="player-list">{visiblePlayers.map((player) => {
      const isUsed = assignedIds.has(player.id)
      const location = Object.values(starters).some((item) => item?.id === player.id) ? 'Titular' : 'Suplente'
      return <article className={`player-card ${isUsed ? 'player-card--used' : ''}`} key={player.id} draggable onDragStart={(event) => onDragStart(event, player)} onDragEnd={onDragEnd}>
        <div className="player-portrait"><Avatar player={player} />{player.club?.logo && <img className="club-crest" src={player.club.logo} alt="" />}</div>
        <div className="player-info"><strong>{player.name}</strong><div className="player-meta"><span className="position-pill">{positionNames[player.position] || player.position}</span><span className="number-pill">#{player.number ?? '—'}</span></div>{[player.club?.name, player.nationality].filter(Boolean).length > 0 && <small className="player-facts">{[player.club?.name, player.nationality].filter(Boolean).join(' · ')}</small>}</div>
        {isUsed ? <span className="added-label">{location}</span> : <div className="player-actions"><button onClick={() => onAddToStarting(player)}>XI</button><button onClick={() => onAddToBench(player)}>Suplente</button></div>}
      </article>
    })}</div>}
  </aside>
}
