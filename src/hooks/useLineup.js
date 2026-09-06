import { useEffect, useMemo, useRef, useState } from 'react'
import { formations } from '../data'
import { LineupType, MAX_BENCH_PLAYERS, createLineup, getSelectedPlayerIds, hydrateLineup, toLineupDraft, withPlayerPool } from '../domain/lineup'
import { emptyStatus } from './useSquad'

function idOf(player) {
  return player?.id === null || player?.id === undefined ? null : String(player.id)
}

function placePlayersInFormation(players, formation) {
  const availableSlots = [...formations[formation]]
  const starters = {}

  players.filter(Boolean).forEach((player) => {
    const matchingSlotIndex = availableSlots.findIndex((slot) => slot.kind === player.position)
    const slotIndex = matchingSlotIndex >= 0 ? matchingSlotIndex : 0
    const [slot] = availableSlots.splice(slotIndex, 1)
    const playerId = idOf(player)
    if (slot && playerId) starters[slot.id] = { playerId }
  })

  return starters
}

function normalizeLegacyDraft(draft, fallback = {}) {
  return createLineup({
    type: fallback.type || LineupType.CURRENT_TEAM,
    context: fallback.context || null,
    title: fallback.title || '',
    formation: draft.formation,
    playerPool: fallback.players || [],
    starters: draft.starters,
    bench: draft.subs,
    metadata: fallback.metadata,
  })
}

export function useLineup({ players, setStatus }) {
  const [lineup, setLineup] = useState(() => createLineup({ type: LineupType.CURRENT_TEAM }))
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedPlayerSlot, setSelectedPlayerSlot] = useState(null)
  const [recentPlayerId, setRecentPlayerId] = useState(null)
  const [draggedPlayer, setDraggedPlayer] = useState(null)
  const [touchDrag, setTouchDrag] = useState(null)
  const touchSessionRef = useRef(null)
  const suppressTapRef = useRef(false)
  const isPristineRef = useRef(true)
  const recentPlayerTimeoutRef = useRef(null)

  const sourcePlayers = useMemo(() => new Map(players.map((player) => [String(player.id), player])), [players])
  const hydrated = useMemo(() => hydrateLineup(lineup, players), [lineup, players])
  const slots = formations[lineup.formation]
  const starters = hydrated.starters
  const subs = hydrated.bench
  const startersCount = Object.keys(starters).length
  const assignedIds = useMemo(() => new Set(getSelectedPlayerIds(lineup).map((id) => sourcePlayers.get(id)?.id ?? id)), [lineup, sourcePlayers])

  useEffect(() => {
    setLineup((current) => withPlayerPool(current, players))
  }, [players])

  const updateLineup = (updater) => setLineup((current) => createLineup(updater(current)))
  const clearInteraction = () => {
    setSelectedSlot(null)
    setSelectedPlayerSlot(null)
  }

  const resetLineup = () => {
    isPristineRef.current = false
    updateLineup((current) => ({ ...current, starters: {}, bench: [] }))
    clearInteraction()
    setStatus(emptyStatus)
  }

  const beginLineup = ({ type = LineupType.CUSTOM, context = null, players: playerPool = players, formation } = {}) => {
    isPristineRef.current = true
    setLineup(createLineup({ type, context, playerPool, formation }))
    clearInteraction()
    setStatus(emptyStatus)
  }

  const beginNewTeamLineup = ({ context = null, players: playerPool = players } = {}) => {
    beginLineup({ type: LineupType.CURRENT_TEAM, context, players: playerPool })
  }

  const restoreDraft = (draft, fallback = {}) => {
    if (!draft) return false
    const restored = draft.version === 2
      ? createLineup({ ...draft, playerPool: draft.playerPool?.length ? draft.playerPool : fallback.players })
      : normalizeLegacyDraft(draft, fallback)
    if (!formations[restored.formation]) return false
    const validSlotIds = new Set(formations[restored.formation].map((slot) => slot.id))
    const starters = Object.fromEntries(Object.entries(restored.starters).filter(([slotId]) => validSlotIds.has(slotId)))
    setLineup(createLineup({ ...restored, starters }))
    clearInteraction()
    isPristineRef.current = false
    return true
  }

  const applySuggestedLineup = (suggestion, availablePlayers = players) => {
    if (!isPristineRef.current || !suggestion?.players?.length) return false
    const formation = formations[suggestion.formation] ? suggestion.formation : lineup.formation
    const playersById = new Map(availablePlayers.map((player) => [String(player.id), player]))
    const placedPlayers = suggestion.players.map((player) => playersById.get(String(player.id)) || player)
    const starters = placePlayersInFormation(placedPlayers, formation)
    if (Object.keys(starters).length !== 11) return false

    updateLineup((current) => ({ ...current, formation, starters, bench: [], playerPool: [...current.playerPool, ...placedPlayers] }))
    clearInteraction()
    const hasProviderFormation = Boolean(suggestion.formation && formations[suggestion.formation])
    setStatus({ loading: false, message: `Hemos cargado el último XI oficial disponible${hasProviderFormation ? ` (${suggestion.formation})` : ''}.` })
    return true
  }

  const updateFormation = (formation) => {
    if (formation === lineup.formation || !formations[formation]) return
    isPristineRef.current = false
    updateLineup((current) => ({ ...current, formation, starters: placePlayersInFormation(Object.values(hydrateLineup(current, players).starters), formation) }))
    clearInteraction()
    setStatus(emptyStatus)
  }

  const clearPlayer = (playerId) => {
    const normalizedId = String(playerId)
    isPristineRef.current = false
    updateLineup((current) => ({
      ...current,
      starters: Object.fromEntries(Object.entries(current.starters).filter(([, entry]) => entry.playerId !== normalizedId)),
      bench: current.bench.filter((entry) => entry.playerId !== normalizedId),
    }))
    setSelectedPlayerSlot(null)
  }

  const selectSlot = (slotId) => {
    if (!selectedSlot || selectedSlot === slotId) {
      setSelectedSlot(slotId)
      return
    }
    if (!lineup.starters[selectedSlot]) {
      setSelectedSlot(slotId)
      return
    }

    isPristineRef.current = false
    updateLineup((current) => {
      const selected = current.starters[selectedSlot]
      const target = current.starters[slotId]
      const starters = { ...current.starters, [slotId]: { ...selected, slotId } }
      if (target) starters[selectedSlot] = { ...target, slotId: selectedSlot }
      else delete starters[selectedSlot]
      return { ...current, starters }
    })
    clearInteraction()
    setStatus(emptyStatus)
  }

  const addToStarting = (player, requestedSlotId = null) => {
    const playerId = idOf(player)
    if (!playerId) return
    const target = requestedSlotId
      ? slots.find((slot) => slot.id === requestedSlotId)
      : selectedSlot
        ? slots.find((slot) => slot.id === selectedSlot)
        : slots.find((slot) => slot.kind === player.position && !lineup.starters[slot.id]) || slots.find((slot) => !lineup.starters[slot.id])
    if (!target) {
      setStatus({ loading: false, message: 'Tu once ya está completo. Quita un jugador para hacer sitio.' })
      return
    }

    isPristineRef.current = false
    setRecentPlayerId(player.id)
    window.clearTimeout(recentPlayerTimeoutRef.current)
    recentPlayerTimeoutRef.current = window.setTimeout(() => setRecentPlayerId(null), 850)
    updateLineup((current) => {
      const sourceSlotId = Object.entries(current.starters).find(([, entry]) => entry.playerId === playerId)?.[0]
      const replaced = current.starters[target.id]
      const benchIndex = current.bench.findIndex((entry) => entry.playerId === playerId)
      if (sourceSlotId === target.id) return current

      const starters = { ...current.starters, [target.id]: { playerId, slotId: target.id, role: 'starter' } }
      if (sourceSlotId) {
        if (replaced) starters[sourceSlotId] = { ...replaced, slotId: sourceSlotId }
        else delete starters[sourceSlotId]
      }
      let bench = current.bench
      if (benchIndex >= 0) {
        bench = replaced
          ? current.bench.map((entry, index) => index === benchIndex ? { playerId: replaced.playerId } : entry)
          : current.bench.filter((_, index) => index !== benchIndex)
      } else if (replaced && current.bench.length < MAX_BENCH_PLAYERS) {
        bench = [...current.bench, { playerId: replaced.playerId }]
      }
      return { ...current, starters, bench, playerPool: [...current.playerPool, playerId] }
    })
    clearInteraction()
    setStatus(emptyStatus)
  }

  const addToBench = (player) => {
    const playerId = idOf(player)
    if (!playerId || getSelectedPlayerIds(lineup).includes(playerId)) return
    if (lineup.bench.length >= MAX_BENCH_PLAYERS) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 11 suplentes.' })
      return
    }
    isPristineRef.current = false
    updateLineup((current) => ({ ...current, bench: [...current.bench, { playerId }], playerPool: [...current.playerPool, playerId] }))
    setStatus(emptyStatus)
  }

  const moveToBench = (player) => {
    const playerId = idOf(player)
    if (!playerId || lineup.bench.some((entry) => entry.playerId === playerId)) return
    if (lineup.bench.length >= MAX_BENCH_PLAYERS) {
      setStatus({ loading: false, message: 'El banquillo ya tiene sus 11 suplentes.' })
      return
    }
    isPristineRef.current = false
    updateLineup((current) => ({
      ...current,
      starters: Object.fromEntries(Object.entries(current.starters).filter(([, entry]) => entry.playerId !== playerId)),
      bench: [...current.bench, { playerId }],
    }))
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
    return sourcePlayers.get(String(playerId)) || draggedPlayer
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
    lineup,
    formation: lineup.formation,
    slots,
    starters,
    subs,
    selectedSlot,
    selectedPlayerSlot,
    recentPlayerId,
    draggedPlayer,
    touchDrag,
    startersCount,
    assignedIds,
    selectSlot,
    openPlayerActions: (slotId) => setSelectedPlayerSlot(slotId),
    closePlayerActions: () => setSelectedPlayerSlot(null),
    resetLineup,
    beginLineup,
    beginNewTeamLineup,
    restoreDraft,
    applySuggestedLineup,
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
    syncPlayerPool: () => setLineup((current) => withPlayerPool(current, players)),
    toDraft: () => toLineupDraft(lineup),
  }
}
