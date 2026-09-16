const goalkeeper = { id: 'gk', label: 'POR', kind: 'Goalkeeper', x: 50, y: 83 }

function line(players, y) {
  return players.map((item, index) => ({ ...item, x: ((index + 1) / (players.length + 1)) * 100, y }))
}

const player = (id, label, kind) => ({ id, label, kind })

export const formations = {
  '4-3-3': [
    goalkeeper,
    ...line([player('lb', 'LI', 'Defender'), player('lcb', 'DFC', 'Defender'), player('rcb', 'DFC', 'Defender'), player('rb', 'LD', 'Defender')], 65),
    ...line([player('lcm', 'MC', 'Midfielder'), player('cm', 'MC', 'Midfielder'), player('rcm', 'MC', 'Midfielder')], 42),
    ...line([player('lw', 'EI', 'Attacker'), player('st', 'DC', 'Attacker'), player('rw', 'ED', 'Attacker')], 19),
  ],
  '4-4-2': [
    goalkeeper,
    ...line([player('lb', 'LI', 'Defender'), player('lcb', 'DFC', 'Defender'), player('rcb', 'DFC', 'Defender'), player('rb', 'LD', 'Defender')], 65),
    ...line([player('lm', 'MI', 'Midfielder'), player('lcm', 'MC', 'Midfielder'), player('rcm', 'MC', 'Midfielder'), player('rm', 'MD', 'Midfielder')], 42),
    ...line([player('lst', 'DC', 'Attacker'), player('rst', 'DC', 'Attacker')], 19),
  ],
  '3-5-2': [
    goalkeeper,
    ...line([player('lcb', 'DFC', 'Defender'), player('cb', 'DFC', 'Defender'), player('rcb', 'DFC', 'Defender')], 65),
    ...line([player('lwb', 'CAI', 'Midfielder'), player('lcm', 'MC', 'Midfielder'), player('cm', 'MC', 'Midfielder'), player('rcm', 'MC', 'Midfielder'), player('rwb', 'CAD', 'Midfielder')], 42),
    ...line([player('lst', 'DC', 'Attacker'), player('rst', 'DC', 'Attacker')], 19),
  ],
  '4-2-3-1': [
    goalkeeper,
    ...line([player('lb', 'LI', 'Defender'), player('lcb', 'DFC', 'Defender'), player('rcb', 'DFC', 'Defender'), player('rb', 'LD', 'Defender')], 65),
    ...line([player('ldm', 'MCD', 'Midfielder'), player('rdm', 'MCD', 'Midfielder')], 49.67),
    ...line([player('lam', 'MP', 'Midfielder'), player('cam', 'MP', 'Midfielder'), player('ram', 'MP', 'Midfielder')], 34.33),
    ...line([player('st', 'DC', 'Attacker')], 19),
  ],
  '4-1-4-1': [
    goalkeeper,
    ...line([player('lb', 'LI', 'Defender'), player('lcb', 'DFC', 'Defender'), player('rcb', 'DFC', 'Defender'), player('rb', 'LD', 'Defender')], 65),
    ...line([player('dm', 'MCD', 'Midfielder')], 49.67),
    ...line([player('lm', 'MI', 'Midfielder'), player('lcm', 'MC', 'Midfielder'), player('rcm', 'MC', 'Midfielder'), player('rm', 'MD', 'Midfielder')], 34.33),
    ...line([player('st', 'DC', 'Attacker')], 19),
  ],
  '3-4-3': [
    goalkeeper,
    ...line([player('lcb', 'DFC', 'Defender'), player('cb', 'DFC', 'Defender'), player('rcb', 'DFC', 'Defender')], 65),
    ...line([player('lm', 'MI', 'Midfielder'), player('lcm', 'MC', 'Midfielder'), player('rcm', 'MC', 'Midfielder'), player('rm', 'MD', 'Midfielder')], 42),
    ...line([player('lw', 'EI', 'Attacker'), player('st', 'DC', 'Attacker'), player('rw', 'ED', 'Attacker')], 19),
  ],
  '5-3-2': [
    goalkeeper,
    ...line([player('lwb', 'CAI', 'Defender'), player('lcb', 'DFC', 'Defender'), player('cb', 'DFC', 'Defender'), player('rcb', 'DFC', 'Defender'), player('rwb', 'CAD', 'Defender')], 65),
    ...line([player('lcm', 'MC', 'Midfielder'), player('cm', 'MC', 'Midfielder'), player('rcm', 'MC', 'Midfielder')], 42),
    ...line([player('lst', 'DC', 'Attacker'), player('rst', 'DC', 'Attacker')], 19),
  ],
}

export const positionNames = {
  Goalkeeper: 'Portero',
  Defender: 'Defensa',
  Midfielder: 'Centrocampista',
  Attacker: 'Delantero',
}
