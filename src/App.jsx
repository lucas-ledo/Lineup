import { useEffect, useRef, useState } from 'react'
import { getNationalTeamPlayers, searchPlayers, searchTeams } from './api'
import { Avatar } from './components/Avatar'
import { AppHeader, EditorialIntro } from './components/AppHeader'
import { Bench } from './components/Bench'
import { CreationModes } from './components/CreationModes'
import { LineupPitch } from './components/LineupPitch'
import { NationalTeamPicker } from './components/NationalTeamPicker'
import { PlayerPoolPanel } from './components/PlayerPoolPanel'
import { PlayerQuickActions } from './components/PlayerQuickActions'
import { ShareLineupCard } from './components/ShareLineupCard'
import { SquadPanel } from './components/SquadPanel'
import { TeamPicker } from './components/TeamPicker'
import { TransferMarket } from './components/TransferMarket'
import { WorkspaceSkeleton } from './components/WorkspaceSkeleton'
import { formations } from './data'
import { LineupType, ReferenceContextType } from './domain/lineup'
import { useLineup } from './hooks/useLineup'
import { useShareLineup } from './hooks/useShareLineup'
import { useSquad } from './hooks/useSquad'
import { useTransfers } from './hooks/useTransfers'
import { getEditorialTheme } from './teamTheme'

const WORKSPACE_DRAFT_KEY = 'lineup-workspace-drafts-v2'
const LEGACY_WORKSPACE_DRAFT_KEY = 'lineup-workspace-draft-v1'

function normalizeCountryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]/g, '')
}

function isSeniorNationalTeam(item) {
  return Boolean(item.country) && normalizeCountryName(item.team.name) === normalizeCountryName(item.country)
}

function belongsToNationalTeam(player, nationalTeam) {
  return Boolean(nationalTeam) && normalizeCountryName(player.nationality) === normalizeCountryName(nationalTeam.name)
}

function App() {
  const [isDraftReady, setIsDraftReady] = useState(false)
  const [modeDrafts, setModeDrafts] = useState({})
  const playerSearchRequestRef = useRef(0)
  const [marketReplacementSlot, setMarketReplacementSlot] = useState(null)
  const squad = useSquad()
  const [creationMode, setCreationMode] = useState('current-team')
  const [freePlayers, setFreePlayers] = useState([])
  const [playerQuery, setPlayerQuery] = useState('')
  const [playerResults, setPlayerResults] = useState([])
  const [playerSearchStatus, setPlayerSearchStatus] = useState({ loading: false, message: '' })
  const [nationalQuery, setNationalQuery] = useState('')
  const [nationalTeams, setNationalTeams] = useState([])
  const [nationalTeam, setNationalTeam] = useState(null)
  const [nationalStatus, setNationalStatus] = useState({ loading: false, message: '' })
  const editorPlayers = creationMode === 'current-team' ? squad.players : freePlayers
  const lineup = useLineup({ players: editorPlayers, setStatus: squad.setStatus })
  const transfers = useTransfers({
    team: squad.team,
    players: squad.players,
    setPlayers: squad.setPlayers,
    clearPlayer: lineup.clearPlayer,
    setStatus: squad.setStatus,
  })
  const activeContextTeam = creationMode === 'current-team' ? squad.team : nationalTeam
  const editorialTheme = getEditorialTheme(activeContextTeam)
  const share = useShareLineup({
    team: activeContextTeam,
    title: creationMode === 'custom' ? 'Mi alineación' : creationMode === 'current-team' ? squad.team?.name : nationalTeam?.name,
    formation: lineup.formation,
    starters: lineup.starters,
    subs: lineup.subs,
    clubTheme: editorialTheme,
    setStatus: squad.setStatus,
  })

  useEffect(() => {
    try {
      const savedDrafts = JSON.parse(localStorage.getItem(WORKSPACE_DRAFT_KEY) || 'null')
      if (savedDrafts?.version === 2 && savedDrafts.drafts) {
        const mode = savedDrafts.activeMode || 'current-team'
        const draft = savedDrafts.drafts[mode]
        setModeDrafts(savedDrafts.drafts)
        if (draft?.lineup) {
          setCreationMode(mode)
          setFreePlayers(draft.players || [])
          setNationalTeam(draft.nationalTeam || null)
          if (mode === 'current-team' && draft.team) squad.restoreDraft(draft)
          lineup.restoreDraft(draft.lineup, { players: draft.players || [] })
        }
      } else {
        const legacyDraft = JSON.parse(localStorage.getItem(LEGACY_WORKSPACE_DRAFT_KEY) || 'null')
        if (legacyDraft?.version === 1 && squad.restoreDraft(legacyDraft)) {
          lineup.restoreDraft(legacyDraft.lineup, { type: LineupType.CURRENT_TEAM, context: { type: ReferenceContextType.TEAM, id: legacyDraft.team.id, name: legacyDraft.team.name }, players: legacyDraft.players })
        }
      }
    } catch {
      localStorage.removeItem(WORKSPACE_DRAFT_KEY)
    }
    window.setTimeout(() => setIsDraftReady(true), 0)
  }, [])

  useEffect(() => {
    if (!isDraftReady) return
    const players = creationMode === 'current-team' ? squad.players : freePlayers
    const draft = { lineup: lineup.toDraft(), players, team: creationMode === 'current-team' ? squad.team : null, nationalTeam: creationMode === 'national-team' ? nationalTeam : null }
    setModeDrafts((current) => ({ ...current, [creationMode]: draft }))
  }, [isDraftReady, creationMode, freePlayers, lineup.lineup, nationalTeam, squad.players, squad.team])

  useEffect(() => {
    if (!isDraftReady) return
    localStorage.setItem(WORKSPACE_DRAFT_KEY, JSON.stringify({ version: 2, activeMode: creationMode, drafts: modeDrafts }))
  }, [creationMode, isDraftReady, modeDrafts])

  const selectTeam = (item) => squad.selectTeam(item, {
    onTeamChange: () => {
      lineup.beginNewTeamLineup({
        context: { type: ReferenceContextType.TEAM, id: item.team.id, name: item.team.name },
      })
      transfers.resetForTeamChange()
      setMarketReplacementSlot(null)
    },
    onTeamReady: ({ latestLineup, players }) => {
      lineup.applySuggestedLineup(latestLineup, players)
    },
  })

  const resetTeamContext = () => squad.resetTeamContext(() => {
    lineup.resetLineup()
    transfers.closeMarket()
    setMarketReplacementSlot(null)
  })
  const addFreePlayer = (player, destination) => {
    if (creationMode === 'national-team' && !belongsToNationalTeam(player, nationalTeam)) {
      setPlayerSearchStatus({ loading: false, message: `${player.name} no pertenece a ${nationalTeam?.name || 'la selección elegida'}.` })
      return
    }
    setFreePlayers((current) => current.some((item) => item.id === player.id) ? current : [...current, player])
    if (destination === 'bench') lineup.addToBench(player)
    else lineup.addToStarting(player)
  }
  const searchFreePlayers = async (event) => {
    event.preventDefault()
    const query = playerQuery.trim()
    if (query.length < 3) {
      setPlayerResults([])
      setPlayerSearchStatus({ loading: false, message: 'Escribe al menos 3 caracteres.' })
      return
    }
    const requestId = ++playerSearchRequestRef.current
    setPlayerSearchStatus({ loading: true, message: '' })
    try {
      const results = await searchPlayers(query)
      if (requestId !== playerSearchRequestRef.current) return
      const eligibleResults = creationMode === 'national-team'
        ? results.filter((player) => belongsToNationalTeam(player, nationalTeam))
        : results
      setPlayerResults(eligibleResults)
      setPlayerSearchStatus({ loading: false, message: eligibleResults.length ? '' : creationMode === 'national-team' ? `No encontramos jugadores de ${nationalTeam?.name} para esa búsqueda.` : 'No encontramos jugadores para esa búsqueda.' })
    } catch (error) { if (requestId === playerSearchRequestRef.current) setPlayerSearchStatus({ loading: false, message: error.message }) }
  }
  const searchNationalTeams = async (event) => {
    event.preventDefault()
    const query = nationalQuery.trim()
    if (query.length < 2) return
    setNationalStatus({ loading: true, message: '' })
    try {
      const results = (await searchTeams(query)).filter(isSeniorNationalTeam)
      setNationalTeams(results)
      setNationalStatus({ loading: false, message: results.length ? '' : 'No encontramos una selección absoluta para ese país.' })
    } catch (error) { setNationalStatus({ loading: false, message: error.message }) }
  }
  const selectNationalTeam = async (item) => {
    setNationalStatus({ loading: true, message: '' })
    try {
      const players = await getNationalTeamPlayers(item.team.id)
      setNationalTeam(item.team)
      setFreePlayers(players)
      setNationalTeams([])
      lineup.beginLineup({ type: LineupType.NATIONAL_TEAM, context: { type: ReferenceContextType.NATIONAL_TEAM, id: item.team.id, name: item.team.name }, players })
      setNationalStatus({ loading: false, message: players.length ? '' : 'El proveedor no tiene convocados actuales para esta selección.' })
    } catch (error) { setNationalStatus({ loading: false, message: error.message }) }
  }
  const selectCreationMode = (mode) => {
    if (mode === creationMode) return
    playerSearchRequestRef.current += 1
    const currentDraft = { lineup: lineup.toDraft(), players: creationMode === 'current-team' ? squad.players : freePlayers, team: creationMode === 'current-team' ? squad.team : null, nationalTeam: creationMode === 'national-team' ? nationalTeam : null }
    const nextDraft = modeDrafts[mode]
    setModeDrafts((current) => ({ ...current, [creationMode]: currentDraft }))
    setCreationMode(mode)
    setPlayerQuery('')
    setPlayerResults([])
    setPlayerSearchStatus({ loading: false, message: '' })
    setNationalStatus({ loading: false, message: '' })
    setFreePlayers([])
    setNationalTeam(null)
    setNationalTeams([])
    squad.resetTeamContext()
    transfers.resetForTeamChange()
    if (nextDraft?.lineup) {
      const restoredPlayers = nextDraft.players || []
      setFreePlayers(restoredPlayers)
      setNationalTeam(nextDraft.nationalTeam || null)
      if (mode === 'current-team' && nextDraft.team) squad.restoreDraft(nextDraft)
      lineup.restoreDraft(nextDraft.lineup, { players: restoredPlayers })
      return
    }
    if (mode === 'custom') lineup.beginLineup({ type: LineupType.CUSTOM })
    if (mode === 'national-team') lineup.beginLineup({ type: LineupType.NATIONAL_TEAM })
  }
  const activeTeam = activeContextTeam
  const canEdit = creationMode === 'current-team' ? Boolean(squad.team) : creationMode === 'custom' || Boolean(nationalTeam)
  const activePlayerSlot = lineup.slots.find((slot) => slot.id === lineup.selectedPlayerSlot)
  const activePlayer = activePlayerSlot ? lineup.starters[activePlayerSlot.id] : null

  const openMarketForReplacement = () => {
    setMarketReplacementSlot(activePlayerSlot?.id || null)
    lineup.closePlayerActions()
    transfers.setMarketOpen(true)
    window.setTimeout(() => document.querySelector('.transfer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const clearLineup = () => {
    if (window.confirm('¿Vaciar el once titular y el banquillo? Esta acción conserva la plantilla disponible.')) lineup.resetLineup()
  }

  const focusBenchPicker = () => {
    const selectorId = creationMode === 'current-team' ? 'squad-player-search' : 'player-pool-search'
    document.getElementById(selectorId)?.focus()
  }

  const discardCurrentDraft = () => {
    if (!window.confirm('¿Descartar el borrador de este modo? Se vaciará el once y el banquillo.')) return
    setModeDrafts((current) => {
      const next = { ...current }
      delete next[creationMode]
      return next
    })
    setPlayerQuery('')
    setPlayerResults([])
    setPlayerSearchStatus({ loading: false, message: '' })
    if (creationMode === 'current-team') {
      squad.resetTeamContext()
      lineup.beginLineup({ type: LineupType.CURRENT_TEAM })
    } else if (creationMode === 'national-team') {
      setFreePlayers([])
      setNationalTeam(null)
      setNationalTeams([])
      lineup.beginLineup({ type: LineupType.NATIONAL_TEAM })
    } else {
      setFreePlayers([])
      lineup.beginLineup({ type: LineupType.CUSTOM })
    }
  }

  const themeVariables = Object.fromEntries(Object.entries(editorialTheme).map(([key, value]) => [`--club-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value]))
  return <>
    <AppHeader onReset={discardCurrentDraft} />
    <CreationModes activeMode={creationMode} onSelect={selectCreationMode} />
    <main className={`app-shell ${activeTeam ? 'app-shell--club-themed' : ''}`} style={themeVariables}>
    <EditorialIntro team={activeTeam} startersCount={lineup.startersCount} subsCount={lineup.subs.length} />
    {creationMode === 'national-team' && <NationalTeamPicker query={nationalQuery} teams={nationalTeams} selectedTeam={nationalTeam} isLoading={nationalStatus.loading} onQueryChange={setNationalQuery} onSearch={searchNationalTeams} onSelect={selectNationalTeam} />}
    {squad.status.message && <p className="notice" role="status">{squad.status.message}</p>}
    {creationMode === 'current-team' && squad.isTeamLoading && <WorkspaceSkeleton />}
    {(creationMode === 'current-team' || canEdit) && !(creationMode === 'current-team' && squad.isTeamLoading) && <section className="lineup-workspace" data-testid="lineup-workspace">
      <div className="lineup-board">
        <LineupPitch team={activeTeam} formation={lineup.formation} formations={formations} slots={lineup.slots} starters={lineup.starters} startersCount={lineup.startersCount} subsCount={lineup.subs.length} selectedSlot={lineup.selectedSlot} selectedPlayerSlot={lineup.selectedPlayerSlot} recentPlayerId={lineup.recentPlayerId} draggedPlayer={lineup.draggedPlayer} touchDrag={lineup.touchDrag} isSharing={share.isSharing} shareFile={share.shareFile} canShare={lineup.startersCount + lineup.subs.length > 0} onShare={share.shareLineup} onSharePrepared={share.sharePreparedImage} onClearLineup={clearLineup} onFormationChange={lineup.updateFormation} onAllowDrop={lineup.allowDrop} onDropSlot={lineup.dropOnSlot} onSelectSlot={lineup.selectSlot} onOpenPlayerActions={lineup.openPlayerActions} onClearPlayer={lineup.clearPlayer} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onPointerDown={lineup.beginTouchMove} onPointerMove={lineup.moveTouchPlayer} onPointerUp={lineup.endTouchMove} onPointerCancel={lineup.endTouchMove} shouldSuppressTap={lineup.shouldSuppressTap} />
        <Bench subs={lineup.subs} selectedSlot={lineup.selectedSlot} touchDrag={lineup.touchDrag} onAllowDrop={lineup.allowDrop} onDrop={lineup.dropOnBench} onClearPlayer={lineup.clearPlayer} onPromotePlayer={lineup.addToStarting} onPointerDown={lineup.beginTouchMove} onPointerMove={lineup.moveTouchPlayer} onPointerUp={lineup.endTouchMove} onPointerCancel={lineup.endTouchMove} onRequestBenchPlayer={focusBenchPicker} />
      </div>
      {creationMode === 'current-team' ? <aside className="lineup-roster"><SquadPanel team={squad.team} players={squad.players} visiblePlayers={squad.visiblePlayers} positionFilter={squad.positionFilter} playerQuery={squad.playerQuery} squadMetrics={squad.squadMetrics} isLoading={squad.isTeamLoading} assignedIds={lineup.assignedIds} starters={lineup.starters} saleDraft={transfers.saleDraft} saleQuote={transfers.saleQuote} onFilterChange={squad.setPositionFilter} onPlayerQueryChange={squad.setPlayerQuery} onResetLineup={clearLineup} onClearFilters={() => { squad.setPlayerQuery(''); squad.setPositionFilter('All') }} onAddToStarting={lineup.addToStarting} onAddToBench={lineup.addToBench} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onPointerDown={lineup.beginTouchMove} onPointerMove={lineup.moveTouchPlayer} onPointerUp={lineup.endTouchMove} onPointerCancel={lineup.endTouchMove} onStartSale={transfers.startSale} onCancelSale={() => transfers.setSaleDraft(null)} onConfirmSale={transfers.confirmSale}><TeamPicker query={squad.query} teams={squad.teams} selectedTeam={squad.team || squad.pendingTeam} isLoading={squad.searchStatus.loading} onQueryChange={squad.setQuery} onSearch={squad.handleSearch} onSelectTeam={selectTeam} onClearTeam={resetTeamContext} /></SquadPanel></aside> : <div className="lineup-roster"><PlayerPoolPanel label={creationMode === 'national-team' ? `${nationalTeam.name.toUpperCase()} · CONVOCATORIA` : 'JUGADORES'} players={freePlayers} results={playerResults} query={playerQuery} isLoading={playerSearchStatus.loading} message={playerSearchStatus.message || nationalStatus.message} assignedIds={lineup.assignedIds} starters={lineup.starters} onQueryChange={setPlayerQuery} onSearch={searchFreePlayers} onAddToStarting={(player) => addFreePlayer(player, 'starting')} onAddToBench={(player) => addFreePlayer(player, 'bench')} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onPointerDown={lineup.beginTouchMove} onPointerMove={lineup.moveTouchPlayer} onPointerUp={lineup.endTouchMove} onPointerCancel={lineup.endTouchMove} searchLabel={creationMode === 'national-team' ? `Buscar jugadores de ${nationalTeam.name}` : undefined} /></div>}
    </section>}
    {!squad.isTeamLoading && squad.team && <TransferMarket isOpen={transfers.marketOpen} mode={transfers.marketMode} query={transfers.marketQuery} teams={transfers.marketTeams} selectedTeam={transfers.marketTeam} players={transfers.marketPlayers} status={transfers.marketStatus} transferLog={transfers.transferLog} spend={transfers.spend} income={transfers.income} roster={squad.players} signingDraft={transfers.signingDraft} signingQuote={transfers.signingQuote} onToggle={() => { setMarketReplacementSlot(null); transfers.setMarketOpen((current) => !current) }} onModeChange={transfers.changeMarketMode} onQueryChange={transfers.setMarketQuery} onSearch={transfers.handleMarketSearch} onSelectTeam={transfers.selectMarketTeam} onClearSelectedTeam={() => { transfers.setMarketTeam(null); transfers.setMarketPlayers([]) }} onStartSigning={transfers.startSigning} onCancelSigning={() => transfers.setSigningDraft(null)} onConfirmSigning={() => { const signedPlayer = transfers.confirmSigning(); if (signedPlayer && marketReplacementSlot) { lineup.addToStarting(signedPlayer, marketReplacementSlot); setMarketReplacementSlot(null) } }} onUndoTransfer={transfers.undoTransfer} />}
    <ShareLineupCard ref={share.shareCardRef} team={activeTeam} title={creationMode === 'custom' ? 'Mi alineación' : activeTeam?.name} formation={lineup.formation} slots={lineup.slots} starters={lineup.starters} subs={lineup.subs} clubTheme={editorialTheme} />
    {activePlayerSlot && activePlayer && <PlayerQuickActions slot={activePlayerSlot} player={activePlayer} players={editorPlayers} assignedIds={lineup.assignedIds} subs={lineup.subs} onReplace={(player) => lineup.addToStarting(player, activePlayerSlot.id)} onRemove={() => lineup.clearPlayer(activePlayer.id)} onOpenMarket={creationMode === 'current-team' ? openMarketForReplacement : () => lineup.closePlayerActions()} onClose={lineup.closePlayerActions} />}
    {lineup.touchDrag && <div className="lineup-drag-ghost" style={{ left: lineup.touchDrag.x, top: lineup.touchDrag.y }} aria-hidden="true"><span className="lineup-drag-ghost__kicker">{lineup.touchDrag.player.position} / {lineup.touchDrag.player.nationality || 'JUGADOR'}</span><Avatar player={lineup.touchDrag.player} /><span className="lineup-drag-ghost__number">{String(lineup.touchDrag.player.number ?? '').padStart(2, '0')}</span><strong>{lineup.touchDrag.player.name}</strong><small>SUELTA PARA COLOCAR</small></div>}
    </main>
    <section className="editorial-bottom-note">
      <span className="editorial-bottom-note__asterisk" aria-hidden="true">✳</span>
      <h2>No hay un once definitivo.<br /><em>Hay uno que quieres contar.</em></h2>
      <p>Guarda la imagen de tu equipo<br />y lleva la conversación fuera del campo.</p>
    </section>
    <footer className="editorial-footer">
      <a className="editorial-footer__brand" href="#root" aria-label="Volver al inicio">lineup<span>●</span></a>
      <span className="editorial-footer__claim">HECHO PARA QUIENES NUNCA DEJAN DE HABLAR DE FÚTBOL.</span>
      <a className="editorial-footer__top" href="#root">Volver arriba ↗</a>
      <div className="footer-theme-switcher" aria-label="Apariencia"><button className={squad.theme === 'light' ? 'is-active' : ''} onClick={() => squad.setTheme('light')}>Claro</button><button className={squad.theme === 'dark' ? 'is-active' : ''} onClick={() => squad.setTheme('dark')}>Oscuro</button></div>
    </footer>
  </>
}

export default App
