import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { getSquad, searchPlayers, searchTeams } from './api'
import { formations, positionNames } from './data'

const initials = (name = '') => name.split(' ').slice(0, 2).map((part) => part[0]).join('')
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function Avatar({ player, small = false }) {
  return player.photo ? (
    <img className={`avatar ${small ? 'avatar--small' : ''}`} src={player.photo} alt="" />
  ) : (
    <span className={`avatar avatar--fallback ${small ? 'avatar--small' : ''}`}>{initials(player.name)}</span>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [teams, setTeams] = useState([])
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [formation, setFormation] = useState('4-3-3')
  const [starters, setStarters] = useState({})
  const [subs, setSubs] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [status, setStatus] = useState({ loading: false, message: '' })
  const [theme, setTheme] = useState(() => localStorage.getItem('lineup-theme') || 'dark')
  const [draggedPlayer, setDraggedPlayer] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [marketOpen, setMarketOpen] = useState(false)
  const [marketMode, setMarketMode] = useState('player')
  const [marketQuery, setMarketQuery] = useState('')
  const [marketTeams, setMarketTeams] = useState([])
  const [marketTeam, setMarketTeam] = useState(null)
  const [marketPlayers, setMarketPlayers] = useState([])
  const [marketStatus, setMarketStatus] = useState({ loading: false, message: '' })
  const [signingDraft, setSigningDraft] = useState(null)
  const [saleDraft, setSaleDraft] = useState(null)
  const [signings, setSignings] = useState([])
  const [sales, setSales] = useState([])
  const lineupCaptureRef = useRef(null)

  const slots = formations[formation]
  const assignedIds = useMemo(
    () => new Set([...Object.values(starters), ...subs].filter(Boolean).map((player) => player.id)),
    [starters, subs],
  )
  const startersCount = Object.values(starters).filter(Boolean).length
  const spend = signings.reduce((total, item) => total + item.price, 0)
  const income = sales.reduce((total, item) => total + item.price, 0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lineup-theme', theme)
  }, [theme])

  const updateFormation = (next) => {
    setFormation(next)
    setStarters({})
    setSelectedSlot(null)
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setStatus({ loading: false, message: 'Escribe al menos dos letras para buscar un equipo.' })
      return
    }
    setStatus({ loading: true, message: '' })
    try {
      const result = await searchTeams(trimmed)
      setTeams(result.slice(0, 8))
      setStatus({ loading: false, message: result.length ? '' : 'No encontramos ningún equipo con esa búsqueda.' })
    } catch (error) {
      setStatus({ loading: false, message: error.message })
    }
  }

  const selectTeam = async (item) => {
    setTeam(item.team)
    setTeams([])
    setPlayers([])
    setStarters({})
    setSubs([])
    setSignings([])
    setSales([])
    setSaleDraft(null)
    setSigningDraft(null)
    setSelectedSlot(null)
    setStatus({ loading: true, message: '' })
    try {
      const squad = await getSquad(item.team.id)
      if (!squad) throw new Error('No hay una plantilla disponible para este equipo.')
      setPlayers((squad.players || []).map((player) => ({ ...player, club: item.team })))
      setStatus({ loading: false, message: squad.players?.length ? '' : 'La API no devolvió jugadores para este equipo.' })
    } catch (error) {
      setStatus({ loading: false, message: error.message })
    }
  }

  const clearPlayer = (playerId) => {
    setStarters((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value?.id === playerId ? null : value])))
    setSubs((current) => current.filter((player) => player.id !== playerId))
  }

  const addToStarting = (player, requestedSlot = null) => {
    const target = requestedSlot
      ? slots.find((slot) => slot.id === requestedSlot)
      : selectedSlot
      ? slots.find((slot) => slot.id === selectedSlot && !starters[slot.id])
      : slots.find((slot) => slot.kind === player.position && !starters[slot.id]) || slots.find((slot) => !starters[slot.id])
    if (assignedIds.has(player.id) && !requestedSlot) return
    if (!target) {
      setStatus({ loading: false, message: 'Tu once ya está completo. Quita un jugador para hacer sitio.' })
      return
    }
    if (requestedSlot) {
      setStarters((current) => {
        const sourceId = Object.entries(current).find(([, value]) => value?.id === player.id)?.[0]
        const replaced = current[target.id]
        if (sourceId && sourceId !== target.id && replaced) {
          return { ...current, [sourceId]: replaced, [target.id]: player }
        }
        const withoutPlayer = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value?.id === player.id ? null : value]))
        return { ...withoutPlayer, [target.id]: player }
      })
      setSubs((current) => current.filter((item) => item.id !== player.id))
      setSelectedSlot(null)
      setStatus({ loading: false, message: '' })
      return
    }
    setStarters((current) => ({ ...current, [target.id]: player }))
    setSelectedSlot(null)
    setStatus({ loading: false, message: '' })
  }

  const addToBench = (player) => {
    if (assignedIds.has(player.id)) return
    if (subs.length === 6) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 6 suplentes.' })
      return
    }
    setSubs((current) => [...current, player])
    setStatus({ loading: false, message: '' })
  }

  const moveToBench = (player) => {
    if (subs.some((item) => item.id === player.id)) return
    if (subs.length === 6) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 6 suplentes.' })
      return
    }
    setStarters((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value?.id === player.id ? null : value])))
    setSubs((current) => [...current, player])
    setStatus({ loading: false, message: '' })
  }

  const beginDrag = (event, player) => {
    setDraggedPlayer(player)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(player.id))
    event.dataTransfer.setData('application/x-lineup-player', String(player.id))
  }

  const allowDrop = (event) => event.preventDefault()

  const getDraggedPlayer = (event) => {
    const id = event.dataTransfer.getData('application/x-lineup-player') || event.dataTransfer.getData('text/plain')
    return players.find((player) => String(player.id) === id) || draggedPlayer
  }

  const dropOnSlot = (event, slotId) => {
    event.preventDefault()
    const player = getDraggedPlayer(event)
    if (player) addToStarting(player, slotId)
    setDraggedPlayer(null)
  }

  const dropOnBench = (event) => {
    event.preventDefault()
    const player = getDraggedPlayer(event)
    if (player) moveToBench(player)
    setDraggedPlayer(null)
  }

  const resetLineup = () => {
    setStarters({})
    setSubs([])
    setSelectedSlot(null)
    setStatus({ loading: false, message: '' })
  }

  const handleMarketSearch = async (event) => {
    event.preventDefault()
    const trimmed = marketQuery.trim()
    const minimumCharacters = marketMode === 'player' ? 3 : 2
    if (trimmed.length < minimumCharacters) {
      setMarketStatus({ loading: false, message: `Escribe al menos ${minimumCharacters} letras para buscar ${marketMode === 'player' ? 'un jugador' : 'otro equipo'}.` })
      return
    }
    setMarketStatus({ loading: true, message: '' })
    try {
      if (marketMode === 'player') {
        const result = await searchPlayers(trimmed)
        setMarketPlayers(result)
        setMarketTeams([])
        setMarketTeam(null)
        setMarketStatus({ loading: false, message: result.length ? '' : 'No encontramos jugadores para esa búsqueda.' })
        return
      }
      const result = await searchTeams(trimmed)
      setMarketTeams(result.filter((item) => item.team.id !== team?.id).slice(0, 6))
      setMarketStatus({ loading: false, message: result.length ? '' : 'No encontramos equipos para ese mercado.' })
    } catch (error) {
      setMarketStatus({ loading: false, message: error.message })
    }
  }

  const selectMarketTeam = async (item) => {
    setMarketTeam(item.team)
    setMarketTeams([])
    setMarketPlayers([])
    setSigningDraft(null)
    setMarketStatus({ loading: true, message: '' })
    try {
      const squad = await getSquad(item.team.id)
      setMarketPlayers((squad?.players || []).map((player) => ({ ...player, club: item.team })))
      setMarketStatus({ loading: false, message: squad?.players?.length ? '' : 'Este equipo no tiene jugadores disponibles en la API.' })
    } catch (error) {
      setMarketStatus({ loading: false, message: error.message })
    }
  }

  const parsePrice = (value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null
  }

  const confirmSigning = () => {
    const price = parsePrice(signingDraft?.price)
    if (!price || !signingDraft?.player) {
      setMarketStatus({ loading: false, message: 'Indica un importe de fichaje válido en euros.' })
      return
    }
    const player = signingDraft.player
    if (players.some((item) => item.id === player.id)) {
      setMarketStatus({ loading: false, message: 'Ese jugador ya forma parte de tu plantilla.' })
      return
    }
    setPlayers((current) => [...current, player])
    setSignings((current) => [...current, { player, price }])
    setSigningDraft(null)
    setMarketStatus({ loading: false, message: `${player.name} se incorpora por ${euro.format(price)}.` })
  }

  const confirmSale = () => {
    const price = parsePrice(saleDraft?.price)
    if (!price || !saleDraft?.player) {
      setStatus({ loading: false, message: 'Indica un precio de venta válido en euros.' })
      return
    }
    const player = saleDraft.player
    clearPlayer(player.id)
    setPlayers((current) => current.filter((item) => item.id !== player.id))
    setSales((current) => [...current, { player, price }])
    setSaleDraft(null)
    setStatus({ loading: false, message: `${player.name} vendido por ${euro.format(price)}.` })
  }

  const shareLineup = async () => {
    if (!team || !lineupCaptureRef.current) {
      setStatus({ loading: false, message: 'Selecciona un equipo antes de crear la imagen.' })
      return
    }
    setIsSharing(true)
    try {
      const canvas = await html2canvas(lineupCaptureRef.current, {
        backgroundColor: theme === 'dark' ? '#0b2824' : '#f9fbf7',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('No se pudo generar la imagen.')
      const file = new File([blob], `${team.name.toLowerCase().replaceAll(' ', '-')}-alineacion.png`, { type: 'image/png' })
      const shareData = { title: `Alineación de ${team.name}`, text: `Mi once de ${team.name}`, files: [file] }

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(shareData)
      } else {
        const url = URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        link.click()
        URL.revokeObjectURL(url)
        setStatus({ loading: false, message: 'Imagen descargada. Ya puedes compartirla donde quieras.' })
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus({ loading: false, message: 'No se pudo generar la imagen. Prueba a descargarla de nuevo.' })
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Lineup, inicio"><span className="brand-mark">L</span><span>lineup</span></a>
        <div className="topbar-copy"><span className="live-dot" /> Creador de alineaciones</div>
        <div className="theme-switcher" aria-label="Apariencia">
          <button className={theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}>☀ Claro</button>
          <button className={theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>◐ Oscuro</button>
        </div>
        <a className="api-link" href="https://www.api-football.com/documentation-v3" target="_blank" rel="noreferrer">Datos por API-Football ↗</a>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">GESTOR DE PLANTILLAS</p>
          <h1>Tu once.<br /><em>Tus reglas.</em></h1>
          <p className="hero-text">Elige un equipo, consulta su plantilla actual y construye la convocatoria perfecta.</p>
        </div>
        <div className="hero-score" aria-label={`${startersCount} titulares y ${subs.length} suplentes`}>
          <strong>{String(startersCount).padStart(2, '0')}<span>/11</span></strong>
          <small>TITULARES</small>
          <strong>{String(subs.length).padStart(2, '0')}<span>/06</span></strong>
          <small>SUPLENTES</small>
        </div>
      </section>

      <section className="team-picker" aria-label="Selecciona un equipo">
        <form onSubmit={handleSearch} className="search-form">
          <label htmlFor="team-search">Busca un equipo</label>
          <div className="search-row">
            <input id="team-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Real Madrid, Arsenal..." autoComplete="off" />
            <button className="button button--primary" type="submit" disabled={status.loading}>{status.loading ? 'Buscando...' : 'Buscar'}</button>
          </div>
        </form>
        {team && <div className="selected-team"><img src={team.logo} alt="" /><span>{team.name}</span><button onClick={() => { setTeam(null); setPlayers([]); resetLineup(); setMarketOpen(false) }} aria-label="Cambiar de equipo">×</button></div>}
        {teams.length > 0 && <div className="team-results">{teams.map((item) => <button className="team-result" key={item.team.id} onClick={() => selectTeam(item)}><img src={item.team.logo} alt="" /><span>{item.team.name}</span><small>{item.venue?.name || item.country}</small></button>)}</div>}
      </section>

      {status.message && <p className="notice" role="status">{status.message}</p>}

      {team && <section className="transfer-panel">
        <div className="transfer-heading"><div><p className="eyebrow">MERCADO</p><h2>Fichajes y ventas</h2></div><div className="transfer-balance"><span>GASTO <b>{euro.format(spend)}</b></span><span>INGRESOS <b>{euro.format(income)}</b></span><strong>NETO {euro.format(income - spend)}</strong></div><button className="market-toggle" onClick={() => setMarketOpen((current) => !current)}>{marketOpen ? 'Cerrar mercado' : '+ Nuevo fichaje'}</button></div>
        {marketOpen && <div className="market-body"><form className="market-search" onSubmit={handleMarketSearch}><label htmlFor="market-search">Buscar fichajes</label><div className="market-mode"><button type="button" className={marketMode === 'player' ? 'is-active' : ''} onClick={() => { setMarketMode('player'); setMarketPlayers([]); setMarketTeams([]); setMarketTeam(null) }}>Por jugador</button><button type="button" className={marketMode === 'team' ? 'is-active' : ''} onClick={() => { setMarketMode('team'); setMarketPlayers([]); setMarketTeams([]); setMarketTeam(null) }}>Por club</button></div><div><input id="market-search" value={marketQuery} onChange={(event) => setMarketQuery(event.target.value)} placeholder={marketMode === 'player' ? 'Ej. Lamine Yamal, Mbappé...' : 'Busca otro equipo...'} /><button type="submit" disabled={marketStatus.loading}>{marketStatus.loading ? '...' : 'Buscar'}</button></div></form>{marketTeam && <div className="market-club"><img src={marketTeam.logo} alt="" /><span>Plantilla de {marketTeam.name}</span><button onClick={() => { setMarketTeam(null); setMarketPlayers([]) }}>×</button></div>}{marketTeams.length > 0 && <div className="market-teams">{marketTeams.map((item) => <button key={item.team.id} onClick={() => selectMarketTeam(item)}><img src={item.team.logo} alt="" />{item.team.name}</button>)}</div>}{marketStatus.message && <p className="market-notice">{marketStatus.message}</p>}{marketPlayers.length > 0 && <div className="market-players">{marketPlayers.map((player) => { const alreadyHere = players.some((item) => item.id === player.id); const editing = signingDraft?.player.id === player.id; return <article className="market-player" key={player.id}><Avatar player={player} /><div><strong>{player.name}</strong><span>{positionNames[player.position] || player.position} · #{player.number ?? '—'}</span>{player.club?.name && <small className="market-player-club">{player.club.name}</small>}</div>{alreadyHere ? <small>En plantilla</small> : editing ? <div className="price-editor"><label>€<input autoFocus type="number" min="1" step="1" value={signingDraft.price} onChange={(event) => setSigningDraft((current) => ({ ...current, price: event.target.value }))} aria-label={`Precio de fichaje de ${player.name} en euros`} /></label><button onClick={confirmSigning}>Fichar</button><button className="cancel-price" onClick={() => setSigningDraft(null)}>×</button></div> : <button className="buy-player" onClick={() => setSigningDraft({ player, price: '' })}>Fichar</button>}</article> })}</div>}</div>}
      </section>}

      <section className="workspace">
        <div className="pitch-panel" ref={lineupCaptureRef}>
          <div className="panel-heading">
            <div><p className="eyebrow">{team ? `${team.name.toUpperCase()} · ALINEACIÓN INICIAL` : 'ALINEACIÓN INICIAL'}</p><h2>El once titular</h2></div>
            <div className="pitch-actions"><button className="share-button" data-html2canvas-ignore="true" onClick={shareLineup} disabled={isSharing || !team}>{isSharing ? 'Generando…' : '↗ Compartir'}</button><div className="formation-control"><label htmlFor="formation">Formación</label><select id="formation" value={formation} onChange={(event) => updateFormation(event.target.value)}>{Object.keys(formations).map((item) => <option key={item}>{item}</option>)}</select></div></div>
          </div>
          <div className="pitch" aria-label="Campo de fútbol, selecciona una posición vacía">
            <div className="pitch-line pitch-line--top" /><div className="pitch-line pitch-line--middle" /><div className="pitch-circle" /><div className="pitch-box pitch-box--top" /><div className="pitch-box pitch-box--bottom" />
            {slots.map((slot) => {
              const player = starters[slot.id]
              return <div key={slot.id} className={`slot ${player ? 'slot--filled' : ''} ${selectedSlot === slot.id ? 'slot--selected' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onDragOver={allowDrop} onDrop={(event) => dropOnSlot(event, slot.id)}>
                {player ? <button className={`field-card ${draggedPlayer?.id === player.id ? 'field-card--dragging' : ''}`} draggable onDragStart={(event) => beginDrag(event, player)} onDragEnd={() => setDraggedPlayer(null)} onClick={() => clearPlayer(player.id)} title={`Arrastra a ${player.name} a otra posición. Pulsa para quitarlo.`}><span className="field-number">#{player.number ?? '—'}</span><Avatar player={player} /><span className="field-details"><strong>{player.name}</strong><small>{slot.label} · {positionNames[player.position] || player.position}</small></span><img className="field-crest" src={team?.logo} alt="" /></button> : <button className="empty-slot" onClick={() => setSelectedSlot(slot.id)} title={`Elegir ${slot.label}`}><span className="slot-plus">+</span><span className="slot-label">{slot.label}</span></button>}
              </div>
            })}
          </div>
          <p className="hint">{selectedSlot ? `Posición seleccionada: ${slots.find((slot) => slot.id === selectedSlot)?.label}. Elige o arrastra un jugador de la lista.` : 'Pulsa una posición vacía o arrastra un jugador al campo. Pulsa un titular para quitarlo.'}</p>
        </div>

        <aside className="squad-panel">
          <div className="panel-heading"><div><p className="eyebrow">{team ? team.name.toUpperCase() : 'PLANTILLA'}</p><h2>Jugadores <span>{players.length || '—'}</span></h2></div><button className="text-button" onClick={resetLineup} disabled={!startersCount && !subs.length}>Limpiar</button></div>
          {!team && <div className="empty-state"><span>⚽</span><h3>Empieza por un equipo</h3><p>Busca arriba para cargar su plantilla actual desde la API.</p></div>}
          {team && status.loading && <div className="empty-state"><span className="loader" /><h3>Cargando plantilla</h3><p>Estamos preparando los jugadores disponibles.</p></div>}
          {team && !status.loading && players.length > 0 && <div className="player-list">{players.map((player) => {
            const used = assignedIds.has(player.id)
            const playerLocation = Object.values(starters).some((item) => item?.id === player.id) ? 'Titular' : 'Suplente'
            return <article className={`player-card ${used ? 'player-card--used' : ''}`} key={player.id} draggable onDragStart={(event) => beginDrag(event, player)} onDragEnd={() => setDraggedPlayer(null)}>
              <div className="player-portrait"><Avatar player={player} /><img className="club-crest" src={player.club?.logo || team.logo} alt={`Escudo de ${player.club?.name || team.name}`} /></div>
              <div className="player-info"><strong>{player.name}</strong><div className="player-meta"><span className="position-pill">{positionNames[player.position] || player.position}</span><span className="number-pill">#{player.number ?? '—'}</span></div></div>
              {used ? <span className="added-label">{playerLocation}</span> : <div className="player-actions"><button onClick={() => addToStarting(player)} title="Añadir al once">+11</button><button onClick={() => addToBench(player)} title="Añadir al banquillo">+6</button></div>}
              {saleDraft?.player.id === player.id ? <div className="sale-editor"><label>€<input autoFocus type="number" min="1" step="1" value={saleDraft.price} onChange={(event) => setSaleDraft((current) => ({ ...current, price: event.target.value }))} aria-label={`Precio de venta de ${player.name} en euros`} /></label><button onClick={confirmSale}>Confirmar</button><button onClick={() => setSaleDraft(null)}>×</button></div> : <button className="sale-trigger" onClick={() => setSaleDraft({ player, price: '' })}>Vender</button>}
            </article>
          })}</div>}
        </aside>
      </section>

      <section className="bench-section">
        <div className="bench-title"><p className="eyebrow">BANQUILLO</p><h2>Suplentes <span>{subs.length}/6</span></h2></div>
        <div className="bench-list" onDragOver={allowDrop} onDrop={dropOnBench}>{Array.from({ length: 6 }, (_, index) => {
          const player = subs[index]
          return player ? <button className="bench-player" key={player.id} draggable onDragStart={(event) => beginDrag(event, player)} onDragEnd={() => setDraggedPlayer(null)} onClick={() => clearPlayer(player.id)} title={`Arrastra a ${player.name} al campo. Pulsa para quitarlo.`}><span className="bench-index">{String(index + 1).padStart(2, '0')}</span><Avatar player={player} small /><span><strong>{player.name}</strong><small>{positionNames[player.position] || player.position}</small></span><b>×</b></button> : <div className="bench-empty" key={index}><span>{String(index + 1).padStart(2, '0')}</span><i>+ Añadir suplente</i></div>
        })}</div>
      </section>
      <footer>LINEUP · Construye, ajusta y comparte tu equipo ideal.</footer>
    </main>
  )
}

export default App
