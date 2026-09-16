import { Avatar } from './Avatar'

export function LineupPitch({
  team, title, formation, formations, slots, starters, startersCount, subsCount, selectedSlot,
  selectedPlayerSlot, recentPlayerId, draggedPlayer, touchDrag, isSharing, shareFile,
  canShare, onShare, onSharePrepared, onClearLineup,
  onFormationChange, onAllowDrop, onDropSlot, onSelectSlot, onOpenPlayerActions,
  onDragStart, onDragEnd, onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
  shouldSuppressTap,
}) {
  return <section className="lineup-pitch-panel">
    <div className="lineup-board-title">
      <div><p className="eyebrow">NOMBRE DE LA ALINEACIÓN</p><h2>{title || team?.lineupTitle || team?.name || 'Mi alineación'}</h2></div>
      <div className="lineup-board-title__actions">
        <button className="lineup-download" data-html2canvas-ignore="true" onClick={onShare} disabled={isSharing || !canShare}>{isSharing ? 'Generando…' : shareFile ? 'Actualizar imagen ↻' : 'Descargar imagen ↓'}</button>
        {shareFile && <button className="lineup-share-ready" data-html2canvas-ignore="true" onClick={onSharePrepared}>Compartir foto ↗</button>}
      </div>
    </div>

    <div className="lineup-club-identity">
      <div><span className="lineup-club-crest-wrap">{team?.logo ? <><span className="lineup-club-mark lineup-club-mark--crest-fallback" aria-hidden="true" /><img className="lineup-club-crest" src={team.logo} alt="" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.previousElementSibling.style.display = 'block' }} /></> : <span className="lineup-club-mark" aria-hidden="true" />}</span><div><span className="lineup-small-label">TUS COLORES</span><strong>{team?.name || 'LineUp'}</strong></div></div>
    </div>

    <div className="lineup-board-tools">
      <div><span className="lineup-small-label">SISTEMA</span><select value={formation} onChange={(event) => onFormationChange(event.target.value)} aria-label="Formación">{Object.keys(formations).map((item) => <option key={item}>{item}</option>)}</select></div>
      <span>{startersCount}/11 TITULARES</span>
      <button type="button" onClick={onClearLineup} disabled={!startersCount && !subsCount}>Vaciar pizarra</button>
    </div>

    <div className="lineup-drag-guide" aria-hidden="true"><span className="lineup-drag-guide__icon">⠿</span><div><strong>ARRASTRA Y ORDENA</strong><small>En móvil, arrastra desde la foto; desplázate desde el resto de la tarjeta.</small></div><i>↘</i></div>
    <div className="lineup-pitch" aria-label="Campo de fútbol, selecciona una posición">
      <div className="lineup-pitch-lines" aria-hidden="true"><div className="lineup-half" /><div className="lineup-circle" /><div className="lineup-area lineup-area--top" /><div className="lineup-area lineup-area--bottom" /><div className="lineup-goal lineup-goal--top" /><div className="lineup-goal lineup-goal--bottom" /><div className="lineup-spot lineup-spot--top" /><div className="lineup-spot lineup-spot--bottom" /></div>
      <span className="lineup-field-stamp" aria-hidden="true">LINEUP</span>
      {slots.map((slot) => {
        const player = starters[slot.id]
        const isOutOfPosition = player && player.position !== 'Unknown' && player.position !== slot.kind
        return <div key={slot.id} data-slot-id={slot.id} className={`lineup-slot ${player ? 'is-filled' : ''} ${selectedSlot === slot.id ? 'is-selected' : ''} ${touchDrag?.overSlotId === slot.id ? 'is-drop-active' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onDragOver={onAllowDrop} onDrop={(event) => onDropSlot(event, slot.id)}>
          {player ? <button className={`lineup-field-player ${isOutOfPosition ? 'is-out-of-position' : ''} ${selectedPlayerSlot === slot.id ? 'is-selected' : ''} ${recentPlayerId === player.id ? 'is-recent' : ''} ${draggedPlayer?.id === player.id ? 'is-dragging' : ''} ${touchDrag?.player.id === player.id ? 'is-touch-moving' : ''}`} onPointerDown={(event) => onPointerDown(event, player)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={() => { if (!shouldSuppressTap()) onOpenPlayerActions(slot.id) }} title={`Acciones para ${player.name}`}><span className="lineup-field-grip" aria-hidden="true">⠿</span><Avatar player={player} /><span className="lineup-field-number">{player.number ?? '—'}</span><span className="lineup-field-details"><strong>{player.name}</strong><small>{slot.label}</small></span>{isOutOfPosition && <span className="lineup-position-warning" aria-label="Fuera de su posición natural">!</span>}</button> : <button className="lineup-empty-slot" onClick={() => onSelectSlot(slot.id)} title={`Elegir ${slot.label}`}><span className="lineup-slot-plus">+</span><span className="lineup-slot-label">{slot.label}</span></button>}
        </div>
      })}
      <div className="lineup-pitch-footer"><span>EL FÚTBOL A TU MANERA</span><span>XI / {formation}</span></div>
    </div>
    <p className="lineup-pitch-note"><span>↗ Selecciona una posición y elige quién juega.</span><span>Tu borrador se guarda en este dispositivo.</span></p>
  </section>
}
