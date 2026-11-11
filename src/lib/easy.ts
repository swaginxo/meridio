import type { Continent, Country } from './types'

/** Inhalte für den Michelle-Modus: Kontinente in einfacher Sprache. */
export interface EasyContinent {
  id: Continent
  name: string
  /** Tipps, die direkt zur Frage erscheinen. */
  tips: string[]
  /** Hinweis nach einem Fehlversuch: wo auf der Karte. */
  where: string
  /** Kurzer Fakt nach der richtigen Antwort. */
  fact: string
}

export const EASY: EasyContinent[] = [
  {
    id: 'europa',
    name: 'Europa',
    tips: ['In diesem Gebiet liegt Deutschland.', 'In diesem Gebiet liegen Italien, Frankreich und Spanien.'],
    where: 'Schau oben in die Mitte der Karte.',
    fact: 'Europa ist der zweitkleinste Kontinent.',
  },
  {
    id: 'asien',
    name: 'Asien',
    tips: [
      'Das ist der größte Kontinent der Erde.',
      'In diesem Gebiet liegen China, Indien und Japan.',
      'In diesem Gebiet leben Pandas und Tiger.',
    ],
    where: 'Schau nach rechts oben.',
    fact: 'In Asien leben mehr Menschen als auf jedem anderen Kontinent.',
  },
  {
    id: 'afrika',
    name: 'Afrika',
    tips: [
      'In diesem Gebiet leben Löwen, Elefanten und Giraffen.',
      'In diesem Gebiet liegt die Sahara, eine riesige Wüste.',
    ],
    where: 'Schau in die Mitte der Karte, unter Europa.',
    fact: 'In Afrika fließt der Nil, einer der längsten Flüsse der Welt.',
  },
  {
    id: 'nordamerika',
    name: 'Nordamerika',
    tips: ['In diesem Gebiet liegen die USA, Kanada und Mexiko.', 'In diesem Gebiet leben Bisons und Grizzlybären.'],
    where: 'Schau nach links oben.',
    fact: 'In Nordamerika liegen die Niagarafälle.',
  },
  {
    id: 'suedamerika',
    name: 'Südamerika',
    tips: ['In diesem Gebiet liegt Brasilien.', 'In diesem Gebiet wächst der Regenwald am Amazonas.'],
    where: 'Schau nach links unten.',
    fact: 'In Südamerika liegen die Anden, das längste Gebirge der Erde.',
  },
  {
    id: 'ozeanien',
    name: 'Australien und Ozeanien',
    tips: ['In diesem Gebiet liegt Australien.', 'In diesem Gebiet leben Kängurus und Koalas.'],
    where: 'Schau nach rechts unten.',
    fact: 'Vor Australien liegt das größte Korallenriff der Welt.',
  },
]

/**
 * Kontinent eines Landes für die Kinderkarte. Russland reicht über zwei Kontinente:
 * Es wird wie Asien eingefärbt (dort liegt der größte Teil) und zählt bei beiden als richtig.
 */
export const easyContinent = (c: Country): Continent => (c.id === 'RU' ? 'asien' : c.cont)
export const easyAccepts = (target: Continent, c: Country): boolean =>
  easyContinent(c) === target || (c.id === 'RU' && target === 'europa')
