export function NationalTeamPicker({ query, teams, selectedTeam, isLoading, onQueryChange, onSearch, onSelect }) {
  return <section className="team-picker" aria-label="Selecciona un país">
    <div className="picker-index" aria-hidden="true"><b>03</b><span>SELECCIÓN</span></div>
    <form onSubmit={onSearch} className="search-form">
      <label htmlFor="national-team-search">Elige un país</label>
      <div className="search-row"><input id="national-team-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Escribe un país: España, Brasil…" autoComplete="off" /><button className="button button--primary" type="submit" disabled={isLoading}>{isLoading ? 'Cargando…' : 'Crear convocatoria'}</button></div>
    </form>
    {selectedTeam && <div className="selected-team"><span className="selected-team-label">País activo</span><div className="selected-team-value"><img src={selectedTeam.logo} alt="" /><span>{selectedTeam.name}</span></div></div>}
    {teams.length > 0 && <div className="team-results">{teams.map((item) => <button className="team-result" key={item.team.id} onClick={() => onSelect(item)}><img src={item.team.logo} alt="" /><span>{item.country}</span><small>Selección absoluta</small></button>)}</div>}
  </section>
}
