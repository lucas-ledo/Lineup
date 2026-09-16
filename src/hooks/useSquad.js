import { useEffect, useMemo, useRef, useState } from 'react'
import { getLatestTeamLineup, getSquad, getTeamCompetitionCategory, getTeamTheme, searchTeams } from '../api'
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
  const [playerQuery, setPlayerQuery] = useState('')
  const [status, setStatus] = useState(emptyStatus)
  const [searchStatus, setSearchStatus] = useState(emptyStatus)
  const [theme, setTheme] = useState(() => localStorage.getItem('lineup-theme') || 'light')
  const [clubTheme, setClubTheme] = useState(fallbackTheme)
  const teamRequestRef = useRef(0)
  const searchRequestRef = useRef(0)

  const resolveTeamCategories = async (results) => {
    const queue = results.filter((item) => !item.team.isWomen)
    const categoriesByTeamId = new Map()
    const resolveNext = async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        try {
          const category = await getTeamCompetitionCategory(item.team.id)
          if (category) categoriesByTeamId.set(item.team.id, category)
        } catch {
          // La búsqueda sigue siendo utilizable aunque un club no tenga partidos o categoría disponible.
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

  const visiblePlayers = useMemo(() => {
    const normalizedQuery = playerQuery.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
    return players.filter((player) => {
      const matchesPosition = positionFilter === 'All' || player.position === positionFilter
      const normalizedName = player.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
      const matchesQuery = !normalizedQuery || normalizedName.includes(normalizedQuery)
      return matchesPosition && matchesQuery
    })
  }, [playerQuery, players, positionFilter])

  const squadMetrics = useMemo(() => {
    if (!players.length) return null
    const ages = players.map((player) => player.age).filter((age) => typeof age === 'number')
    const values = players.map((player) => player.marketValue).filter((value) => typeof value === 'number')
    const averageAge = ages.length === players.length
      ? ages.reduce((total, age) => total + age, 0) / players.length
      : null
    const totalValue = values.length === players.length
      ? values.reduce((total, value) => total + value, 0)
      : null
    return averageAge === null && totalValue === null ? null : { averageAge, totalValue }
  }, [players])

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

  const runTeamSearch = async (rawQuery) => {
    const requestId = ++searchRequestRef.current
    const searchTerm = rawQuery.trim()
    if (searchTerm.length < TEAM_SEARCH_MIN_LENGTH) {
      setTeams([])
      setSearchStatus(emptyStatus)
      return
    }

    setSearchStatus({ loading: true, message: '' })
    try {
      const results = await searchTeams(searchTerm)
      if (requestId !== searchRequestRef.current) return
      const categorizedResults = await resolveTeamCategories(results.slice(0, 8))
      if (requestId !== searchRequestRef.current) return
      setTeams(categorizedResults)
      setSearchStatus({ loading: false, message: categorizedResults.length ? '' : 'No encontramos ningún equipo con esa búsqueda.' })
    } catch (error) {
      if (requestId !== searchRequestRef.current) return
      setSearchStatus({ loading: false, message: error.message })
    }
  }

  useEffect(() => {
    const searchTerm = query.trim()
    searchRequestRef.current += 1
    if (searchTerm.length < TEAM_SEARCH_MIN_LENGTH) {
      setTeams([])
      setSearchStatus(emptyStatus)
      return undefined
    }
    setTeams([])
    const timeout = window.setTimeout(() => { void runTeamSearch(searchTerm) }, 240)
    return () => window.clearTimeout(timeout)
  }, [query])

  const handleSearch = (event) => {
    event.preventDefault()
    void runTeamSearch(query)
  }

  const selectTeam = async (item, { onTeamChange = () => {}, onTeamReady = () => {} } = {}) => {
    const nextTeam = item.team
    const requestId = ++teamRequestRef.current
    searchRequestRef.current += 1
    setPendingTeam(nextTeam)
    setTeam(null)
    setTeams([])
    setPlayers([])
    setPositionFilter('All')
    setPlayerQuery('')
    onTeamChange()
    setStatus({ loading: true, message: '' })

    try {
      const latestLineupPromise = getLatestTeamLineup(nextTeam.id).catch(() => null)
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
      const resolvedPlayers = (squad.players || []).map((player) => ({ ...player, club: resolvedTeam }))
      setTeam(resolvedTeam)
      setPlayers(resolvedPlayers)
      setPendingTeam(null)
      setStatus({ loading: false, message: squad.players?.length ? '' : 'La API no devolvió jugadores para este equipo.' })
      void latestLineupPromise.then((latestLineup) => {
        if (requestId === teamRequestRef.current) onTeamReady({ team: resolvedTeam, players: resolvedPlayers, latestLineup })
      })
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
    setPlayerQuery('')
    onReset()
  }

  const restoreDraft = (draft) => {
    if (!draft?.team?.id || !Array.isArray(draft.players)) return false
    const restoredTeam = { ...draft.team, clubTheme: draft.team.clubTheme || getClubTheme(draft.team) }
    setTeam(restoredTeam)
    setPlayers(draft.players.map((player) => ({ ...player, club: player.club || restoredTeam })))
    setPendingTeam(null)
    setPositionFilter('All')
    setPlayerQuery('')
    setClubTheme(restoredTeam.clubTheme)
    applyClubTheme(restoredTeam.clubTheme)
    setStatus(emptyStatus)
    return true
  }

  return {
    query,
    teams,
    team,
    pendingTeam,
    isTeamLoading: Boolean(pendingTeam),
    players,
    positionFilter,
    playerQuery,
    status,
    searchStatus,
    theme,
    clubTheme,
    visiblePlayers,
    squadMetrics,
    setQuery,
    setPlayers,
    setPositionFilter,
    setPlayerQuery,
    setStatus,
    setTheme,
    handleSearch,
    selectTeam,
    resetTeamContext,
    restoreDraft,
  }
}
