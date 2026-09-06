import { useEffect, useState } from 'react'
import { getHistoricalFormerTeams, getNationalTeamPlayers, searchHistoricalPlayers, searchPlayers, searchTeams } from './api'
import { Avatar } from './components/Avatar'
import { AppHeader } from './components/AppHeader'
import { Bench } from './components/Bench'
import { CreationModes } from './components/CreationModes'
import { HistoricalScopePicker } from './components/HistoricalScopePicker'
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

const WORKSPACE_DRAFT_KEY = 'lineup-workspace-draft-v1'

function App() {
  const [isDraftReady, setIsDraftReady] = useState(false)
  const [marketReplacementSlot, setMarketReplacementSlot] = useState(null)
  const squad = useSquad()
  const [creationMode, setCreationMode] = useState('current-team')
  const [freePlayers, setFreePlayers] = useState([])
  const [playerQuery, setPlayerQuery] = useState('')
  const [playerResults, setPlayerResults] = useState([])
  const [playerSearchStatus, setPlayerSearchStatus] = useState({ loading: false, message: '' })
  const [historicalCountry, setHistoricalCountry] = useState('')
  const [historicalScopeInput, setHistoricalScopeInput] = useState('')
  const [historicalScope, setHistoricalScope] = useState(null)
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
  const share = useShareLineup({
    team: creationMode === 'current-team' ? squad.team : nationalTeam,
    formation: lineup.formation,
    starters: lineup.starters,
    subs: lineup.subs,
    clubTheme: squad.clubTheme,
    setStatus: squad.setStatus,
  })

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(WORKSPACE_DRAFT_KEY) || 'null')
      if (draft?.version === 1 && squad.restoreDraft(draft) && lineup.restoreDraft(draft.lineup, {
        type: LineupType.CURRENT_TEAM,
        context: { type: ReferenceContextType.TEAM, id: draft.team.id, name: draft.team.name },
        players: draft.players,
      })) {
        // El borrador restaurado es siempre trabajo del usuario, nunca una base oficial que podamos reemplazar.
      }
    } catch {
      localStorage.removeItem(WORKSPACE_DRAFT_KEY)
    }
    window.setTimeout(() => setIsDraftReady(true), 0)
  }, [])

  useEffect(() => {
    if (!isDraftReady) return
    if (!squad.team) {
      localStorage.removeItem(WORKSPACE_DRAFT_KEY)
      return
    }
    localStorage.setItem(WORKSPACE_DRAFT_KEY, JSON.stringify({
      version: 1,
      team: squad.team,
      players: squad.players,
      lineup: lineup.toDraft(),
    }))
  }, [isDraftReady, lineup.lineup, squad.players, squad.team])

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
  const addFreePlayer = async (player, destination) => {
    const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]/g, '')
    const countryAliases = { espana: 'spain', brasil: 'brazil', alemania: 'germany', inglaterra: 'england', francia: 'france', italia: 'italy', paisesbajos: 'netherlands' }
    const matches = (left, right) => {
      const normalizedLeft = countryAliases[normalize(left)] || normalize(left)
      const normalizedRight = countryAliases[normalize(right)] || normalize(right)
      return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)
    }
    if (creationMode === 'historical-country' && !matches(player.nationality, historicalScope?.value)) {
      setPlayerSearchStatus({ loading: false, message: `${player.name} no tiene nacionalidad ${historicalScope?.value}.` })
      return
    }
    if (creationMode === 'historical-club') {
      try {
        const formerTeams = await getHistoricalFormerTeams(player.externalId)
        if (!matches(player.club?.name, historicalScope?.value) && !formerTeams.some((team) => matches(team.name, historicalScope?.value))) {
          setPlayerSearchStatus({ loading: false, message: `${player.name} no figura con paso por ${historicalScope?.value}.` })
          return
        }
        player = { ...player, historical: { ...player.historical, formerTeams } }
      } catch (error) {
        setPlayerSearchStatus({ loading: false, message: error.message })
        return
      }
    }
    setFreePlayers((current) => current.some((item) => item.id === player.id) ? current : [...current, player])
    if (destination === 'bench') lineup.addToBench(player)
    else lineup.addToStarting(player)
  }
  const confirmHistoricalScope = (event) => {
    event.preventDefault()
    const value = historicalScopeInput.trim()
    if (value.length < 2) return
    const kind = creationMode === 'historical-country' ? 'country' : 'club'
    setHistoricalScope({ kind, value })
    lineup.beginLineup({
      type: kind === 'country' ? LineupType.HISTORICAL_COUNTRY : LineupType.HISTORICAL_CLUB,
      metadata: { historicalRestriction: { kind, value } },
    })
  }
  const searchFreePlayers = async (event) => {
    event.preventDefault()
    const query = playerQuery.trim()
    if (query.length < 3) {
      setPlayerResults([])
      setPlayerSearchStatus({ loading: false, message: 'Escribe al menos 3 caracteres.' })
      return
    }
    setPlayerSearchStatus({ loading: true, message: '' })
    try {
      const results = creationMode.startsWith('historical-') ? await searchHistoricalPlayers(query) : await searchPlayers(query)
      setPlayerResults(results)
      setPlayerSearchStatus({ loading: false, message: results.length ? '' : 'No encontramos jugadores para esa búsqueda.' })
    } catch (error) { setPlayerSearchStatus({ loading: false, message: error.message }) }
  }
  const searchNationalTeams = async (event) => {
    event.preventDefault()
    const query = nationalQuery.trim()
    if (query.length < 2) return
    setNationalStatus({ loading: true, message: '' })
    try {
      const results = await searchTeams(query)
      setNationalTeams(results)
      setNationalStatus({ loading: false, message: results.length ? '' : 'No encontramos esa selección.' })
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
    setCreationMode(mode)
    setPlayerQuery('')
    setPlayerResults([])
    setHistoricalCountry('')
    setHistoricalScopeInput('')
    setHistoricalScope(null)
    setFreePlayers([])
    setNationalTeam(null)
    setNationalTeams([])
    squad.resetTeamContext()
    transfers.resetForTeamChange()
    if (mode === 'custom') lineup.beginLineup({ type: LineupType.CUSTOM })
    if (mode === 'national-team') lineup.beginLineup({ type: LineupType.NATIONAL_TEAM })
    if (mode === 'historical-free') lineup.beginLineup({ type: LineupType.HISTORICAL_FREE })
  }
  const activeTeam = creationMode === 'current-team' ? squad.team : nationalTeam
  const canEdit = creationMode === 'current-team' ? Boolean(squad.team) : creationMode === 'custom' || creationMode === 'historical-free' || (creationMode.startsWith('historical-') ? Boolean(historicalScope) : Boolean(nationalTeam))
  const historicalCountries = [...new Set(playerResults.map((player) => player.nationality).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'es'))
  const displayedPlayerResults = creationMode === 'historical-free' && historicalCountry
    ? playerResults.filter((player) => player.nationality === historicalCountry)
    : playerResults
  const activePlayerSlot = lineup.slots.find((slot) => slot.id === lineup.selectedPlayerSlot)
  const activePlayer = activePlayerSlot ? lineup.starters[activePlayerSlot.id] : null

  const openMarketForReplacement = () => {
    setMarketReplacementSlot(activePlayerSlot?.id || null)
    lineup.closePlayerActions()
    transfers.setMarketOpen(true)
    window.setTimeout(() => document.querySelector('.transfer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  return <main className={`app-shell ${squad.team ? 'app-shell--club-themed' : ''}`} style={{ '--club-primary': squad.clubTheme.primary }}>
    <AppHeader team={activeTeam} startersCount={lineup.startersCount} subsCount={lineup.subs.length} theme={squad.theme} onThemeChange={squad.setTheme} />
    <CreationModes activeMode={creationMode} onSelect={selectCreationMode} />
    {creationMode === 'current-team' && <TeamPicker query={squad.query} teams={squad.teams} selectedTeam={squad.team || squad.pendingTeam} isLoading={squad.searchStatus.loading} onQueryChange={squad.setQuery} onSearch={squad.handleSearch} onSelectTeam={selectTeam} onClearTeam={resetTeamContext} />}
    {creationMode === 'national-team' && <NationalTeamPicker query={nationalQuery} teams={nationalTeams} selectedTeam={nationalTeam} isLoading={nationalStatus.loading} onQueryChange={setNationalQuery} onSearch={searchNationalTeams} onSelect={selectNationalTeam} />}
    {(creationMode === 'historical-country' || creationMode === 'historical-club') && <HistoricalScopePicker kind={creationMode === 'historical-country' ? 'country' : 'club'} value={historicalScopeInput} onChange={setHistoricalScopeInput} onConfirm={confirmHistoricalScope} />}
    {squad.status.message && <p className="notice" role="status">{squad.status.message}</p>}
    {creationMode === 'current-team' && squad.isTeamLoading && <WorkspaceSkeleton />}
    {canEdit && !(creationMode === 'current-team' && squad.isTeamLoading) && <section className="workspace">
      <LineupPitch team={activeTeam} formation={lineup.formation} formations={formations} slots={lineup.slots} starters={lineup.starters} startersCount={lineup.startersCount} subsCount={lineup.subs.length} selectedSlot={lineup.selectedSlot} selectedPlayerSlot={lineup.selectedPlayerSlot} recentPlayerId={lineup.recentPlayerId} draggedPlayer={lineup.draggedPlayer} touchDrag={lineup.touchDrag} isSharing={share.isSharing} shareFile={share.shareFile} onShare={share.shareLineup} onSharePrepared={share.sharePreparedImage} onFormationChange={lineup.updateFormation} onAllowDrop={lineup.allowDrop} onDropSlot={lineup.dropOnSlot} onSelectSlot={lineup.selectSlot} onOpenPlayerActions={lineup.openPlayerActions} onClearPlayer={lineup.clearPlayer} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onPointerDown={lineup.beginTouchMove} onPointerMove={lineup.moveTouchPlayer} onPointerUp={lineup.endTouchMove} onPointerCancel={lineup.endTouchMove} shouldSuppressTap={lineup.shouldSuppressTap} />
      {creationMode === 'current-team' ? <SquadPanel team={squad.team} players={squad.players} visiblePlayers={squad.visiblePlayers} positionFilter={squad.positionFilter} playerQuery={squad.playerQuery} squadMetrics={squad.squadMetrics} isLoading={squad.isTeamLoading} assignedIds={lineup.assignedIds} starters={lineup.starters} saleDraft={transfers.saleDraft} saleQuote={transfers.saleQuote} onFilterChange={squad.setPositionFilter} onPlayerQueryChange={squad.setPlayerQuery} onResetLineup={lineup.resetLineup} onAddToStarting={lineup.addToStarting} onAddToBench={lineup.addToBench} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onStartSale={transfers.startSale} onCancelSale={() => transfers.setSaleDraft(null)} onConfirmSale={transfers.confirmSale} /> : <PlayerPoolPanel label={creationMode === 'national-team' ? `${nationalTeam.name.toUpperCase()} · CONVOCATORIA` : creationMode === 'historical-free' ? 'JUGADORES HISTÓRICOS' : `HISTÓRICOS · ${historicalScope?.value || ''}`} players={freePlayers} results={displayedPlayerResults} query={playerQuery} isLoading={playerSearchStatus.loading} message={playerSearchStatus.message || nationalStatus.message} assignedIds={lineup.assignedIds} starters={lineup.starters} onQueryChange={setPlayerQuery} onSearch={searchFreePlayers} onAddToStarting={(player) => addFreePlayer(player, 'starting')} onAddToBench={(player) => addFreePlayer(player, 'bench')} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} searchEnabled={creationMode !== 'national-team'} countryFilter={historicalCountry} countries={creationMode === 'historical-free' ? historicalCountries : []} onCountryFilterChange={creationMode === 'historical-free' ? setHistoricalCountry : undefined} />}
    </section>}
    {canEdit && !(creationMode === 'current-team' && squad.isTeamLoading) && <Bench subs={lineup.subs} selectedSlot={lineup.selectedSlot} onAllowDrop={lineup.allowDrop} onDrop={lineup.dropOnBench} onClearPlayer={lineup.clearPlayer} onPromotePlayer={lineup.addToStarting} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} />}
    {!squad.isTeamLoading && squad.team && <TransferMarket isOpen={transfers.marketOpen} mode={transfers.marketMode} query={transfers.marketQuery} teams={transfers.marketTeams} selectedTeam={transfers.marketTeam} players={transfers.marketPlayers} status={transfers.marketStatus} transferLog={transfers.transferLog} spend={transfers.spend} income={transfers.income} roster={squad.players} signingDraft={transfers.signingDraft} signingQuote={transfers.signingQuote} onToggle={() => { setMarketReplacementSlot(null); transfers.setMarketOpen((current) => !current) }} onModeChange={transfers.changeMarketMode} onQueryChange={transfers.setMarketQuery} onSearch={transfers.handleMarketSearch} onSelectTeam={transfers.selectMarketTeam} onClearSelectedTeam={() => { transfers.setMarketTeam(null); transfers.setMarketPlayers([]) }} onStartSigning={transfers.startSigning} onCancelSigning={() => transfers.setSigningDraft(null)} onConfirmSigning={() => { const signedPlayer = transfers.confirmSigning(); if (signedPlayer && marketReplacementSlot) { lineup.addToStarting(signedPlayer, marketReplacementSlot); setMarketReplacementSlot(null) } }} onUndoTransfer={transfers.undoTransfer} />}
    <footer>LINEUP · Construye, ajusta y comparte tu equipo ideal.</footer>
    <ShareLineupCard ref={share.shareCardRef} team={activeTeam} formation={lineup.formation} slots={lineup.slots} starters={lineup.starters} subs={lineup.subs} clubTheme={squad.clubTheme} />
    {activePlayerSlot && activePlayer && <PlayerQuickActions slot={activePlayerSlot} player={activePlayer} players={editorPlayers} assignedIds={lineup.assignedIds} subs={lineup.subs} onReplace={(player) => lineup.addToStarting(player, activePlayerSlot.id)} onRemove={() => lineup.clearPlayer(activePlayer.id)} onOpenMarket={creationMode === 'current-team' ? openMarketForReplacement : () => lineup.closePlayerActions()} onClose={lineup.closePlayerActions} />}
    {lineup.touchDrag && <div className="touch-drag-ghost" style={{ left: lineup.touchDrag.x, top: lineup.touchDrag.y }} aria-hidden="true"><Avatar player={lineup.touchDrag.player} small /><span>{lineup.touchDrag.player.name}</span></div>}
  </main>
}

export default App
