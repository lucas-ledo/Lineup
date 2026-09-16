export function TeamPicker({ query, teams, selectedTeam, isLoading, onQueryChange, onSearch, onSelectTeam, onClearTeam }) {
  return <section className={`lineup-team-picker ${selectedTeam ? 'is-chosen' : ''}`} aria-label="Selecciona un equipo">
    <form onSubmit={onSearch} className="lineup-team-search">
      <label htmlFor="team-search">Elige un club para crear tu XI</label>
      <div className="lineup-team-search__row">
        <input id="team-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Escribe un club: Real Madrid, Arsenal..." autoComplete="off" />
        <button type="submit" disabled={isLoading}>{isLoading ? 'Buscando...' : 'Crear XI'}</button>
      </div>
    </form>
    {selectedTeam && <div className="lineup-selected-team"><span>PLANTILLA ACTUAL</span><button type="button" onClick={onClearTeam} aria-label="Cambiar de equipo"><strong>{selectedTeam.name} · plantilla</strong><i>⌄</i></button></div>}
    {teams.length > 0 && <div className="lineup-team-results">{teams.map((item) => <button className="lineup-team-result" key={item.team.id} onClick={() => onSelectTeam(item)}><img src={item.team.logo} alt="" /><span>{item.team.name}</span><small>{item.team.isWomen && <b>Femenino</b>}{item.venue?.name || item.country}</small></button>)}</div>}
  </section>
}
