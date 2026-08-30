import { euro } from './formatters'

export function formatValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? euro.format(value) : 'No disponible'
}

export function getContractYearsRemaining(contractEnd, now = new Date()) {
  if (!contractEnd) return null
  const end = new Date(contractEnd)
  if (Number.isNaN(end.getTime())) return null

  const remainingDays = (end.getTime() - now.getTime()) / 86_400_000
  return remainingDays <= 0 ? 0 : Math.ceil(remainingDays / 365.25)
}

export function getTransferQuote(player, type, now = new Date()) {
  const marketValue = typeof player?.marketValue === 'number' ? player.marketValue : null
  const releaseClause = typeof player?.releaseClause === 'number' ? player.releaseClause : null
  const contractYears = getContractYearsRemaining(player?.contractEnd, now)

  if (releaseClause !== null) {
    return {
      available: true,
      amount: releaseClause,
      marketValue,
      releaseClause,
      contractYears,
      source: 'release-clause',
      label: type === 'signing' ? 'Cláusula de rescisión' : 'Venta por cláusula',
      detail: 'La cláusula disponible fija el importe de esta operación.',
    }
  }

  if (marketValue === null) {
    return {
      available: false,
      amount: null,
      marketValue: null,
      releaseClause: null,
      contractYears,
      source: 'unavailable',
      label: type === 'signing' ? 'Coste de compra' : 'Valor de venta',
      detail: 'La API no ha proporcionado valor de mercado ni cláusula.',
    }
  }

  if (contractYears === 0) {
    return {
      available: true,
      amount: 0,
      marketValue,
      releaseClause: null,
      contractYears,
      source: 'free-agent',
      label: type === 'signing' ? 'Coste de compra' : 'Valor de venta',
      detail: 'Contrato vencido: jugador libre.',
    }
  }

  const multiplier = contractYears === null
    ? 1
    : contractYears <= 1
      ? 0.75
      : contractYears >= 4 && type === 'signing'
        ? 1.25
        : 1
  const amount = Math.round(marketValue * multiplier)
  const contractDetail = contractYears === null
    ? 'Sin fecha de contrato: se aplica el valor de mercado.'
    : contractYears <= 1
      ? 'Hasta 1 año de contrato: −25% sobre el valor de mercado.'
      : contractYears >= 4 && type === 'signing'
        ? '4+ años de contrato: +25% sobre el valor de mercado.'
        : contractYears >= 4
          ? '4+ años de contrato: se mantiene el valor de mercado en la venta.'
          : 'Entre 2 y 3 años de contrato: valor de mercado.'

  return {
    available: true,
    amount,
    marketValue,
    releaseClause: null,
    contractYears,
    source: 'market-value',
    label: type === 'signing' ? 'Coste de compra' : 'Valor de venta',
    detail: contractDetail,
  }
}
