import { BY_ID, VIEWS } from './geo'
import type { Box, Continent, Country } from './types'

/** Michelle-Modus: einfache Lernebenen in kindgerechter Sprache. */

export const CONTINENT_NAME: Record<Continent, string> = {
  europa: 'Europa',
  asien: 'Asien',
  afrika: 'Afrika',
  nordamerika: 'Nordamerika',
  suedamerika: 'Südamerika',
  ozeanien: 'Australien und Ozeanien',
}

const WHERE: Record<Continent, string> = {
  europa: 'Schau oben in die Mitte der Karte.',
  asien: 'Schau nach rechts oben.',
  afrika: 'Schau in die Mitte der Karte, unter Europa.',
  nordamerika: 'Schau nach links oben.',
  suedamerika: 'Schau nach links unten.',
  ozeanien: 'Schau nach rechts unten.',
}

export interface EasyItem {
  /** Kontinent, Ländercode oder Kennung eines Ozeans, je nach Ebene. */
  target: string
  /** Kleine Zeile und große Zeile der Frage. */
  ask: string
  name: string
  /** Tipps, die direkt zur Frage erscheinen (einer wird ausgewählt). */
  tips: string[]
  /** Zusatz nach einem Fehlversuch: wo auf der Karte. */
  where: string
  /** Auflösung, z. B. "Das ist Europa." */
  answer: string
  /** Kurzer Fakt nach der Antwort. */
  fact: string
}

export interface Spot {
  id: string
  x: number
  y: number
}

export interface EasyLevel {
  id: string
  title: string
  text: string
  /** Was angetippt wird. */
  kind: 'continent' | 'country' | 'spot'
  items: EasyItem[]
  /** Fragen pro Runde. */
  size: number
  spots?: Spot[]
}

/**
 * Kontinent eines Landes für die Kinderkarte. Russland reicht über zwei Kontinente:
 * Es wird wie Asien eingefärbt (dort liegt der größte Teil) und zählt bei beiden als richtig.
 */
export const easyContinent = (c: Country): Continent => (c.id === 'RU' ? 'asien' : c.cont)

const continent = (id: Continent, tips: string[], fact: string): EasyItem => ({
  target: id,
  ask: 'Tippe auf',
  name: CONTINENT_NAME[id],
  tips,
  where: WHERE[id],
  answer: `Das ist ${CONTINENT_NAME[id]}.`,
  fact,
})

const animal = (name: string, id: Continent, tip: string, fact: string): EasyItem => ({
  target: id,
  ask: 'Wo leben',
  name: `${name}?`,
  tips: [tip],
  where: WHERE[id],
  answer: `${name} leben in ${id === 'ozeanien' ? 'Australien' : CONTINENT_NAME[id]}.`,
  fact,
})

const country = (id: string, tips: string[], where: string, fact: string): EasyItem => ({
  target: id,
  ask: 'Tippe auf',
  name: BY_ID[id].name,
  tips,
  where,
  answer: `Das ist ${BY_ID[id].name}.`,
  fact,
})

const ocean = (id: string, name: string, plain: string, tip: string, where: string, fact: string): EasyItem => ({
  target: id,
  ask: 'Tippe auf den Kreis im',
  name,
  tips: [tip],
  where,
  answer: `Das ist der ${plain}.`,
  fact,
})

export const EASY_LEVELS: EasyLevel[] = [
  {
    id: 'kontinente',
    title: 'Kontinente',
    text: 'Tippe auf den richtigen Kontinent.',
    kind: 'continent',
    size: 6,
    items: [
      continent('europa', ['In diesem Gebiet liegt Deutschland.', 'In diesem Gebiet liegen Italien, Frankreich und Spanien.'], 'Europa ist der zweitkleinste Kontinent.'),
      continent('asien', ['Das ist der größte Kontinent der Erde.', 'In diesem Gebiet liegen China, Indien und Japan.', 'In diesem Gebiet leben Pandas und Tiger.'], 'In Asien leben mehr Menschen als auf jedem anderen Kontinent.'),
      continent('afrika', ['In diesem Gebiet leben Löwen, Elefanten und Giraffen.', 'In diesem Gebiet liegt die Sahara, eine riesige Wüste.'], 'In Afrika fließt der Nil, einer der längsten Flüsse der Welt.'),
      continent('nordamerika', ['In diesem Gebiet liegen die USA, Kanada und Mexiko.', 'In diesem Gebiet leben Bisons und Grizzlybären.'], 'In Nordamerika liegen die Niagarafälle.'),
      continent('suedamerika', ['In diesem Gebiet liegt Brasilien.', 'In diesem Gebiet wächst der Regenwald am Amazonas.'], 'In Südamerika liegen die Anden, das längste Gebirge der Erde.'),
      continent('ozeanien', ['In diesem Gebiet liegt Australien.', 'In diesem Gebiet leben Kängurus und Koalas.'], 'Vor Australien liegt das größte Korallenriff der Welt.'),
    ],
  },
  {
    id: 'tiere',
    title: 'Tiere der Welt',
    text: 'Auf welchem Kontinent lebt das Tier?',
    kind: 'continent',
    size: 6,
    items: [
      animal('Kängurus', 'ozeanien', 'Kängurus leben dort, wo Australien liegt.', 'Kängurus tragen ihre Babys in einem Beutel am Bauch.'),
      animal('Koalas', 'ozeanien', 'Koalas leben dort, wo Australien liegt.', 'Koalas schlafen fast den ganzen Tag.'),
      animal('Löwen', 'afrika', 'Löwen leben in der Savanne, in dem Gebiet unter Europa.', 'Löwen leben in Gruppen. So eine Gruppe heißt Rudel.'),
      animal('Giraffen', 'afrika', 'Giraffen leben im selben Gebiet wie Löwen und Zebras.', 'Giraffen sind die höchsten Tiere der Welt.'),
      animal('Zebras', 'afrika', 'Zebras leben im selben Gebiet wie Löwen und Giraffen.', 'Jedes Zebra hat ein eigenes Streifenmuster.'),
      animal('Pandas', 'asien', 'Pandas leben in China. China liegt auf dem größten Kontinent.', 'Pandas fressen fast nur Bambus.'),
      animal('Tiger', 'asien', 'Tiger leben auf dem größten Kontinent, zum Beispiel in Indien.', 'Tiger sind die größten Katzen der Welt.'),
      animal('Lamas', 'suedamerika', 'Lamas leben in den Bergen, in dem Gebiet, wo Brasilien liegt.', 'Lamas tragen in den Bergen schwere Lasten.'),
      animal('Faultiere', 'suedamerika', 'Faultiere leben im Regenwald am Amazonas.', 'Faultiere bewegen sich so langsam, dass auf ihrem Fell Algen wachsen.'),
      animal('Bisons', 'nordamerika', 'Bisons leben in dem Gebiet, wo die USA und Kanada liegen.', 'Bisons sind die schwersten Landtiere in Nordamerika.'),
      animal('Waschbären', 'nordamerika', 'Waschbären kommen aus dem Gebiet, wo die USA und Kanada liegen.', 'Waschbären tasten ihr Futter gern im Wasser ab.'),
      animal('Igel', 'europa', 'Igel leben auch bei uns im Garten.', 'Igel halten im Winter einen langen Winterschlaf.'),
    ],
  },
  {
    id: 'ozeane',
    title: 'Ozeane',
    text: 'Finde die fünf großen Meere der Erde.',
    kind: 'spot',
    size: 5,
    spots: [
      { id: 'pazifik', x: 216, y: 470 },
      { id: 'pazifik', x: 1855, y: 409 },
      { id: 'atlantik', x: 811, y: 306 },
      { id: 'atlantik', x: 909, y: 652 },
      { id: 'indik', x: 1399, y: 634 },
      { id: 'arktis', x: 1000, y: 24 },
      { id: 'sued', x: 1257, y: 860 },
      { id: 'sued', x: 493, y: 871 },
    ],
    items: [
      ocean('pazifik', 'Pazifik', 'Pazifik', 'Das ist der größte Ozean. Er liegt zwischen Amerika und Asien.', 'Schau ganz nach links oder ganz nach rechts.', 'Der Pazifik ist größer als alle Länder der Erde zusammen.'),
      ocean('atlantik', 'Atlantik', 'Atlantik', 'Dieser Ozean liegt zwischen Europa und Amerika.', 'Schau links neben Europa und Afrika.', 'Über den Atlantik segelte Kolumbus nach Amerika.'),
      ocean('indik', 'Indischen Ozean', 'Indische Ozean', 'Dieser Ozean liegt unter Indien, zwischen Afrika und Australien.', 'Schau rechts neben Afrika.', 'Im Indischen Ozean ist das Wasser besonders warm.'),
      ocean('arktis', 'Arktischen Ozean', 'Arktische Ozean', 'Dieser Ozean liegt ganz oben am Nordpol. Dort ist es eiskalt.', 'Schau ganz nach oben.', 'Auf dem Eis am Nordpol leben Eisbären.'),
      ocean('sued', 'Südlichen Ozean', 'Südliche Ozean', 'Dieser Ozean liegt ganz unten, rund um die Antarktis.', 'Schau ganz nach unten.', 'Am Südlichen Ozean leben viele Pinguine.'),
    ],
  },
  {
    id: 'laender',
    title: 'Bekannte Länder',
    text: 'Finde große und bekannte Länder.',
    kind: 'country',
    size: 6,
    items: [
      country('DE', ['Das ist unser Land. Es liegt mitten in Europa.'], 'Schau in die Mitte.', 'In Deutschland gibt es mehr als 20.000 Burgen und Schlösser.'),
      country('FR', ['In diesem Land steht der Eiffelturm.'], 'Schau links neben Deutschland.', 'Aus Frankreich kommen Croissants und Baguette.'),
      country('IT', ['Dieses Land sieht aus wie ein Stiefel.'], 'Schau nach unten, es ragt ins Meer.', 'Aus Italien kommen Pizza und Spaghetti.'),
      country('ES', ['In diesem Land machen viele Familien Urlaub am Strand.'], 'Schau ganz nach links unten.', 'In Spanien scheint sehr oft die Sonne.'),
      country('GB', ['Dieses Land ist eine große Insel. Hier lebt ein König.'], 'Schau nach links oben, ins Meer.', 'In London steht die berühmte Uhr Big Ben.'),
      country('US', ['In diesem Land liegen New York und Hollywood.'], 'Schau in die Mitte, unter Kanada.', 'Die Flagge der USA hat 50 Sterne.'),
      country('CA', ['Auf der Flagge dieses Landes ist ein rotes Ahornblatt.'], 'Schau ganz nach oben.', 'Kanada ist das zweitgrößte Land der Welt.'),
      country('BR', ['Das ist das größte Land in Südamerika. Hier wächst der Regenwald.'], 'Schau nach rechts, es ist riesig.', 'In Brasilien spricht man Portugiesisch.'),
      country('RU', ['Das ist das größte Land der Welt.'], 'Schau ganz nach oben, es ist sehr breit.', 'Russland ist so breit, dass es dort elf verschiedene Uhrzeiten gibt.'),
      country('CN', ['In diesem Land steht die Chinesische Mauer.'], 'Schau in die Mitte, es ist sehr groß.', 'Die Chinesische Mauer ist das längste Bauwerk der Welt.'),
      country('IN', ['In diesem Land steht das Taj Mahal. Es sieht aus wie ein Dreieck.'], 'Schau nach unten, es ragt ins Meer.', 'In Indien leben die meisten Menschen der Welt.'),
      country('JP', ['Dieses Land besteht aus Inseln, ganz rechts in Asien.'], 'Schau ganz nach rechts, ins Meer.', 'In Japan fahren Züge, die über 300 Kilometer pro Stunde schnell sind.'),
      country('AU', ['Dieses Land ist eine riesige Insel. Hier leben Kängurus.'], 'Schau in die Mitte, es ist das größte Stück Land.', 'Australien ist Land und Kontinent zugleich.'),
      country('EG', ['In diesem Land stehen die Pyramiden.'], 'Schau ganz nach oben rechts in Afrika.', 'Die Pyramiden sind über 4.000 Jahre alt.'),
    ],
  },
  {
    id: 'nachbarn',
    title: 'Unsere Nachbarn',
    text: 'Welche Länder liegen neben Deutschland?',
    kind: 'country',
    size: 6,
    items: [
      country('DE', ['Das ist unser Land. Es liegt in der Mitte.'], 'Schau genau in die Mitte.', 'Deutschland hat neun Nachbarländer.'),
      country('DK', ['Dieses Land liegt oben, im Norden von Deutschland.'], 'Schau nach oben.', 'Aus Dänemark kommen die Lego-Steine.'),
      country('PL', ['Dieses Land liegt rechts neben Deutschland.'], 'Schau nach rechts.', 'In Polen leben Wisente, die größten Wildtiere Europas.'),
      country('CZ', ['Dieses Land liegt rechts unten neben Deutschland.'], 'Schau nach rechts unten.', 'Die Hauptstadt von Tschechien heißt Prag.'),
      country('AT', ['Dieses Land liegt unten, in den Bergen.'], 'Schau nach unten rechts.', 'In Österreich kann man sehr gut Ski fahren.'),
      country('CH', ['Dieses Land liegt unten. Hier gibt es viel Käse und Schokolade.'], 'Schau nach unten links.', 'In der Schweiz stehen sehr hohe Berge, die Alpen.'),
      country('FR', ['Dieses große Land liegt links unten. Hier steht der Eiffelturm.'], 'Schau nach links unten.', 'Frankreich ist das größte Nachbarland von Deutschland.'),
      country('LU', ['Dieses Land ist ganz klein. Es liegt links neben Deutschland.'], 'Schau nach links, es ist winzig.', 'Luxemburg ist eines der kleinsten Länder Europas.'),
      country('BE', ['Dieses Land liegt links. Von hier kommen Pommes und Waffeln.'], 'Schau nach links.', 'In Belgien spricht man drei Sprachen, auch Deutsch.'),
      country('NL', ['Dieses Land liegt links oben. Hier gibt es viele Tulpen und Windmühlen.'], 'Schau nach links oben.', 'In den Niederlanden gibt es mehr Fahrräder als Menschen.'),
    ],
  },
]

export const levelById = (id: string): EasyLevel => EASY_LEVELS.find((l) => l.id === id) ?? EASY_LEVELS[0]

/** Länder, die in einer Ebene antippbar sind (leer bei Kontinenten und Ozeanen: dort zählt die ganze Karte). */
export function levelPool(level: EasyLevel): string[] {
  return level.kind === 'country' ? level.items.map((i) => i.target) : []
}

/** Kartenausschnitt für eine Frage. */
export function levelView(level: EasyLevel, item: EasyItem): Box {
  if (level.kind !== 'country') return VIEWS.welt
  if (level.id === 'nachbarn') {
    const boxes = level.items.map((i) => BY_ID[i.target].box)
    const pad = 14
    return [
      Math.min(...boxes.map((b) => b[0])) - pad,
      Math.min(...boxes.map((b) => b[1])) - pad,
      Math.max(...boxes.map((b) => b[2])) + pad,
      Math.max(...boxes.map((b) => b[3])) + pad,
    ]
  }
  // Bekannte Länder: gleich den passenden Kontinent zeigen, damit das Land groß genug zum Antippen ist.
  const c = BY_ID[item.target]
  return c.id === 'RU' ? VIEWS.welt : VIEWS[c.cont]
}
