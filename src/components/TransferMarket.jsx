import { positionNames } from '../data'
import { euro } from '../utils/formatters'
import { formatValue } from '../utils/transferValues'
import { Avatar } from './Avatar'

function PlayerFacts({ player }) {
  const facts = [
    `${positionNames[player.position] || player.position} · #${player.number ?? '—'}`,
    player.age !== null && player.age !== undefined ? `${player.age} años` : null,
    player.nationality || null,
  ].filter(Boolean)
  const hasValuation = typeof player.marketValue === 'number' || typeof player.releaseClause === 'number'

  return <>
    <span>{facts.join(' · ')}</span>
    {player.club?.name && <small className="market-player-club">{player.club.name}</small>}
    {hasValuation && <small className="market-player-value">VM {formatValue(player.marketValue)}{typeof player.releaseClause === 'number' ? ` · Cláusula ${formatValue(player.releaseClause)}` : ''}</small>}
  </>
}

function TransferQuote({ quote, loading, onConfirm, onCancel, confirmLabel }) {
  return <div className="transfer-quote" aria-live="polite">
    <div><span>Valor de mercado</span><b>{formatValue(quote.marketValue)}</b></div>
    {quote.releaseClause !== null && <div><span>Cláusula</span><b>{formatValue(quote.releaseClause)}</b></div>}
    {quote.contractYears !== null && <div><span>Contrato restante</span><b>{quote.contractYears === 0 ? 'Vencido' : `${quote.contractYears} ${quote.contractYears === 1 ? 'año' : 'años'}`}</b></div>}
    <strong>{loading ? 'Calculando…' : `${quote.label}: ${formatValue(quote.amount)}`}</strong>
    {!loading && <small>{quote.detail}</small>}
    <div className="transfer-quote-actions"><button disabled={loading || !quote.available} onClick={onConfirm}>{confirmLabel}</button><button className="cancel-price" onClick={onCancel} aria-label="Cancelar operación">×</button></div>
  </div>
}

export function TransferMarket({
  isOpen,
  mode,
  query,
  teams,
  selectedTeam,
  players,
  status,
  transferLog,
  spend,
  income,
  roster,
  signingDraft,
  signingQuote,
  onToggle,
  onModeChange,
  onQueryChange,
  onSearch,
  onSelectTeam,
  onClearSelectedTeam,
  onStartSigning,
  onCancelSigning,
  onConfirmSigning,
  onUndoTransfer,
}) {
  return <section className="transfer-panel">
    <div className="transfer-heading"><div><p className="eyebrow">MERCADO</p><h2>Fichajes y ventas</h2></div><div className="transfer-balance"><span>GASTO <b>{euro.format(spend)}</b></span><span>INGRESOS <b>{euro.format(income)}</b></span><strong>NETO {euro.format(income - spend)}</strong></div><button className="market-toggle" onClick={onToggle}>{isOpen ? 'Cerrar mercado' : '+ Nuevo fichaje'}</button></div>
    {transferLog.length > 0 && <div className="transfer-log">{transferLog.map((transfer) => <article className={`transfer-log-item transfer-log-item--${transfer.type}`} key={transfer.id}><Avatar player={transfer.player} small /><div><strong>{transfer.player.name}</strong><span>VM {formatValue(transfer.marketValue)} · {transfer.type === 'signing' ? 'Compra' : 'Venta'} {euro.format(transfer.price)}</span></div><button onClick={() => onUndoTransfer(transfer)}>Deshacer</button></article>)}</div>}
    {isOpen && <div className="market-body">
      <form className="market-search" onSubmit={onSearch}>
        <label htmlFor="market-search">Buscar fichajes</label>
        <div className="market-mode"><button type="button" className={mode === 'player' ? 'is-active' : ''} onClick={() => onModeChange('player')}>Por jugador</button><button type="button" className={mode === 'team' ? 'is-active' : ''} onClick={() => onModeChange('team')}>Por club</button></div>
        <div><input id="market-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={mode === 'player' ? 'Ej. Lamine Yamal, Mbappé…' : 'Busca otro equipo…'} /><button type="submit" disabled={status.loading}>{status.loading ? '…' : 'Buscar'}</button></div>
      </form>
      {selectedTeam && <div className="market-club"><img src={selectedTeam.logo} alt="" /><span>Plantilla de {selectedTeam.name}</span><button onClick={onClearSelectedTeam} aria-label="Cerrar plantilla">×</button></div>}
      {teams.length > 0 && <div className="market-teams">{teams.map((item) => <button key={item.team.id} onClick={() => onSelectTeam(item)}><img src={item.team.logo} alt="" />{item.team.name}</button>)}</div>}
      {status.message && <p className="market-notice">{status.message}</p>}
      {players.length > 0 && <div className="market-players">{players.map((player) => {
        const isAlreadyInRoster = roster.some((item) => item.id === player.id)
        const isEditing = signingDraft?.player.id === player.id
        return <article className="market-player" key={player.id}><Avatar player={player} /><div><strong>{player.name}</strong><PlayerFacts player={player} /></div>{isAlreadyInRoster ? <small>En plantilla</small> : isEditing ? <TransferQuote quote={signingQuote} loading={signingDraft.loading} onConfirm={onConfirmSigning} onCancel={onCancelSigning} confirmLabel="Fichar" /> : <button className="buy-player" onClick={() => onStartSigning(player)}>Fichar</button>}</article>
      })}</div>}
    </div>}
  </section>
}
