import { fallbackTheme, getKnownClubColor } from '../../src/teamTheme.js'

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null
}

function normalizeColor(value) {
  const candidate = typeof value === 'object' && value ? firstValue(value.hex, value.value, value.code, value.color) : value
  if (typeof candidate !== 'string') return null
  const match = candidate.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (!match) return null
  const hex = match.length === 3 ? match.split('').map((part) => `${part}${part}`).join('') : match
  return `#${hex.toLowerCase()}`
}

function readColors(source) {
  source = source || {}
  const colors = source.colors ?? source.colours ?? source.team_colors ?? source.team_colours ?? {}
  const primary = normalizeColor(firstValue(
    source.primary_color, source.primary_colour, source.primaryColor, source.primary,
    source.main, source.main_color, source.shirt_color, source.jersey_color, source.base,
    colors.primary, colors.primary_color, colors.primary_colour, colors.main, colors.home,
  ))
  const secondary = normalizeColor(firstValue(
    source.secondary_color, source.secondary_colour, source.secondaryColor, source.secondary,
    source.accent, source.accent_color, source.shorts_color, source.sleeve, source.number,
    colors.secondary, colors.secondary_color, colors.secondary_colour, colors.accent, colors.away,
  ))
  return primary ? { primary, secondary } : null
}

function toTheme(primaryColor, secondaryColor = primaryColor) {
  const parse = (color) => [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map((part) => Number.parseInt(part, 16))
  const [red, green, blue] = parse(primaryColor)
  const [secondaryRed, secondaryGreen, secondaryBlue] = parse(secondaryColor)
  const contrast = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.62 ? '#10251f' : '#ffffff'

  return {
    primary: primaryColor,
    secondary: secondaryColor,
    soft: `rgba(${red}, ${green}, ${blue}, .28)`,
    glow: `rgba(${red}, ${green}, ${blue}, .18)`,
    onPrimary: contrast(red, green, blue),
    onSecondary: contrast(secondaryRed, secondaryGreen, secondaryBlue),
  }
}

export function getKitColors(metadata, side) {
  const source = metadata?.metadata || metadata || {}
  const jersey = source.jerseys?.[side]
  const kit = firstValue(
    jersey?.player, jersey?.outfield, jersey, source.jersey_colors?.[side], source.kits?.[side],
    source.kit_colors?.[side], source.team_kits?.[side], source[`${side}_kit`],
    source[`${side}_kit_colors`], source[`${side}_colors`], source[side]?.kit,
    source[side]?.colors, source[`${side}_team`]?.kit, source[`${side}_team`]?.colors,
  )
  const directColors = {
    primary: firstValue(source[`${side}_kit_primary`], source[`${side}_kit_primary_color`], source[`${side}_primary_color`]),
    secondary: firstValue(source[`${side}_kit_secondary`], source[`${side}_kit_secondary_color`], source[`${side}_secondary_color`]),
  }
  return readColors(kit || directColors)
}

export function resolveTeamTheme(team, kitColors = null, wikidataColors = null) {
  const teamColors = readColors(team)
  if (teamColors) return { ...toTheme(teamColors.primary, teamColors.secondary || teamColors.primary), source: 'bsd-team' }
  if (kitColors) return { ...toTheme(kitColors.primary, kitColors.secondary || kitColors.primary), source: 'bsd-kit' }
  if (wikidataColors?.primary) return { ...toTheme(wikidataColors.primary, wikidataColors.secondary || wikidataColors.primary), source: 'wikidata' }

  const knownColor = getKnownClubColor(team?.name)
  if (knownColor) return { ...toTheme(knownColor), source: 'known' }
  return { ...fallbackTheme, source: 'fallback' }
}
