export function HistoricalScopePicker({ kind, value, onChange, onConfirm }) {
  const isCountry = kind === 'country'
  return <section className="team-picker" aria-label={isCountry ? 'Configura el país histórico' : 'Configura el club histórico'}>
    <div className="picker-index" aria-hidden="true"><b>{isCountry ? '05' : '06'}</b><span>HISTÓRICO</span></div>
    <form onSubmit={onConfirm} className="search-form">
      <label htmlFor="historical-scope">{isCountry ? 'País de los jugadores históricos' : 'Club en el que debieron jugar'}</label>
      <div className="search-row"><input id="historical-scope" value={value} onChange={(event) => onChange(event.target.value)} placeholder={isCountry ? 'Ej. Argentina, Francia, Brasil…' : 'Ej. Real Madrid, Milan, Boca Juniors…'} autoComplete="off" /><button className="button button--primary" type="submit">Continuar</button></div>
    </form>
  </section>
}
