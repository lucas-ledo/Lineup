import { formatSquadCount } from '../utils/formatters'

export function AppHeader({ onReset }) {
  return <>
    <div className="editorial-topline"><span>UN LUGAR PARA PENSAR EN FÚTBOL</span><span>ONCE JUGADORES. INFINITAS CONVERSACIONES.</span></div>
    <header className="topbar editorial-header">
      <a className="brand" href="/" aria-label="LineUp, inicio"><span>lineup</span><i>●</i></a>
      <p className="headernote">El fútbol<br /><em>a tu manera.</em></p>
      <button className="outline" type="button" onClick={onReset}>Nuevo once <span>＋</span></button>
    </header>
  </>
}

export function EditorialIntro({ team, startersCount, subsCount }) {
  return <section className="hero editorial-hero">
    <div className="hero-copy"><p className="eyebrow"><span>LA PIZARRA</span> / EDICIÓN LIBRE</p><h1>El mejor once es <em>el tuyo.</em></h1><p className="hero-text">Mueve las piezas. Elige a tus jugadores. Defiende tu idea.</p></div>
    <div className="edition" aria-label={`${startersCount} titulares y ${subsCount} suplentes`}>Nº <strong>{formatSquadCount(startersCount)}</strong><span>{team?.name || 'EL JUEGO EMPIEZA AQUÍ'}</span></div>
  </section>
}
