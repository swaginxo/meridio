import { FACTS } from '../data/facts'
import { BY_ID } from './geo'
import type { Country, Mode } from './types'

function list(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`
}

/** Nachbarn als Satzteil, höchstens drei, damit der Tipp lesbar bleibt. */
function borders(c: Country): string {
  const names = c.nb.map((id) => BY_ID[id]?.name).filter(Boolean) as string[]
  if (!names.length) return 'hat keine Landgrenzen'
  if (names.length > 3) return `grenzt unter anderem an ${list(names.slice(0, 3))}`
  return `grenzt an ${list(names)}`
}

/** Hinweis nach einem Fehlversuch: Lage und Nachbarn, ohne die Lösung zu nennen. */
export function tipFor(mode: Mode, c: Country): string {
  const where = c.sub || 'auf diesem Kartenausschnitt'
  if (mode === 'laender') return `${c.name} liegt ${where} und ${borders(c)}.`
  if (mode === 'hauptstaedte') return `${c.capital} liegt ${where}. Das gesuchte Land ${borders(c)}.`
  return `Das gesuchte Land liegt ${where} und ${borders(c)}.`
}

export const factFor = (c: Country): string | undefined => FACTS[c.id]
