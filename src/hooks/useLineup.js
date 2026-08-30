import { useMemo, useRef, useState } from 'react'
import { formations } from '../data'
import { emptyStatus } from './useSquad'

const MAX_BENCH_PLAYERS = 11

export function useLineup({ players, setStatus }) {
  const [formation, setFormation] = useState('4-3-3')
  const [starters, setStarters] = useState({})
  const [subs, setSubs] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [draggedPlayer, setDraggedPlayer] = useState(null)
  const [touchDrag, setTouchDrag] = useState(null)
  const touchSessionRef = useRef(null)
  const suppressTapRef = useRef(false)

  const slots = formations[formation]
  const startersCount = Object.values(starters).filter(Boolean).length
  const assignedIds = useMemo(
    () => new Set([...Object.values(starters), ...subs].filter(Boolean).map((player) => player.id)),
    [starters, subs],
  )

  const resetLineup = () => {
    setStarters({})
    setSubs([])
    setSelectedSlot(null)
    setStatus(emptyStatus)
  }

  const updateFormation = (nextFormation) => {
    setFormation(nextFormation)
    setStarters({})
    setSelectedSlot(null)
  }

  const clearPlayer = (playerId) => {
    setStarters((current) => Object.fromEntries(Object.entries(current).map(([slotId, player]) => [slotId, player?.id === playerId ? null : player])))
    setSubs((current) => current.filter((player) => player.id !== playerId))
  }

  const selectSlot = (slotId) => {
    if (!selectedSlot || selectedSlot === slotId) {
      setSelectedSlot(slotId)
      return
    }

    const selectedPlayer = starters[selectedSlot]
    if (!selectedPlayer) {
      setSelectedSlot(slotId)
      return
    }

    // Alternativa táctil al drag & drop: tocar un titular y después otra plaza
    // lo mueve o intercambia con el jugador que ya estuviera allí.
    setStarters((current) => ({
      ...current,
      [selectedSlot]: current[slotId] || null,
      [slotId]: current[selectedSlot],
    }))
    setSelectedSlot(null)
    setStatus(emptyStatus)
  }

  const addToStarting = (player, requestedSlotId = null) => {
    const target = requestedSlotId
      ? slots.find((slot) => slot.id === requestedSlotId)
      : selectedSlot
        ? slots.find((slot) => slot.id === selectedSlot)
        : slots.find((slot) => slot.kind === player.position && !starters[slot.id]) || slots.find((slot) => !starters[slot.id])

    if (!target) {
      setStatus({ loading: false, message: 'Tu once ya está completo. Quita un jugador para hacer sitio.' })
      return
    }

    const sourceSlotId = Object.entries(starters).find(([, starter]) => starter?.id === player.id)?.[0]
    const replacedPlayer = starters[target.id]
    const benchIndex = subs.findIndex((item) => item.id === player.id)

    if (sourceSlotId === target.id) {
      setSelectedSlot(null)
      return
    }

    setStarters((current) => {
      const currentSourceSlotId = Object.entries(current).find(([, starter]) => starter?.id === player.id)?.[0]
      const currentReplacedPlayer = current[target.id]

      if (currentSourceSlotId) {
        return { ...current, [currentSourceSlotId]: currentReplacedPlayer || null, [target.id]: player }
      }

      return { ...current, [target.id]: player }
    })

    setSubs((current) => {
      const currentBenchIndex = current.findIndex((item) => item.id === player.id)
      if (currentBenchIndex >= 0) {
        // Un suplente que entra conserva el tamaño del banquillo: el titular
        // sustituido ocupa su plaza. Si el destino estaba vacío, simplemente sale.
        return replacedPlayer
          ? current.map((item, index) => index === currentBenchIndex ? replacedPlayer : item)
          : current.filter((_, index) => index !== currentBenchIndex)
      }

      // Al elegir desde la plantilla, el titular sustituido queda disponible en
      // el banquillo cuando todavía hay hueco; nunca bloqueamos la colocación.
      return replacedPlayer && current.length < MAX_BENCH_PLAYERS ? [...current, replacedPlayer] : current
    })

    setSelectedSlot(null)
    setStatus(emptyStatus)
  }

  const addToBench = (player) => {
    if (assignedIds.has(player.id)) return
    if (subs.length >= MAX_BENCH_PLAYERS) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 11 suplentes.' })
      return
    }
    setSubs((current) => [...current, player])
    setStatus(emptyStatus)
  }

  const moveToBench = (player) => {
    if (subs.some((item) => item.id === player.id)) return
    if (subs.length >= MAX_BENCH_PLAYERS) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 11 suplentes.' })
      return
    }
    setStarters((current) => Object.fromEntries(Object.entries(current).map(([slotId, starter]) => [slotId, starter?.id === player.id ? null : starter])))
    setSubs((current) => [...current, player])
    setStatus(emptyStatus)
  }

  const beginDrag = (event, player) => {
    setDraggedPlayer(player)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(player.id))
    event.dataTransfer.setData('application/x-lineup-player', String(player.id))
  }

  const getDraggedPlayer = (event) => {
    const playerId = event.dataTransfer.getData('application/x-lineup-player') || event.dataTransfer.getData('text/plain')
    return players.find((player) => String(player.id) === playerId) || draggedPlayer
  }

  const dropOnSlot = (event, slotId) => {
    event.preventDefault()
    const player = getDraggedPlayer(event)
    if (player) addToStarting(player, slotId)
    setDraggedPlayer(null)
  }

  const dropOnBench = (event) => {
    event.preventDefault()
    const player = getDraggedPlayer(event)
    if (player) moveToBench(player)
    setDraggedPlayer(null)
  }

  const beginTouchMove = (event, player) => {
    if (event.pointerType !== 'touch') return
    touchSessionRef.current = { player, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveTouchPlayer = (event) => {
    const session = touchSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    if (!session.moved && Math.hypot(event.clientX - session.startX, event.clientY - session.startY) > 8) session.moved = true
    if (session.moved) {
      event.preventDefault()
      setTouchDrag({ player: session.player, x: event.clientX, y: event.clientY })
    }
  }

  const endTouchMove = (event) => {
    const session = touchSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    if (session.moved) {
      const slotElement = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot-id]')
      if (slotElement?.dataset.slotId) addToStarting(session.player, slotElement.dataset.slotId)
      suppressTapRef.current = true
      window.setTimeout(() => { suppressTapRef.current = false }, 0)
    }
    touchSessionRef.current = null
    setTouchDrag(null)
  }

  return {
    formation,
    slots,
    starters,
    subs,
    selectedSlot,
    draggedPlayer,
    touchDrag,
    startersCount,
    assignedIds,
    selectSlot,
    resetLineup,
    updateFormation,
    clearPlayer,
    addToStarting,
    addToBench,
    beginDrag,
    dropOnSlot,
    dropOnBench,
    endDrag: () => setDraggedPlayer(null),
    beginTouchMove,
    moveTouchPlayer,
    endTouchMove,
    shouldSuppressTap: () => suppressTapRef.current,
    allowDrop: (event) => event.preventDefault(),
  }
}
