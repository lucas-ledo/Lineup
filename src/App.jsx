import { Avatar } from './components/Avatar'
import { AppHeader } from './components/AppHeader'
import { Bench } from './components/Bench'
import { LineupPitch } from './components/LineupPitch'
import { ShareLineupCard } from './components/ShareLineupCard'
import { SquadPanel } from './components/SquadPanel'
import { TeamPicker } from './components/TeamPicker'
import { TransferMarket } from './components/TransferMarket'
import { formations } from './data'
import { useLineup } from './hooks/useLineup'
import { useShareLineup } from './hooks/useShareLineup'
import { useSquad } from './hooks/useSquad'
import { useTransfers } from './hooks/useTransfers'

function App() {
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

  const selectTeam = (item) => squad.selectTeam(item, () => {
    lineup.resetLineup()
    transfers.resetForTeamChange()
  })

  const resetTeamContext = () => squad.resetTeamContext(() => {
    lineup.resetLineup()
    transfers.closeMarket()
  })

  return <main className={`app-shell ${squad.team ? 'app-shell--club-themed' : ''}`} style={{ '--club-primary': squad.clubTheme.primary }}>
    <AppHeader team={squad.team} startersCount={lineup.startersCount} subsCount={lineup.subs.length} theme={squad.theme} onThemeChange={squad.setTheme} />
    <TeamPicker query={squad.query} teams={squad.teams} selectedTeam={squad.team || squad.pendingTeam} isLoading={squad.status.loading} onQueryChange={squad.setQuery} onSearch={squad.handleSearch} onSelectTeam={selectTeam} onClearTeam={resetTeamContext} />
    {squad.status.message && <p className="notice" role="status">{squad.status.message}</p>}
    {squad.isTeamLoading && <p className="notice" role="status">Preparando plantilla y colores del club…</p>}
    {!squad.isTeamLoading && squad.team && <TransferMarket isOpen={transfers.marketOpen} mode={transfers.marketMode} query={transfers.marketQuery} teams={transfers.marketTeams} selectedTeam={transfers.marketTeam} players={transfers.marketPlayers} status={transfers.marketStatus} transferLog={transfers.transferLog} spend={transfers.spend} income={transfers.income} roster={squad.players} signingDraft={transfers.signingDraft} signingQuote={transfers.signingQuote} onToggle={() => transfers.setMarketOpen((current) => !current)} onModeChange={transfers.changeMarketMode} onQueryChange={transfers.setMarketQuery} onSearch={transfers.handleMarketSearch} onSelectTeam={transfers.selectMarketTeam} onClearSelectedTeam={() => { transfers.setMarketTeam(null); transfers.setMarketPlayers([]) }} onStartSigning={transfers.startSigning} onCancelSigning={() => transfers.setSigningDraft(null)} onConfirmSigning={transfers.confirmSigning} onUndoTransfer={transfers.undoTransfer} />}
    {!squad.isTeamLoading && <section className="workspace">
      <LineupPitch team={squad.team} formation={lineup.formation} formations={formations} slots={lineup.slots} starters={lineup.starters} startersCount={lineup.startersCount} subsCount={lineup.subs.length} selectedSlot={lineup.selectedSlot} draggedPlayer={lineup.draggedPlayer} touchDrag={lineup.touchDrag} isSharing={share.isSharing} shareFile={share.shareFile} onShare={share.shareLineup} onSharePrepared={share.sharePreparedImage} onFormationChange={lineup.updateFormation} onAllowDrop={lineup.allowDrop} onDropSlot={lineup.dropOnSlot} onSelectSlot={lineup.selectSlot} onClearPlayer={lineup.clearPlayer} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onPointerDown={lineup.beginTouchMove} onPointerMove={lineup.moveTouchPlayer} onPointerUp={lineup.endTouchMove} onPointerCancel={lineup.endTouchMove} shouldSuppressTap={lineup.shouldSuppressTap} />
      <SquadPanel team={squad.team} players={squad.players} visiblePlayers={squad.visiblePlayers} positionFilter={squad.positionFilter} isLoading={squad.status.loading} assignedIds={lineup.assignedIds} starters={lineup.starters} saleDraft={transfers.saleDraft} saleQuote={transfers.saleQuote} onFilterChange={squad.setPositionFilter} onResetLineup={lineup.resetLineup} onAddToStarting={lineup.addToStarting} onAddToBench={lineup.addToBench} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} onStartSale={transfers.startSale} onCancelSale={() => transfers.setSaleDraft(null)} onConfirmSale={transfers.confirmSale} />
    </section>}
    {!squad.isTeamLoading && <Bench subs={lineup.subs} selectedSlot={lineup.selectedSlot} onAllowDrop={lineup.allowDrop} onDrop={lineup.dropOnBench} onClearPlayer={lineup.clearPlayer} onPromotePlayer={lineup.addToStarting} onDragStart={lineup.beginDrag} onDragEnd={lineup.endDrag} />}
    <footer>LINEUP · Construye, ajusta y comparte tu equipo ideal.</footer>
    <ShareLineupCard ref={share.shareCardRef} team={squad.team} formation={lineup.formation} slots={lineup.slots} starters={lineup.starters} subs={lineup.subs} clubTheme={squad.clubTheme} />
    {lineup.touchDrag && <div className="touch-drag-ghost" style={{ left: lineup.touchDrag.x, top: lineup.touchDrag.y }} aria-hidden="true"><Avatar player={lineup.touchDrag.player} small /><span>{lineup.touchDrag.player.name}</span></div>}
  </main>
}

export default App
