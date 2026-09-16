const names = [
  ['0', 'Thibaut Courtois', 'Goalkeeper', 'Bélgica', 1],
  ['1', 'Ferland Mendy', 'Defender', 'Francia', 23],
  ['2', 'Antonio Rüdiger', 'Defender', 'Alemania', 22],
  ['3', 'Éder Militão', 'Defender', 'Brasil', 3],
  ['4', 'Dani Carvajal', 'Defender', 'España', 2],
  ['5', 'Jude Bellingham', 'Midfielder', 'Inglaterra', 5],
  ['6', 'Federico Valverde', 'Midfielder', 'Uruguay', 8],
  ['7', 'Aurélien Tchouaméni', 'Midfielder', 'Francia', 14],
  ['8', 'Vinícius Júnior', 'Attacker', 'Brasil', 7],
  ['9', 'Kylian Mbappé', 'Attacker', 'Francia', 10],
  ['10', 'Rodrygo', 'Attacker', 'Brasil', 11],
  ['11', 'Andriy Lunin', 'Goalkeeper', 'Ucrania', 13],
  ['13', 'Eduardo Camavinga', 'Midfielder', 'Francia', 6],
]

const shortNames = ['Courtois', 'Mendy', 'Rüdiger', 'Militão', 'Carvajal', 'Bellingham', 'Valverde', 'Tchouaméni', 'Vinícius', 'Mbappé', 'Rodrygo', 'Lunin', 'Camavinga']

export const visualTeam = {
  id: '1260',
  name: 'Real Madrid',
  lineupTitle: 'Mi once del Madrid',
  logo: 'https://sports.bzzoiro.com/img/team/1260/?bg=transparent',
  clubTheme: { primary: '#ffffff', secondary: '#6c4aa0', ink: '#4b337a', soft: '#f0edf7' },
}

export const visualPlayers = names.map(([id, name, position, nationality, number], index) => ({
  id,
  name,
  shortName: shortNames[index],
  position,
  nationality,
  number,
  age: null,
  marketValue: null,
  releaseClause: null,
  photo: `https://lineup-editorial.lucksora.chatgpt.site/portraits/${id}.jpg`,
  club: visualTeam,
}))

const starterSlots = ['gk', 'lb', 'lcb', 'rcb', 'rb', 'lcm', 'cm', 'rcm', 'lw', 'st', 'rw']

export const visualDraft = {
  version: 2,
  activeMode: 'current-team',
  drafts: {
    'current-team': {
      team: visualTeam,
      players: visualPlayers,
      themePalette: 'madrid',
      lineup: {
        version: 2,
        type: 'current-team',
        title: 'Mi once del Madrid',
        formation: '4-3-3',
        context: { type: 'team', id: visualTeam.id, name: visualTeam.name },
        playerPool: visualPlayers.map((player) => player.id),
        starters: Object.fromEntries(starterSlots.map((slotId, index) => [slotId, { playerId: visualPlayers[index].id, slotId, role: 'starter' }])),
        bench: [],
        metadata: {},
      },
    },
  },
}

export const referenceState = {
  mode: 'club',
  team: 'madrid',
  formation: '4-3-3',
  title: 'Mi once del Madrid',
  lineup: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  bench: [],
  colors: 'madrid',
}
