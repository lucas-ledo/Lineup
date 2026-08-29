import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { getSquad, searchPlayers, searchTeams } from './api'
import { formations } from './data'
import { applyClubTheme, fallbackTheme, getClubTheme } from './teamTheme'
import { AppHeader } from './components/AppHeader'
import { Avatar } from './components/Avatar'
import { Bench } from './components/Bench'
import { LineupPitch } from './components/LineupPitch'
import { SquadPanel } from './components/SquadPanel'
import { TeamPicker } from './components/TeamPicker'
import { TransferMarket } from './components/TransferMarket'
import { euro, parsePositiveEuro } from './utils/formatters'

const MAX_BENCH_PLAYERS = 11
const TEAM_SEARCH_MIN_LENGTH = 2
const PLAYER_SEARCH_MIN_LENGTH = 3

const emptyStatus = { loading: false, message: '' }

function App() {
  const [query, setQuery] = useState('')
  const [teams, setTeams] = useState([])
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [formation, setFormation] = useState('4-3-3')
  const [positionFilter, setPositionFilter] = useState('All')
  const [starters, setStarters] = useState({})
  const [subs, setSubs] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [status, setStatus] = useState(emptyStatus)
  const [theme, setTheme] = useState(() => localStorage.getItem('lineup-theme') || 'dark')
  const [draggedPlayer, setDraggedPlayer] = useState(null)
  const [touchDrag, setTouchDrag] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [shareFile, setShareFile] = useState(null)
  const [marketOpen, setMarketOpen] = useState(false)
  const [marketMode, setMarketMode] = useState('player')
  const [marketQuery, setMarketQuery] = useState('')
  const [marketTeams, setMarketTeams] = useState([])
  const [marketTeam, setMarketTeam] = useState(null)
  const [marketPlayers, setMarketPlayers] = useState([])
  const [marketStatus, setMarketStatus] = useState(emptyStatus)
  const [signingDraft, setSigningDraft] = useState(null)
  const [saleDraft, setSaleDraft] = useState(null)
  const [signings, setSignings] = useState([])
  const [sales, setSales] = useState([])
  const [clubTheme, setClubTheme] = useState(fallbackTheme)

  const lineupCaptureRef = useRef(null)
  const touchSessionRef = useRef(null)
  const suppressTapRef = useRef(false)

  const slots = formations[formation]
  const startersCount = Object.values(starters).filter(Boolean).length
  const assignedIds = useMemo(
    () => new Set([...Object.values(starters), ...subs].filter(Boolean).map((player) => player.id)),
    [starters, subs],
  )
  const visiblePlayers = useMemo(
    () => positionFilter === 'All' ? players : players.filter((player) => player.position === positionFilter),
    [players, positionFilter],
  )
  const spend = signings.reduce((total, item) => total + item.price, 0)
  const income = sales.reduce((total, item) => total + item.price, 0)
  const transferLog = useMemo(
    () => [...signings.map((item) => ({ ...item, type: 'signing' })), ...sales.map((item) => ({ ...item, type: 'sale' }))].sort((a, b) => b.createdAt - a.createdAt),
    [signings, sales],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lineup-theme', theme)
  }, [theme])

  useEffect(() => {
    setShareFile(null)
  }, [team?.id, formation, starters, subs])

  useEffect(() => {
    let isCurrent = true

    if (!team?.logo) {
      setClubTheme(fallbackTheme)
      applyClubTheme(fallbackTheme)
      return undefined
    }

    getClubTheme(team.logo, team.name).then((nextTheme) => {
      if (!isCurrent) return
      setClubTheme(nextTheme)
      applyClubTheme(nextTheme)
    })

    return () => { isCurrent = false }
  }, [team?.id, team?.logo, team?.name])

  const resetLineup = () => {
    setStarters({})
    setSubs([])
    setSelectedSlot(null)
    setStatus(emptyStatus)
  }

  const resetTeamContext = () => {
    setTeam(null)
    setTeams([])
    setPlayers([])
    setMarketOpen(false)
    resetLineup()
  }

  const updateFormation = (nextFormation) => {
    setFormation(nextFormation)
    setStarters({})
    setSelectedSlot(null)
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const searchTerm = query.trim()

    if (searchTerm.length < TEAM_SEARCH_MIN_LENGTH) {
      setStatus({ loading: false, message: 'Escribe al menos dos letras para buscar un equipo.' })
      return
    }

    setStatus({ loading: true, message: '' })
    try {
      const results = await searchTeams(searchTerm)
      setTeams(results.slice(0, 8))
      setStatus({ loading: false, message: results.length ? '' : 'No encontramos ningún equipo con esa búsqueda.' })
    } catch (error) {
      setStatus({ loading: false, message: error.message })
    }
  }

  const selectTeam = async (item) => {
    const nextTeam = item.team
    setTeam(nextTeam)
    setTeams([])
    setPlayers([])
    setPositionFilter('All')
    setSignings([])
    setSales([])
    setSaleDraft(null)
    setSigningDraft(null)
    setStarters({})
    setSubs([])
    setSelectedSlot(null)
    setStatus({ loading: true, message: '' })

    try {
      const squad = await getSquad(nextTeam.id)
      if (!squad) throw new Error('No hay una plantilla disponible para este equipo.')
      setPlayers((squad.players || []).map((player) => ({ ...player, club: nextTeam })))
      setStatus({ loading: false, message: squad.players?.length ? '' : 'La API no devolvió jugadores para este equipo.' })
    } catch (error) {
      setStatus({ loading: false, message: error.message })
    }
  }

  const clearPlayer = (playerId) => {
    setStarters((current) => Object.fromEntries(Object.entries(current).map(([slotId, player]) => [slotId, player?.id === playerId ? null : player])))
    setSubs((current) => current.filter((player) => player.id !== playerId))
  }

  const addToStarting = (player, requestedSlotId = null) => {
    const target = requestedSlotId
      ? slots.find((slot) => slot.id === requestedSlotId)
      : selectedSlot
        ? slots.find((slot) => slot.id === selectedSlot && !starters[slot.id])
        : slots.find((slot) => slot.kind === player.position && !starters[slot.id]) || slots.find((slot) => !starters[slot.id])

    if (assignedIds.has(player.id) && !requestedSlotId) return
    if (!target) {
      setStatus({ loading: false, message: 'Tu once ya está completo. Quita un jugador para hacer sitio.' })
      return
    }

    if (requestedSlotId) {
      setStarters((current) => {
        const sourceSlotId = Object.entries(current).find(([, starter]) => starter?.id === player.id)?.[0]
        const replacedPlayer = current[target.id]
        if (sourceSlotId && sourceSlotId !== target.id && replacedPlayer) return { ...current, [sourceSlotId]: replacedPlayer, [target.id]: player }
        const withoutPlayer = Object.fromEntries(Object.entries(current).map(([slotId, starter]) => [slotId, starter?.id === player.id ? null : starter]))
        return { ...withoutPlayer, [target.id]: player }
      })
      setSubs((current) => current.filter((item) => item.id !== player.id))
    } else {
      setStarters((current) => ({ ...current, [target.id]: player }))
    }

    setSelectedSlot(null)
    setStatus(emptyStatus)
  }

  const addToBench = (player) => {
    if (assignedIds.has(player.id)) return
    if (subs.length === MAX_BENCH_PLAYERS) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 11 suplentes.' })
      return
    }
    setSubs((current) => [...current, player])
    setStatus(emptyStatus)
  }

  const moveToBench = (player) => {
    if (subs.some((item) => item.id === player.id)) return
    if (subs.length === MAX_BENCH_PLAYERS) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 11 suplentes.' })
      return
    }
    setStarters((current) => Object.fromEntries(Object.entries(current).map(([slotId, starter]) => [slotId, starter?.id === player.id ? null : starter])))
    setSubs((current) => [...current, player])
    setStatus(emptyStatus)
  }

  const beginDrag = (event, player) => {
    setDraggedPlayer(player)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(player.id))
    event.dataTransfer.setData('application/x-lineup-player', String(player.id))
  }

  const getDraggedPlayer = (event) => {
    const playerId = event.dataTransfer.getData('application/x-lineup-player') || event.dataTransfer.getData('text/plain')
    return players.find((player) => String(player.id) === playerId) || draggedPlayer
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

  const beginTouchMove = (event, player) => {
    if (event.pointerType !== 'touch') return
    touchSessionRef.current = { player, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveTouchPlayer = (event) => {
    const session = touchSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    if (!session.moved && Math.hypot(event.clientX - session.startX, event.clientY - session.startY) > 8) session.moved = true
    if (session.moved) {
      event.preventDefault()
      setTouchDrag({ player: session.player, x: event.clientX, y: event.clientY })
    }
  }

  const endTouchMove = (event) => {
    const session = touchSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    if (session.moved) {
      const slotElement = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot-id]')
      if (slotElement?.dataset.slotId) addToStarting(session.player, slotElement.dataset.slotId)
      suppressTapRef.current = true
      window.setTimeout(() => { suppressTapRef.current = false }, 0)
    }
    touchSessionRef.current = null
    setTouchDrag(null)
  }

  const changeMarketMode = (nextMode) => {
    setMarketMode(nextMode)
    setMarketPlayers([])
    setMarketTeams([])
    setMarketTeam(null)
  }

  const handleMarketSearch = async (event) => {
    event.preventDefault()
    const searchTerm = marketQuery.trim()
    const minimumCharacters = marketMode === 'player' ? PLAYER_SEARCH_MIN_LENGTH : TEAM_SEARCH_MIN_LENGTH

    if (searchTerm.length < minimumCharacters) {
      setMarketStatus({ loading: false, message: `Escribe al menos ${minimumCharacters} letras para buscar ${marketMode === 'player' ? 'un jugador' : 'otro equipo'}.` })
      return
    }

    setMarketStatus({ loading: true, message: '' })
    try {
      if (marketMode === 'player') {
        const results = await searchPlayers(searchTerm)
        setMarketPlayers(results)
        setMarketTeams([])
        setMarketTeam(null)
        setMarketStatus({ loading: false, message: results.length ? '' : 'No encontramos jugadores para esa búsqueda.' })
        return
      }

      const results = await searchTeams(searchTerm)
      setMarketTeams(results.filter((item) => item.team.id !== team?.id).slice(0, 6))
      setMarketStatus({ loading: false, message: results.length ? '' : 'No encontramos equipos para ese mercado.' })
    } catch (error) {
      setMarketStatus({ loading: false, message: error.message })
    }
  }

  const selectMarketTeam = async (item) => {
    const nextTeam = item.team
    setMarketTeam(nextTeam)
    setMarketTeams([])
    setMarketPlayers([])
    setSigningDraft(null)
    setMarketStatus({ loading: true, message: '' })
    try {
      const squad = await getSquad(nextTeam.id)
      setMarketPlayers((squad?.players || []).map((player) => ({ ...player, club: nextTeam })))
      setMarketStatus({ loading: false, message: squad?.players?.length ? '' : 'Este equipo no tiene jugadores disponibles en la API.' })
    } catch (error) {
      setMarketStatus({ loading: false, message: error.message })
    }
  }

  const confirmSigning = () => {
    const price = parsePositiveEuro(signingDraft?.price)
    if (!price || !signingDraft?.player) {
      setMarketStatus({ loading: false, message: 'Indica un importe de fichaje válido en euros.' })
      return
    }
    const player = signingDraft.player
    if (players.some((item) => item.id === player.id)) {
      setMarketStatus({ loading: false, message: 'Ese jugador ya forma parte de tu plantilla.' })
      return
    }
    const signedPlayer = { ...player, originClub: player.club }
    const transfer = { id: `signing-${player.id}-${Date.now()}`, player: signedPlayer, price, createdAt: Date.now() }
    setPlayers((current) => [...current, signedPlayer])
    setSignings((current) => [...current, transfer])
    setSigningDraft(null)
    setMarketStatus({ loading: false, message: `${player.name} se incorpora por ${euro.format(price)}.` })
  }

  const confirmSale = () => {
    const price = parsePositiveEuro(saleDraft?.price)
    if (!price || !saleDraft?.player) {
      setStatus({ loading: false, message: 'Indica un precio de venta válido en euros.' })
      return
    }
    const player = saleDraft.player
    clearPlayer(player.id)
    setPlayers((current) => current.filter((item) => item.id !== player.id))
    const transfer = { id: `sale-${player.id}-${Date.now()}`, player, price, createdAt: Date.now() }
    setSales((current) => [...current, transfer])
    setSaleDraft(null)
    setStatus({ loading: false, message: `${player.name} vendido por ${euro.format(price)}.` })
  }

  const undoTransfer = (transfer) => {
    if (transfer.type === 'signing') {
      clearPlayer(transfer.player.id)
      setPlayers((current) => current.filter((player) => player.id !== transfer.player.id))
      setSignings((current) => current.filter((item) => item.id !== transfer.id))
      setMarketStatus({ loading: false, message: `Has deshecho el fichaje de ${transfer.player.name}.` })
      return
    }
    setPlayers((current) => current.some((player) => player.id === transfer.player.id) ? current : [...current, transfer.player])
    setSales((current) => current.filter((item) => item.id !== transfer.id))
    setStatus({ loading: false, message: `Has deshecho la venta de ${transfer.player.name}.` })
  }

  const shareLineup = async () => {
    if (!team || !lineupCaptureRef.current) {
      setStatus({ loading: false, message: 'Selecciona un equipo antes de crear la imagen.' })
      return
    }
    setIsSharing(true)
    try {
      const canvas = await html2canvas(lineupCaptureRef.current, { backgroundColor: theme === 'dark' ? '#0b2824' : '#f9fbf7', scale: 2, useCORS: true, logging: false })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('No se pudo generar la imagen.')
      const fileName = `${team.name.toLowerCase().replaceAll(' ', '-')}-alineacion.png`
      setShareFile(new File([blob], fileName, { type: 'image/png' }))
      setStatus({ loading: false, message: 'Imagen lista. Usa “Compartir foto” para enviarla.' })
    } catch {
      setStatus({ loading: false, message: 'No se pudo generar la imagen. Prueba a crearla de nuevo.' })
    } finally {
      setIsSharing(false)
    }
  }

  const sharePreparedImage = async () => {
    if (!shareFile || !team) return
    const shareData = { title: `Alineación de ${team.name}`, text: `Mi once de ${team.name}`, files: [shareFile] }
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [shareFile] }))) {
        await navigator.share(shareData)
        return
      }
      const url = URL.createObjectURL(shareFile)
      const link = document.createElement('a')
      link.href = url
      link.download = shareFile.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus({ loading: false, message: 'Tu dispositivo no admite compartir archivos directamente. Imagen descargada.' })
    } catch (error) {
      if (error.name !== 'AbortError') setStatus({ loading: false, message: 'No se pudo abrir el menú de compartir. Prueba a descargar la imagen.' })
    }
  }

  return <main className={`app-shell ${team ? 'app-shell--club-themed' : ''}`} style={{ '--club-primary': clubTheme.primary }}>
    <AppHeader team={team} startersCount={startersCount} subsCount={subs.length} theme={theme} onThemeChange={setTheme} />
    <TeamPicker query={query} teams={teams} selectedTeam={team} isLoading={status.loading} onQueryChange={setQuery} onSearch={handleSearch} onSelectTeam={selectTeam} onClearTeam={resetTeamContext} />
    {status.message && <p className="notice" role="status">{status.message}</p>}
    {team && <TransferMarket isOpen={marketOpen} mode={marketMode} query={marketQuery} teams={marketTeams} selectedTeam={marketTeam} players={marketPlayers} status={marketStatus} transferLog={transferLog} spend={spend} income={income} roster={players} signingDraft={signingDraft} onToggle={() => setMarketOpen((current) => !current)} onModeChange={changeMarketMode} onQueryChange={setMarketQuery} onSearch={handleMarketSearch} onSelectTeam={selectMarketTeam} onClearSelectedTeam={() => { setMarketTeam(null); setMarketPlayers([]) }} onStartSigning={(player) => setSigningDraft({ player, price: '' })} onSigningDraftChange={setSigningDraft} onConfirmSigning={confirmSigning} onUndoTransfer={undoTransfer} />}
    <section className="workspace">
      <LineupPitch captureRef={lineupCaptureRef} team={team} formation={formation} formations={formations} slots={slots} starters={starters} startersCount={startersCount} subsCount={subs.length} selectedSlot={selectedSlot} draggedPlayer={draggedPlayer} touchDrag={touchDrag} isSharing={isSharing} shareFile={shareFile} onShare={shareLineup} onSharePrepared={sharePreparedImage} onFormationChange={updateFormation} onAllowDrop={(event) => event.preventDefault()} onDropSlot={dropOnSlot} onSelectSlot={setSelectedSlot} onClearPlayer={clearPlayer} onDragStart={beginDrag} onDragEnd={() => setDraggedPlayer(null)} onPointerDown={beginTouchMove} onPointerMove={moveTouchPlayer} onPointerUp={endTouchMove} onPointerCancel={endTouchMove} shouldSuppressTap={() => suppressTapRef.current} />
      <SquadPanel team={team} players={players} visiblePlayers={visiblePlayers} positionFilter={positionFilter} isLoading={status.loading} assignedIds={assignedIds} saleDraft={saleDraft} onFilterChange={setPositionFilter} onResetLineup={resetLineup} onAddToStarting={addToStarting} onAddToBench={addToBench} onDragStart={beginDrag} onDragEnd={() => setDraggedPlayer(null)} onSaleDraftChange={setSaleDraft} onConfirmSale={confirmSale} />
    </section>
    <Bench subs={subs} onAllowDrop={(event) => event.preventDefault()} onDrop={dropOnBench} onClearPlayer={clearPlayer} onDragStart={beginDrag} onDragEnd={() => setDraggedPlayer(null)} />
    <footer>LINEUP · Construye, ajusta y comparte tu equipo ideal.</footer>
    {touchDrag && <div className="touch-drag-ghost" style={{ left: touchDrag.x, top: touchDrag.y }} aria-hidden="true"><Avatar player={touchDrag.player} small /><span>{touchDrag.player.name}</span></div>}
  </main>
}

export default App
