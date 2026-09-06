import { Avatar } from './Avatar'

export function LineupPitch({
  team,
  formation,
  formations,
  slots,
  starters,
  startersCount,
  subsCount,
  selectedSlot,
  selectedPlayerSlot,
  recentPlayerId,
  draggedPlayer,
  touchDrag,
  isSharing,
  shareFile,
  onShare,
  onSharePrepared,
  onFormationChange,
  onAllowDrop,
  onDropSlot,
  onSelectSlot,
  onOpenPlayerActions,
  onClearPlayer,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  shouldSuppressTap,
}) {
  const selectedSlotLabel = slots.find((slot) => slot.id === selectedSlot)?.label

  return <div className="pitch-panel">
    <div className="panel-heading">
      <div className="lineup-identity">{team && <img src={team.logo} alt="" />}<div><p className="eyebrow">TU ALINEACIÓN</p><h2>{team?.name || 'El once titular'}</h2><span className="share-summary">{formation} · {startersCount}/11 TITULARES · {subsCount}/11 SUPLENTES</span></div></div>
      <div className="pitch-actions">
        <button className="share-button" data-html2canvas-ignore="true" onClick={onShare} disabled={isSharing || !team}>{isSharing ? 'Generando…' : shareFile ? '↻ Actualizar' : 'Crear foto'}</button>
        {shareFile && <button className="share-button share-button--ready" data-html2canvas-ignore="true" onClick={onSharePrepared}>↗ Compartir foto</button>}
        <div className="formation-control" data-html2canvas-ignore="true"><label htmlFor="formation">Formación</label><select id="formation" value={formation} onChange={(event) => onFormationChange(event.target.value)}>{Object.keys(formations).map((item) => <option key={item}>{item}</option>)}</select></div>
      </div>
    </div>
    <div className="pitch" aria-label="Campo de fútbol, selecciona una posición">
      <div className="pitch-atmosphere" aria-hidden="true"><i /><i /><i /></div>
      <div className="pitch-line pitch-line--top" /><div className="pitch-line pitch-line--middle" /><div className="pitch-circle" /><div className="pitch-box pitch-box--top" /><div className="pitch-box pitch-box--bottom" /><div className="pitch-arc pitch-arc--top" /><div className="pitch-arc pitch-arc--bottom" />
      {slots.map((slot) => {
        const player = starters[slot.id]
        const isOutOfPosition = player && player.position !== 'Unknown' && player.position !== slot.kind

        return <div key={slot.id} data-slot-id={slot.id} className={`slot ${player ? 'slot--filled' : ''} ${selectedSlot === slot.id ? 'slot--selected' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onDragOver={onAllowDrop} onDrop={(event) => onDropSlot(event, slot.id)}>
          {player
            ? <button className={`field-card ${isOutOfPosition ? 'field-card--out-of-position' : ''} ${selectedPlayerSlot === slot.id ? 'field-card--selected' : ''} ${recentPlayerId === player.id ? 'field-card--recent' : ''} ${draggedPlayer?.id === player.id ? 'field-card--dragging' : ''} ${touchDrag?.player.id === player.id ? 'field-card--touch-moving' : ''}`} data-shirt={player.number ?? '—'} draggable onDragStart={(event) => onDragStart(event, player)} onDragEnd={onDragEnd} onPointerDown={(event) => onPointerDown(event, player)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={() => { if (!shouldSuppressTap()) onOpenPlayerActions(slot.id) }} title={`Acciones para ${player.name}`}><Avatar player={player} /><span className="field-number">#{player.number ?? '—'}</span><span className="field-details"><strong>{player.name}</strong><small>{slot.label}</small></span>{isOutOfPosition && <span className="position-warning" aria-label="Fuera de su posición natural">!</span>}<img className="field-crest" src={player.club?.logo || team?.logo} alt="" /></button>
            : <button className="empty-slot" onClick={() => onSelectSlot(slot.id)} title={`Elegir ${slot.label}`}><span className="slot-plus">+</span><span className="slot-label">{slot.label}</span></button>}
        </div>
      })}
    </div>
    <p className="hint" data-html2canvas-ignore="true">{selectedSlot ? `Posición seleccionada: ${selectedSlotLabel}. Toca un jugador de la plantilla para colocarlo.` : 'Toca un titular para sustituirlo. Arrastrar sigue siendo opcional para moverlo.'}</p>
  </div>
}
