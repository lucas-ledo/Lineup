export function TeamPicker({ query, teams, selectedTeam, isLoading, onQueryChange, onSearch, onSelectTeam, onClearTeam }) {
  return <section className={`team-picker ${selectedTeam ? 'team-picker--chosen' : ''}`} aria-label="Selecciona un equipo">
    <div className="picker-index" aria-hidden="true"><b>01</b><span>CLUB</span></div>
    <form onSubmit={onSearch} className="search-form">
      <label htmlFor="team-search">Abre una plantilla</label>
      <div className="search-row">
        <input id="team-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Escribe un club: Real Madrid, Arsenal..." autoComplete="off" />
        <button className="button button--primary" type="submit" disabled={isLoading}>{isLoading ? 'Buscando...' : 'Ver plantilla'}</button>
      </div>
    </form>
    {selectedTeam && <div className="selected-team"><span className="selected-team-label">Equipo seleccionado</span><div className="selected-team-value"><img src={selectedTeam.logo} alt="" /><span>{selectedTeam.name}</span><button onClick={onClearTeam} aria-label="Cambiar de equipo">×</button></div></div>}
    {teams.length > 0 && <div className="team-results">{teams.map((item) => <button className="team-result" key={item.team.id} onClick={() => onSelectTeam(item)}><img src={item.team.logo} alt="" /><span>{item.team.name}</span><small>{item.venue?.name || item.country}</small></button>)}</div>}
  </section>
}
