import { useEffect, useMemo, useRef, useState } from 'react'
import { getPlayerProfile, getSquad, getTeamCompetitionCategory, searchPlayers, searchTeams } from '../api'
import { euro } from '../utils/formatters'
import { getTransferQuote } from '../utils/transferValues'
import { emptyStatus } from './useSquad'

const TEAM_SEARCH_MIN_LENGTH = 2
const PLAYER_SEARCH_MIN_LENGTH = 3

function mergePlayerProfile(player, profile) {
  return Object.entries(profile).reduce((merged, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') merged[key] = value
    return merged
  }, { ...player })
}

export function useTransfers({ team, players, setPlayers, clearPlayer, setStatus }) {
  const [marketOpen, setMarketOpen] = useState(false)
  const [marketMode, setMarketMode] = useState('player')
  const [marketQuery, setMarketQuery] = useState('')
  const [marketTeams, setMarketTeams] = useState([])
  const [marketTeam, setMarketTeam] = useState(null)
  const [marketPlayers, setMarketPlayers] = useState([])
  const [marketStatus, setMarketStatus] = useState(emptyStatus)
  const [signingDraft, setSigningDraft] = useState(null)
  const [saleDraft, setSaleDraft] = useState(null)
  const [signings, setSignings] = useState([])
  const [sales, setSales] = useState([])
  const marketSearchRequestRef = useRef(0)

  const resolveMarketTeamCategories = async (results) => {
    const queue = results.filter((item) => !item.team.isWomen)
    const categoriesByTeamId = new Map()
    const resolveNext = async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        try {
          const category = await getTeamCompetitionCategory(item.team.id)
          if (category) categoriesByTeamId.set(item.team.id, category)
        } catch {
          // Si falta historial de partidos, el resultado sigue siendo seleccionable.
        }
      }
    }
    await Promise.all([resolveNext(), resolveNext()])
    return results.map((item) => {
      const category = categoriesByTeamId.get(item.team.id)
      return category
        ? { ...item, team: { ...item.team, isWomen: category.isWomen, categoryResolved: true, leagueName: category.leagueName } }
        : item
    })
  }

  const spend = signings.reduce((total, item) => total + item.price, 0)
  const income = sales.reduce((total, item) => total + item.price, 0)
  const transferLog = useMemo(
    () => [...signings.map((item) => ({ ...item, type: 'signing' })), ...sales.map((item) => ({ ...item, type: 'sale' }))].sort((a, b) => b.createdAt - a.createdAt),
    [signings, sales],
  )
  const signingQuote = useMemo(() => getTransferQuote(signingDraft?.player, 'signing'), [signingDraft])
  const saleQuote = useMemo(() => getTransferQuote(saleDraft?.player, 'sale'), [saleDraft])

  const resetForTeamChange = () => {
    setSignings([])
    setSales([])
    setSaleDraft(null)
    setSigningDraft(null)
  }

  const changeMarketMode = (nextMode) => {
    marketSearchRequestRef.current += 1
    setMarketMode(nextMode)
    setMarketPlayers([])
    setMarketTeams([])
    setMarketTeam(null)
  }

  const runMarketSearch = async (rawQuery, mode = marketMode) => {
    const requestId = ++marketSearchRequestRef.current
    const searchTerm = rawQuery.trim()
    const minimumCharacters = mode === 'player' ? PLAYER_SEARCH_MIN_LENGTH : TEAM_SEARCH_MIN_LENGTH

    if (searchTerm.length < minimumCharacters) {
      setMarketPlayers([])
      setMarketTeams([])
      setMarketStatus(emptyStatus)
      return
    }

    setMarketStatus({ loading: true, message: '' })
    try {
      if (mode === 'player') {
        const results = await searchPlayers(searchTerm)
        if (requestId !== marketSearchRequestRef.current) return
        setMarketPlayers(results)
        setMarketTeams([])
        setMarketTeam(null)
        setMarketStatus({ loading: false, message: results.length ? '' : 'No encontramos jugadores para esa búsqueda.' })
        return
      }

      const results = await searchTeams(searchTerm)
      if (requestId !== marketSearchRequestRef.current) return
      const availableTeams = results.filter((item) => item.team.id !== team?.id).slice(0, 6)
      const categorizedTeams = await resolveMarketTeamCategories(availableTeams)
      if (requestId !== marketSearchRequestRef.current) return
      setMarketTeams(categorizedTeams)
      setMarketStatus({ loading: false, message: categorizedTeams.length ? '' : 'No encontramos equipos para ese mercado.' })
    } catch (error) {
      if (requestId !== marketSearchRequestRef.current) return
      setMarketStatus({ loading: false, message: error.message })
    }
  }

  useEffect(() => {
    if (!marketOpen) return undefined
    const searchTerm = marketQuery.trim()
    const minimumCharacters = marketMode === 'player' ? PLAYER_SEARCH_MIN_LENGTH : TEAM_SEARCH_MIN_LENGTH
    marketSearchRequestRef.current += 1
    if (searchTerm.length < minimumCharacters) {
      setMarketPlayers([])
      setMarketTeams([])
      return undefined
    }
    setMarketPlayers([])
    setMarketTeams([])
    const timeout = window.setTimeout(() => { void runMarketSearch(searchTerm, marketMode) }, 240)
    return () => window.clearTimeout(timeout)
  }, [marketOpen, marketMode, marketQuery, team?.id])

  const handleMarketSearch = (event) => {
    event.preventDefault()
    void runMarketSearch(marketQuery)
  }

  const selectMarketTeam = async (item) => {
    marketSearchRequestRef.current += 1
    const nextTeam = item.team
    setMarketTeam(nextTeam)
    setMarketTeams([])
    setMarketPlayers([])
    setSigningDraft(null)
    setMarketStatus({ loading: true, message: '' })
    try {
      const squad = await getSquad(nextTeam.id, 'market')
      setMarketPlayers((squad?.players || []).map((player) => ({ ...player, club: nextTeam })))
      setMarketStatus({ loading: false, message: squad?.players?.length ? '' : 'Este equipo no tiene jugadores disponibles en la API.' })
    } catch (error) {
      setMarketStatus({ loading: false, message: error.message })
    }
  }

  const startSigning = async (player) => {
    setSigningDraft({ player, loading: true })
    setMarketStatus({ loading: true, message: '' })
    try {
      const profile = await getPlayerProfile(player.id)
      const enrichedPlayer = mergePlayerProfile(player, profile)
      setMarketPlayers((current) => current.map((item) => item.id === player.id ? enrichedPlayer : item))
      setSigningDraft({ player: enrichedPlayer })
      setMarketStatus(emptyStatus)
    } catch {
      setSigningDraft({ player })
      setMarketStatus({ loading: false, message: 'No pudimos ampliar la ficha del jugador. Se usa la información disponible.' })
    }
  }

  const startSale = async (player) => {
    setSaleDraft({ player, loading: true })
    setStatus(emptyStatus)
    try {
      const profile = await getPlayerProfile(player.id)
      const enrichedPlayer = mergePlayerProfile(player, profile)
      setPlayers((current) => current.map((item) => item.id === player.id ? enrichedPlayer : item))
      setSaleDraft({ player: enrichedPlayer })
      setStatus(emptyStatus)
    } catch {
      setSaleDraft({ player })
      setStatus({ loading: false, message: 'No pudimos ampliar la ficha del jugador. Se usa la información disponible.' })
    }
  }

  const confirmSigning = () => {
    const price = signingQuote.amount
    if (signingDraft?.loading || !signingDraft?.player || !signingQuote.available) {
      setMarketStatus({ loading: false, message: 'Indica un importe de fichaje válido en euros.' })
      setMarketStatus({ loading: false, message: 'No podemos calcular un coste automático sin valor de mercado o cláusula.' })
      return null
    }
    const player = signingDraft.player
    if (players.some((item) => item.id === player.id)) {
      setMarketStatus({ loading: false, message: 'Ese jugador ya forma parte de tu plantilla.' })
      return null
    }
    const signedPlayer = { ...player, originClub: player.club }
    const transfer = { id: `signing-${player.id}-${Date.now()}`, player: signedPlayer, price, marketValue: signingQuote.marketValue, releaseClause: signingQuote.releaseClause, contractYears: signingQuote.contractYears, quoteSource: signingQuote.source, createdAt: Date.now() }
    setPlayers((current) => [...current, signedPlayer])
    setSignings((current) => [...current, transfer])
    setSigningDraft(null)
    setMarketStatus({ loading: false, message: `${player.name} se incorpora por ${euro.format(price)}.` })
    return signedPlayer
  }

  const confirmSale = () => {
    const price = saleQuote.amount
    if (saleDraft?.loading || !saleDraft?.player || !saleQuote.available) {
      setStatus({ loading: false, message: 'Indica un precio de venta válido en euros.' })
      setStatus({ loading: false, message: 'No podemos calcular una venta automática sin valor de mercado o cláusula.' })
      return
    }
    const player = saleDraft.player
    clearPlayer(player.id)
    setPlayers((current) => current.filter((item) => item.id !== player.id))
    const transfer = { id: `sale-${player.id}-${Date.now()}`, player, price, marketValue: saleQuote.marketValue, releaseClause: saleQuote.releaseClause, contractYears: saleQuote.contractYears, quoteSource: saleQuote.source, createdAt: Date.now() }
    setSales((current) => [...current, transfer])
    setSaleDraft(null)
    setStatus({ loading: false, message: `${player.name} vendido por ${euro.format(price)}.` })
  }

  const undoTransfer = (transfer) => {
    if (transfer.type === 'signing') {
      clearPlayer(transfer.player.id)
      setPlayers((current) => current.filter((player) => player.id !== transfer.player.id))
      setSignings((current) => current.filter((item) => item.id !== transfer.id))
      setMarketStatus({ loading: false, message: `Has deshecho el fichaje de ${transfer.player.name}.` })
      return
    }
    setPlayers((current) => current.some((player) => player.id === transfer.player.id) ? current : [...current, transfer.player])
    setSales((current) => current.filter((item) => item.id !== transfer.id))
    setStatus({ loading: false, message: `Has deshecho la venta de ${transfer.player.name}.` })
  }

  return {
    marketOpen,
    marketMode,
    marketQuery,
    marketTeams,
    marketTeam,
    marketPlayers,
    marketStatus,
    signingDraft,
    saleDraft,
    signingQuote,
    saleQuote,
    spend,
    income,
    transferLog,
    setMarketOpen,
    setMarketQuery,
    setMarketTeam,
    setMarketPlayers,
    setSigningDraft,
    setSaleDraft,
    resetForTeamChange,
    closeMarket: () => setMarketOpen(false),
    changeMarketMode,
    handleMarketSearch,
    selectMarketTeam,
    startSigning,
    startSale,
    confirmSigning,
    confirmSale,
    undoTransfer,
  }
}
