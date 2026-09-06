import { useEffect, useMemo, useState } from 'react'
import { positionNames } from '../data'
import { Avatar } from './Avatar'

function sortCandidates(candidates, slot, benchIds) {
  return [...candidates].sort((left, right) => {
    const leftScore = (left.position === slot.kind ? 0 : 2) + (benchIds.has(left.id) ? 1 : 0)
    const rightScore = (right.position === slot.kind ? 0 : 2) + (benchIds.has(right.id) ? 1 : 0)
    return leftScore - rightScore || left.name.localeCompare(right.name, 'es')
  })
}

export function PlayerQuickActions({ slot, player, players, assignedIds, subs, onReplace, onRemove, onOpenMarket, onClose }) {
  const [query, setQuery] = useState('')
  const benchIds = useMemo(() => new Set(subs.map((sub) => sub.id)), [subs])
  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')
    const available = players.filter((candidate) => candidate.id !== player.id && (!assignedIds.has(candidate.id) || benchIds.has(candidate.id)))
    return sortCandidates(available, slot, benchIds)
      .filter((candidate) => !normalizedQuery || candidate.name.toLocaleLowerCase('es').includes(normalizedQuery))
      .slice(0, 18)
  }, [assignedIds, benchIds, player.id, players, query, slot])

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return <div className="quick-player-layer" role="presentation">
    <button className="quick-player-backdrop" aria-label="Cerrar acciones de jugador" onClick={onClose} />
    <aside className="quick-player-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-player-title">
      <div className="quick-player-sheet__handle" aria-hidden="true" />
      <header className="quick-player-sheet__header">
        <div className="quick-player-sheet__identity"><Avatar player={player} /><div><p>EN {slot.label}</p><h2 id="quick-player-title">{player.name}</h2><span>{positionNames[player.position] || player.position} · #{player.number ?? '—'}</span></div></div>
        <button className="quick-player-close" onClick={onClose} aria-label="Cerrar">×</button>
      </header>

      <section className="quick-player-sheet__replace" aria-label={`Sustituir a ${player.name}`}>
        <div className="quick-player-sheet__section-title"><div><p>SUSTITUIR</p><h3>Elige de tu plantilla</h3></div><span>{candidates.length}</span></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador" aria-label="Buscar sustituto" autoFocus />
        <div className="quick-player-candidates">
          {candidates.map((candidate) => <button key={candidate.id} className={`quick-player-candidate ${candidate.position === slot.kind ? 'quick-player-candidate--fit' : ''}`} onClick={() => onReplace(candidate)}>
            <Avatar player={candidate} small /><span><strong>{candidate.name}</strong><small>{positionNames[candidate.position] || candidate.position}{benchIds.has(candidate.id) ? ' · Banquillo' : ''}</small></span><b aria-hidden="true">→</b>
          </button>)}
          {!candidates.length && <p className="quick-player-empty">No hay coincidencias en la plantilla.</p>}
        </div>
      </section>

      <footer className="quick-player-sheet__actions">
        <button className="quick-player-market" onClick={onOpenMarket}>Buscar en el mercado</button>
        <button className="quick-player-remove" onClick={onRemove}>Quitar del XI</button>
      </footer>
    </aside>
  </div>
}
