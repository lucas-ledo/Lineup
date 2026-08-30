import { useEffect, useMemo, useRef, useState } from 'react'
import { getSquad, getTeamTheme, searchTeams } from '../api'
import { applyClubTheme, fallbackTheme, getClubTheme } from '../teamTheme'

const TEAM_SEARCH_MIN_LENGTH = 2
export const emptyStatus = { loading: false, message: '' }

export function useSquad() {
  const [query, setQuery] = useState('')
  const [teams, setTeams] = useState([])
  const [team, setTeam] = useState(null)
  const [pendingTeam, setPendingTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [positionFilter, setPositionFilter] = useState('All')
  const [status, setStatus] = useState(emptyStatus)
  const [theme, setTheme] = useState(() => localStorage.getItem('lineup-theme') || 'dark')
  const [clubTheme, setClubTheme] = useState(fallbackTheme)
  const teamRequestRef = useRef(0)

  const visiblePlayers = useMemo(
    () => positionFilter === 'All' ? players : players.filter((player) => player.position === positionFilter),
    [players, positionFilter],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lineup-theme', theme)
  }, [theme])

  useEffect(() => {
    let isCurrent = true

    if (!team) {
      if (pendingTeam) return undefined
      setClubTheme(fallbackTheme)
      applyClubTheme(fallbackTheme)
      return undefined
    }

    const nextTheme = team.clubTheme || getClubTheme(team)
    if (isCurrent) {
      setClubTheme(nextTheme)
      applyClubTheme(nextTheme)
    }

    return () => { isCurrent = false }
  }, [team?.id, team?.name, team?.clubTheme?.primary, team?.clubTheme?.secondary, team?.clubTheme?.source, team?.colors?.primary, team?.colors?.secondary, pendingTeam?.id])

  const handleSearch = async (event) => {
    event.preventDefault()
    const searchTerm = query.trim()

    if (searchTerm.length < TEAM_SEARCH_MIN_LENGTH) {
      setStatus({ loading: false, message: 'Escribe al menos dos letras para buscar un equipo.' })
      return
    }

    setStatus({ loading: true, message: '' })
    try {
      const results = await searchTeams(searchTerm)
      setTeams(results.slice(0, 8))
      setStatus({ loading: false, message: results.length ? '' : 'No encontramos ningún equipo con esa búsqueda.' })
    } catch (error) {
      setStatus({ loading: false, message: error.message })
    }
  }

  const selectTeam = async (item, onTeamChange = () => {}) => {
    const nextTeam = item.team
    const requestId = ++teamRequestRef.current
    setPendingTeam(nextTeam)
    setTeam(null)
    setTeams([])
    setPlayers([])
    setPositionFilter('All')
    onTeamChange()
    setStatus({ loading: true, message: '' })

    try {
      const [squad, fetchedTheme] = await Promise.all([
        getSquad(nextTeam.id, 'normal'),
        getTeamTheme(nextTeam.id).catch(() => null),
      ])
      if (requestId !== teamRequestRef.current) return
      if (!squad) throw new Error('No hay una plantilla disponible para este equipo.')
      const resolvedTheme = fetchedTheme || getClubTheme(nextTeam)
      const resolvedTeam = { ...nextTeam, clubTheme: resolvedTheme }
      setClubTheme(resolvedTheme)
      applyClubTheme(resolvedTheme)
      setTeam(resolvedTeam)
      setPlayers((squad.players || []).map((player) => ({ ...player, club: resolvedTeam })))
      setPendingTeam(null)
      setStatus({ loading: false, message: squad.players?.length ? '' : 'La API no devolvió jugadores para este equipo.' })
    } catch (error) {
      if (requestId !== teamRequestRef.current) return
      setPendingTeam(null)
      setStatus({ loading: false, message: error.message })
    }
  }

  const resetTeamContext = (onReset = () => {}) => {
    teamRequestRef.current += 1
    setPendingTeam(null)
    setTeam(null)
    setTeams([])
    setPlayers([])
    onReset()
  }

  return {
    query,
    teams,
    team,
    pendingTeam,
    isTeamLoading: Boolean(pendingTeam),
    players,
    positionFilter,
    status,
    theme,
    clubTheme,
    visiblePlayers,
    setQuery,
    setPlayers,
    setPositionFilter,
    setStatus,
    setTheme,
    handleSearch,
    selectTeam,
    resetTeamContext,
  }
}
