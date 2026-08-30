import { forwardRef } from 'react'
import { getInitials } from '../utils/formatters'

function SharePlayer({ player, slot }) {
  return <div className={`share-player ${player ? '' : 'share-player--empty'}`}>
    {player?.photo
      ? <img className="share-player__photo" src={player.photo} crossOrigin="anonymous" alt="" />
      : <span className="share-player__fallback">{player ? getInitials(player.name) : slot.label}</span>}
    <div className="share-player__label">
      <strong>{player?.name || slot.label}</strong>
      <span>{player ? `${player.number ? `#${player.number} · ` : ''}${slot.label}` : 'POR ELEGIR'}</span>
    </div>
  </div>
}

function ShareSub({ player, index }) {
  return <div className="share-sub">
    {player?.photo
      ? <img src={player.photo} crossOrigin="anonymous" alt="" />
      : <span>{player ? getInitials(player.name) : String(index + 1).padStart(2, '0')}</span>}
    <div><strong>{player?.name || 'Suplente disponible'}</strong><small>{player?.number ? `#${player.number}` : 'BANQUILLO'}</small></div>
  </div>
}

export const ShareLineupCard = forwardRef(function ShareLineupCard({ team, formation, slots, starters, subs, clubTheme }, ref) {
  const colors = {
    '--share-primary': clubTheme.primary,
    '--share-on-primary': clubTheme.onPrimary,
    '--share-soft': clubTheme.soft,
  }

  return <section ref={ref} className="share-lineup-card" style={colors} aria-hidden="true">
    <header className="share-card__header"><div className="share-card__brand"><span>LINEUP</span><b>XI</b></div><span>ALINEACIÓN OFICIAL</span></header>
    <section className="share-card__club">
      {team?.logo && <img src={team.logo} crossOrigin="anonymous" alt="" />}
      <div><p>CLUB</p><h1>{team?.name || 'Tu club'}</h1><span>{formation} · ONCE TITULAR</span></div>
      <div className="share-card__color"><i /><small>COLORES DEL CLUB</small></div>
    </section>
    <section className="share-card__pitch">
      <div className="share-card__pitch-lines" />
      {slots.map((slot) => <div key={slot.id} className="share-card__slot" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}><SharePlayer player={starters[slot.id]} slot={slot} /></div>)}
    </section>
    <section className="share-card__bench">
      <div className="share-card__bench-heading"><span>SUPLENTES</span><b>{subs.length}/11</b></div>
      <div className="share-card__subs">{Array.from({ length: 11 }, (_, index) => <ShareSub key={subs[index]?.id || `empty-${index}`} player={subs[index]} index={index} />)}</div>
    </section>
    <footer className="share-card__footer"><span>LINEUP · CREA TU ONCE IDEAL</span><b>{formation}</b></footer>
  </section>
})
