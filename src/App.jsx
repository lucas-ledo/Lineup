import { useEffect, useState } from 'react'
import { Avatar } from './components/Avatar'
import { AppHeader } from './components/AppHeader'
import { Bench } from './components/Bench'
import { LineupPitch } from './components/LineupPitch'
import { PlayerQuickActions } from './components/PlayerQuickActions'
import { ShareLineupCard } from './components/ShareLineupCard'
import { SquadPanel } from './components/SquadPanel'
import { TeamPicker } from './components/TeamPicker'
import { TransferMarket } from './components/TransferMarket'
import { WorkspaceSkeleton } from './components/WorkspaceSkeleton'
import { formations } from './data'
import { useLineup } from './hooks/useLineup'
import { useShareLineup } from './hooks/useShareLineup'
import { useSquad } from './hooks/useSquad'
import { useTransfers } from './hooks/useTransfers'

const WORKSPACE_DRAFT_KEY = 'lineup-workspace-draft-v1'

function App() {
  const [isDraftReady, setIsDraftReady] = useState(false)
  const [marketReplacementSlot, setMarketReplacementSlot] = useState(null)
  const squad = useSquad()
  const lineup = useLineup({ players: squad.players, setStatus: squad.setStatus })
  const transfers = useTransfers({
    team: squad.team,
    players: squad.players,
    setPlayers: squad.setPlayers,
    clearPlayer: lineup.clearPlayer,
    setStatus: squad.setStatus,
  })
  const share = useShareLineup({
    team: squad.team,
    formation: lineup.formation,
    starters: lineup.starters,
    subs: lineup.subs,
    clubTheme: squad.clubTheme,
    setStatus: squad.setStatus,
  })

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(WORKSPACE_DRAFT_KEY) || 'null')
      if (draft?.version === 1 && squad.restoreDraft(draft) && lineup.restoreDraft(draft.lineup)) {
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
      lineup: { formation: lineup.formation, starters: lineup.starters, subs: lineup.subs },
    }))
  }, [isDraftReady, lineup.formation, lineup.starters, lineup.subs, squad.players, squad.team])

  const selectTeam = (item) => squad.selectTeam(item, {
    onTeamChange: () => {
      lineup.beginNewTeamLineup()
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
  const activePlayerSlot = lineup.slots.find((slot) => slot.id === lineup.selectedPlayerSlot)
  const activePlayer = activePlayerSlot ? lineup.starters[activePlayerSlot.id] : null

  const openMarketForReplacement = () => {
    setMarketReplacementSlot(activePlayerSlot?.id || null)
    lineup.closePlayerActions()
    transfers.setMarketOpen(true)
    window.setTimeout(() => document.querySelector('.transfer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  return <main className={`app-shell ${squad.team ? 'app-shell--club-themed' : ''}`} style={{ '--club-primary': squad.clubTheme.primary }}>
    <AppHeader team={squad.team} startersCount={lineup.startersCount} subsCount={lineup.subs.length} theme={squad.theme} onThemeChange={squad.setTheme} />
    <TeamPicker query={squad.query} teams={squad.teams} selectedTeam={squad.team || squad.pendingTeam} isLoading={squad.searchStatus.loading} onQueryChange={squad.setQuery} onSearch={squad.handleSearch} onSelectTeam={selectTeam} onClearTeam={resetTeamContext} />
    {squad.status.message && <p className="notice" role="status">{squad.status.message}</p>}
    {squad.isTeamLoading && <WorkspaceSkeleton />}
    {!squad.isTeamLoading && <section className="workspace">
      <LineupPitch team={squad.team} formation={lineup.formation} formations={formations} slots={lineup.slots} starters={lineup.starters} startersCount={lineup.startersCount} subsCount={lineup.subs.length} selectedSlot={lineup.selectedSlot} selectedPlayerSlot={lineup.selectedPlayerSlot} recentPlayerId={lineup.recentPlayerId} draggedPlayer={lineup.draggedPlayer} touchDrag={lineup.touchDrag} isSharing={share.isSharing} shareFile={share.shareFile} onShare={share.shareLineup} onSharePrepared={share.sharePreparedImage} onFormationChange={lineup.updateFormation} onAllowDrop={lineup.allowDrop} onDropSlot={lineup.dropOnSlot} onSelectSlot={lineup.selectSlot} onOpenPlayerActions={lineup.openPlayerActions} onClearPlayer={lineup.clearPlayer} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onPointerDown={lineup.beginTouchMove} onPointerMove={lineup.moveTouchPlayer} onPointerUp={lineup.endTouchMove} onPointerCancel={lineup.endTouchMove} shouldSuppressTap={lineup.shouldSuppressTap} />
      <SquadPanel team={squad.team} players={squad.players} visiblePlayers={squad.visiblePlayers} positionFilter={squad.positionFilter} playerQuery={squad.playerQuery} squadMetrics={squad.squadMetrics} isLoading={squad.isTeamLoading} assignedIds={lineup.assignedIds} starters={lineup.starters} saleDraft={transfers.saleDraft} saleQuote={transfers.saleQuote} onFilterChange={squad.setPositionFilter} onPlayerQueryChange={squad.setPlayerQuery} onResetLineup={lineup.resetLineup} onAddToStarting={lineup.addToStarting} onAddToBench={lineup.addToBench} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onStartSale={transfers.startSale} onCancelSale={() => transfers.setSaleDraft(null)} onConfirmSale={transfers.confirmSale} />
    </section>}
    {!squad.isTeamLoading && <Bench subs={lineup.subs} selectedSlot={lineup.selectedSlot} onAllowDrop={lineup.allowDrop} onDrop={lineup.dropOnBench} onClearPlayer={lineup.clearPlayer} onPromotePlayer={lineup.addToStarting} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} />}
    {!squad.isTeamLoading && squad.team && <TransferMarket isOpen={transfers.marketOpen} mode={transfers.marketMode} query={transfers.marketQuery} teams={transfers.marketTeams} selectedTeam={transfers.marketTeam} players={transfers.marketPlayers} status={transfers.marketStatus} transferLog={transfers.transferLog} spend={transfers.spend} income={transfers.income} roster={squad.players} signingDraft={transfers.signingDraft} signingQuote={transfers.signingQuote} onToggle={() => { setMarketReplacementSlot(null); transfers.setMarketOpen((current) => !current) }} onModeChange={transfers.changeMarketMode} onQueryChange={transfers.setMarketQuery} onSearch={transfers.handleMarketSearch} onSelectTeam={transfers.selectMarketTeam} onClearSelectedTeam={() => { transfers.setMarketTeam(null); transfers.setMarketPlayers([]) }} onStartSigning={transfers.startSigning} onCancelSigning={() => transfers.setSigningDraft(null)} onConfirmSigning={() => { const signedPlayer = transfers.confirmSigning(); if (signedPlayer && marketReplacementSlot) { lineup.addToStarting(signedPlayer, marketReplacementSlot); setMarketReplacementSlot(null) } }} onUndoTransfer={transfers.undoTransfer} />}
    <footer>LINEUP · Construye, ajusta y comparte tu equipo ideal.</footer>
    <ShareLineupCard ref={share.shareCardRef} team={squad.team} formation={lineup.formation} slots={lineup.slots} starters={lineup.starters} subs={lineup.subs} clubTheme={squad.clubTheme} />
    {activePlayerSlot && activePlayer && <PlayerQuickActions slot={activePlayerSlot} player={activePlayer} players={squad.players} assignedIds={lineup.assignedIds} subs={lineup.subs} onReplace={(player) => lineup.addToStarting(player, activePlayerSlot.id)} onRemove={() => lineup.clearPlayer(activePlayer.id)} onOpenMarket={openMarketForReplacement} onClose={lineup.closePlayerActions} />}
    {lineup.touchDrag && <div className="touch-drag-ghost" style={{ left: lineup.touchDrag.x, top: lineup.touchDrag.y }} aria-hidden="true"><Avatar player={lineup.touchDrag.player} small /><span>{lineup.touchDrag.player.name}</span></div>}
  </main>
}

export default App
