import { Avatar } from './Avatar'
import { formatSquadCount } from '../utils/formatters'
import { positionNames } from '../data'

const BENCH_SIZE = 11

export function Bench({ subs, selectedSlot, touchDrag, onAllowDrop, onDrop, onClearPlayer, onPromotePlayer, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onRequestBenchPlayer }) {
  return <section className="lineup-bench">
    <div className="lineup-bench__head"><h2>En el banquillo <span>{subs.length}</span></h2><button type="button" onClick={onRequestBenchPlayer}>Añadir suplente&nbsp; +</button></div>
    <div className={`lineup-bench__list ${touchDrag?.overBench ? 'is-drop-active' : ''}`} data-drop-zone="bench" onDragOver={onAllowDrop} onDrop={onDrop}>{subs.map((player, index) => (
      <button className={`lineup-bench-player ${touchDrag?.player.id === player.id ? 'is-touch-moving' : ''}`} key={player.id} onPointerDown={(event) => onPointerDown(event, player)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={() => selectedSlot ? onPromotePlayer(player) : onClearPlayer(player.id)} title={selectedSlot ? `Colocar a ${player.name} en la posición seleccionada.` : `Arrastra a ${player.name} al campo. Pulsa para quitarlo.`}><span className="lineup-bench-player__index">{formatSquadCount(index + 1)}</span><Avatar player={player} small /><span><strong>{player.name}</strong><small>{positionNames[player.position] || player.position}</small></span><b>{selectedSlot ? '↗' : '×'}</b></button>
    ))}{subs.length < BENCH_SIZE && <button className="lineup-bench__empty" type="button" onClick={onRequestBenchPlayer}><i><strong>Zona de suplentes.</strong> Suelta aquí una tarjeta o usa “Añadir suplente”.</i></button>}</div>
  </section>
}
