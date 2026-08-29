import { getInitials } from '../utils/formatters'

export function Avatar({ player, small = false }) {
  const sizeClass = small ? 'avatar--small' : ''

  if (player.photo) {
    return <img className={`avatar ${sizeClass}`} src={player.photo} alt="" />
  }

  return <span className={`avatar avatar--fallback ${sizeClass}`}>{getInitials(player.name)}</span>
}
