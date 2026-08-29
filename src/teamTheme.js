const fallbackTheme = {
  primary: '#ef3a58',
  soft: 'rgba(101, 21, 42, .38)',
  glow: 'rgba(239, 58, 88, .16)',
  onPrimary: '#ffffff',
}

export function applyClubTheme(theme) {
  Object.entries(theme).forEach(([key, value]) => {
    const cssVariable = `--club-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
    document.documentElement.style.setProperty(cssVariable, value)
  })
}

const knownClubColors = {
  'real madrid': '#00529f',
  barcelona: '#a50044',
  'atletico madrid': '#c8102e',
  'athletic club': '#ee2523',
  sevilla: '#d71920',
  valencia: '#f58220',
  villarreal: '#fbe122',
  'real betis': '#00954c',
  'real sociedad': '#0067b1',
  osasuna: '#d71920',
  'manchester city': '#6cabdd',
  'manchester united': '#da291c',
  liverpool: '#e31b23',
  arsenal: '#ef0107',
  chelsea: '#034694',
  tottenham: '#132257',
  newcastle: '#63b4e4',
  'aston villa': '#670e36',
  'bayern munich': '#dc052d',
  'bayern münchen': '#dc052d',
  'borussia dortmund': '#fde100',
  'bayer leverkusen': '#e32221',
  'rb leipzig': '#dd0741',
  leipzig: '#dd0741',
  stuttgart: '#e32221',
  juventus: '#1d1d1b',
  inter: '#0068a8',
  'inter milan': '#0068a8',
  'ac milan': '#fb090b',
  milan: '#fb090b',
  napoli: '#12a0d7',
  roma: '#8e1f2d',
  lazio: '#87d8f7',
  atalanta: '#1d2e80',
  fiorentina: '#4f1f7a',
  psg: '#004170',
  'paris saint germain': '#004170',
  marseille: '#00aeef',
  monaco: '#e30613',
}

const hex = (value) => value.toString(16).padStart(2, '0')

function toTheme(red, green, blue) {
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return {
    primary: `#${hex(red)}${hex(green)}${hex(blue)}`,
    soft: `rgba(${red}, ${green}, ${blue}, .28)`,
    glow: `rgba(${red}, ${green}, ${blue}, .18)`,
    onPrimary: luminance > 0.62 ? '#10251f' : '#ffffff',
  }
}

function themeFromHex(color) {
  const normalized = color.replace('#', '')
  return toTheme(
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  )
}

function getKnownTheme(teamName) {
  const normalized = teamName?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || ''
  const color = Object.entries(knownClubColors).find(([club]) => normalized === club || normalized.includes(club))?.[1]
  return color ? themeFromHex(color) : null
}

export async function getClubTheme(logoUrl, teamName) {
  const knownTheme = getKnownTheme(teamName)
  if (knownTheme) return knownTheme
  // La Image API de BSD no habilita CORS, por lo que no se puede leer el píxel
  // del escudo desde el navegador. Los clubes conocidos conservan su color real;
  // el resto usa una paleta neutra hasta disponer de un color de perfil en la API.
  return fallbackTheme
}

export { fallbackTheme }
