import { Avatar } from './Avatar'
import { formatSquadCount } from '../utils/formatters'
import { positionNames } from '../data'

const BENCH_SIZE = 11

export function Bench({ subs, selectedSlot, onAllowDrop, onDrop, onClearPlayer, onPromotePlayer, onDragStart, onDragEnd }) {
  return <section className="bench-section">
    <div className="bench-title"><p className="eyebrow">BANQUILLO</p><h2>Suplentes <span>{subs.length}/{BENCH_SIZE}</span></h2></div>
    <div className="bench-list" onDragOver={onAllowDrop} onDrop={onDrop}>{Array.from({ length: BENCH_SIZE }, (_, index) => {
      const player = subs[index]
      return player ? <button className="bench-player" key={player.id} draggable onDragStart={(event) => onDragStart(event, player)} onDragEnd={onDragEnd} onClick={() => selectedSlot ? onPromotePlayer(player) : onClearPlayer(player.id)} title={selectedSlot ? `Colocar a ${player.name} en la posición seleccionada.` : `Arrastra a ${player.name} al campo. Pulsa para quitarlo.`}><span className="bench-index">{formatSquadCount(index + 1)}</span><Avatar player={player} small /><span><strong>{player.name}</strong><small>{positionNames[player.position] || player.position}</small></span><b>{selectedSlot ? '↗' : '×'}</b></button> : <div className="bench-empty" key={index}><span>{formatSquadCount(index + 1)}</span><i>+ Añadir suplente</i></div>
    })}</div>
  </section>
}
