import { formatSquadCount } from '../utils/formatters'

export function AppHeader({ team, startersCount, subsCount, theme, onThemeChange }) {
  return <>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Lineup, inicio">
        <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 42 30" fill="none"><path d="M2 6h12l6 9 6-9h14M2 24h12l6-9 6 9h14" stroke="currentColor" strokeWidth="3" strokeLinecap="square" /><circle cx="20" cy="15" r="3" fill="currentColor" /></svg></span>
        <span>lineup</span><i>LAB</i>
      </a>
      <div className="topbar-copy"><span className="live-dot" /> SISTEMA DE PIZARRA <b>01/11</b></div>
      <div className="topbar-actions">
        <a className="api-link" href="https://www.api-football.com/documentation-v3" target="_blank" rel="noreferrer">DATA FEED</a>
        <div className="theme-switcher" aria-label="Apariencia">
          <button className={theme === 'light' ? 'is-active' : ''} onClick={() => onThemeChange('light')} aria-pressed={theme === 'light'}>CLARO</button>
          <button className={theme === 'dark' ? 'is-active' : ''} onClick={() => onThemeChange('dark')} aria-pressed={theme === 'dark'}>OSCURO</button>
        </div>
      </div>
    </header>

    <section className="hero">
      <div className="hero-rail" aria-hidden="true"><span>LINEUP LAB</span><b>01</b></div>
      <div className="hero-copy">
        <p className="eyebrow">TABLERO DE DECISIONES / OPERATIVO</p>
        <h1>Elige.<br /><em>Mueve.</em><br />Cierra.</h1>
        <p className="hero-text">Una mesa para probar tu convocatoria antes de que el partido empiece.</p>
      </div>
      <div className={`hero-club ${team ? '' : 'hero-club--empty'}`}>
        <div className="hero-club-heading"><span>{team ? 'CLUB EN MESA' : 'PUNTO DE PARTIDA'}</span><b>{team ? 'ACTIVO' : '00'}</b></div>
        {team ? <><img src={team.logo} alt="" /><strong>{team.name}</strong></> : <strong>Elige<br />un club</strong>}
        <div className="hero-score" aria-label={`${startersCount} titulares y ${subsCount} suplentes`}>
          <div><strong>{formatSquadCount(startersCount)}<span>/11</span></strong><small>TITULARES</small></div>
          <div><strong>{formatSquadCount(subsCount)}<span>/11</span></strong><small>SUPLENTES</small></div>
        </div>
      </div>
    </section>
  </>
}
