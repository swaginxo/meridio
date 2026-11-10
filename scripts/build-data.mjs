// Erzeugt src/data/world.js aus world-atlas (Geometrie) und world-countries (Stammdaten).
// Aufruf: npm run data
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'))
const countries = require('world-countries')

const W = 2000
const H = 1000

// Deutsche Hauptstadtnamen, wo sie vom Eintrag in world-countries abweichen.
const CAPITAL_DE = {
  AT: 'Wien', BE: 'Brüssel', CZ: 'Prag', DK: 'Kopenhagen', GR: 'Athen', IT: 'Rom',
  PL: 'Warschau', PT: 'Lissabon', RO: 'Bukarest', RS: 'Belgrad', RU: 'Moskau', UA: 'Kiew',
  LU: 'Luxemburg', VA: 'Vatikanstadt', SM: 'San Marino', CY: 'Nikosia', GE: 'Tiflis',
  AM: 'Jerewan', CN: 'Peking', JP: 'Tokio', KP: 'Pjöngjang', IN: 'Neu-Delhi', IR: 'Teheran',
  IQ: 'Bagdad', SY: 'Damaskus', SA: 'Riad', KW: 'Kuwait-Stadt', OM: 'Maskat', YE: 'Sanaa',
  UZ: 'Taschkent', KG: 'Bischkek', TJ: 'Duschanbe', TM: 'Aschgabat', SG: 'Singapur',
  EG: 'Kairo', DZ: 'Algier', LY: 'Tripolis', ET: 'Addis Abeba', SO: 'Mogadischu',
  DJ: 'Dschibuti', SD: 'Khartum', CM: 'Jaunde', MX: 'Mexiko-Stadt', CU: 'Havanna',
  GT: 'Guatemala-Stadt', PA: 'Panama-Stadt', MN: 'Ulaanbaatar', KI: 'Süd-Tarawa', HK: 'Hongkong',
  TW: 'Taipeh', XK: 'Pristina', EH: 'El Aaiún', IL: 'Jerusalem', PS: 'Ramallah',
  ZA: 'Pretoria', BO: 'Sucre', LK: 'Sri Jayewardenepura Kotte', MD: 'Chișinău',
  IS: 'Reykjavík', BR: 'Brasília', CO: 'Bogotá', US: 'Washington, D.C.', BI: 'Gitega',
  KZ: 'Astana', MM: 'Naypyidaw', NR: 'Yaren', CH: 'Bern', MY: 'Kuala Lumpur',
  NL: 'Amsterdam', BJ: 'Porto-Novo', CI: 'Yamoussoukro', TZ: 'Dodoma', SZ: 'Mbabane',
  ME: 'Podgorica', AG: 'Saint John’s', GD: 'St. George’s', MT: 'Valletta',
  TO: 'Nukuʻalofa', TD: 'N’Djamena', BN: 'Bandar Seri Begawan', MV: 'Malé',
  ID: 'Jakarta', PW: 'Ngerulmud', FM: 'Palikir', MH: 'Majuro', TV: 'Funafuti',
}

// Deutsche Ländernamen, wo die Übersetzung in world-countries sperrig ist.
const NAME_DE = {
  CD: 'DR Kongo', CG: 'Republik Kongo', CZ: 'Tschechien', MK: 'Nordmazedonien',
  VA: 'Vatikanstadt', KR: 'Südkorea', KP: 'Nordkorea', FM: 'Mikronesien',
  ST: 'São Tomé und Príncipe', SZ: 'Eswatini', TL: 'Osttimor', CI: 'Elfenbeinküste',
  CV: 'Kap Verde', MM: 'Myanmar', US: 'USA', GB: 'Vereinigtes Königreich',
  AE: 'Vereinigte Arabische Emirate', DO: 'Dominikanische Republik',
  CF: 'Zentralafrikanische Republik', BA: 'Bosnien und Herzegowina', PS: 'Palästina',
  RU: 'Russland', SY: 'Syrien', IR: 'Iran', LA: 'Laos', VN: 'Vietnam', BN: 'Brunei',
  MD: 'Moldau', TZ: 'Tansania', BO: 'Bolivien', VE: 'Venezuela', KN: 'St. Kitts und Nevis',
  LC: 'St. Lucia', VC: 'St. Vincent und die Grenadinen', BY: 'Belarus',
}

const DISPUTED = new Set(['XK', 'TW', 'EH'])
// Features ohne ISO-Nummer in world-atlas: Name -> Land, dem die Fläche zugeschlagen wird.
const NAME_TO_CCA2 = { Kosovo: 'XK', 'N. Cyprus': 'CY', Somaliland: 'SO' }

function continentOf(c) {
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'suedamerika' : 'nordamerika'
  return { Europe: 'europa', Asia: 'asien', Africa: 'afrika', Oceania: 'ozeanien' }[c.region] ?? null
}

const projection = geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' })
const path = geoPath(projection)
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))

const byNum = new Map(countries.map((c) => [c.ccn3, c]))
const shapes = new Map() // cca2 -> { d, box, area }
const neutral = []

for (const f of feature(topo, topo.objects.countries).features) {
  const c = f.id != null ? byNum.get(String(f.id).padStart(3, '0')) : null
  const cca2 = c?.cca2 ?? NAME_TO_CCA2[f.properties.name]
  const d = path(f)
  if (!d) continue
  if (!cca2 || cca2 === 'AQ') { neutral.push(round(d)); continue }
  const [[x0, y0], [x1, y1]] = path.bounds(f)
  const prev = shapes.get(cca2)
  if (prev) {
    prev.d += round(d)
  } else {
    // Für Pin und Zoom zählt das größte Teilstück (Frankreich ohne Guayana, USA ohne Hawaii).
    let main = f
    if (f.geometry.type === 'MultiPolygon') {
      let best = -1
      for (const coords of f.geometry.coordinates) {
        const part = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } }
        const a = path.area(part)
        if (a > best) { best = a; main = part }
      }
    }
    const [cx, cy] = path.centroid(main)
    const [[mx0, my0], [mx1, my1]] = path.bounds(main)
    shapes.set(cca2, {
      d: round(d),
      c: [cx, cy],
      box: [mx0, my0, mx1, my1],
      full: [x0, y0, x1, y1],
      area: path.area(f),
    })
  }
}

const out = []
for (const c of countries) {
  const cont = continentOf(c)
  if (!cont) continue
  const core = c.unMember || c.cca2 === 'VA' || c.cca2 === 'PS'
  const kind = DISPUTED.has(c.cca2) ? 'umstritten' : core ? 'staat' : 'abhaengig'
  const shape = shapes.get(c.cca2)
  const capital = CAPITAL_DE[c.cca2] ?? c.capital?.[0]
  if (!capital) continue
  let pt = shape?.c
  if (!pt || !Number.isFinite(pt[0])) pt = projection([c.latlng[1], c.latlng[0]])
  if (!shape && kind === 'abhaengig') continue // winzige Gebiete ohne Kartenfläche auslassen
  const r1 = (n) => Math.round(n * 10) / 10
  out.push({
    id: c.cca2,
    name: NAME_DE[c.cca2] ?? c.translations.deu.common,
    capital,
    cont,
    kind,
    small: c.area < 1500,
    // Pin, wenn das Land auf der Weltkarte zu klein zum Antippen ist.
    pin: !shape || shape.area < 14,
    c: pt.map(r1),
    box: shape ? shape.box.map(r1) : [pt[0] - 4, pt[1] - 4, pt[0] + 4, pt[1] + 4].map(r1),
    d: shape?.d ?? '',
  })
}
out.sort((a, b) => a.name.localeCompare(b.name, 'de'))

// Kartenausschnitte je Kontinent (Länge/Breite), projiziert.
const VIEWS_LL = {
  welt: null,
  europa: [-25, 34, 45, 71.5],
  asien: [26, -11, 146, 56],
  afrika: [-19, -35.5, 52, 38],
  nordamerika: [-168, 7, -52, 73],
  suedamerika: [-82, -56, -34, 13],
  ozeanien: [112, -48, 180, 20],
}
const views = {}
for (const [k, b] of Object.entries(VIEWS_LL)) {
  if (!b) { views[k] = [0, 0, W, H]; continue }
  const [lo0, la0, lo1, la1] = b
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i <= 20; i++) {
    for (let j = 0; j <= 20; j++) {
      const [x, y] = projection([lo0 + ((lo1 - lo0) * i) / 20, la0 + ((la1 - la0) * j) / 20])
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
  }
  views[k] = [x0, y0, x1, y1].map((n) => Math.round(n))
}

mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(
  new URL('../src/data/world.js', import.meta.url),
  '// Generiert von scripts/build-data.mjs, nicht von Hand bearbeiten.\nexport default ' +
    JSON.stringify({ w: W, h: H, sphere: round(path({ type: 'Sphere' })), neutral: neutral.join(''), views, countries: out }) +
    '\n',
)

const count = (k) => out.filter((c) => c.kind === k).length
console.log(`Länder: ${out.length} (Staaten ${count('staat')}, abhängig ${count('abhaengig')}, umstritten ${count('umstritten')})`)
console.log('ohne Fläche:', out.filter((c) => !c.d).map((c) => c.id).join(' '))
console.log('Pins:', out.filter((c) => c.pin).length, '| klein:', out.filter((c) => c.small && c.kind === 'staat').map((c) => c.id).join(' '))
for (const k of Object.keys(VIEWS_LL)) console.log(k, out.filter((c) => c.cont === k && c.kind === 'staat').length)
if (process.argv.includes('--list')) for (const c of out) console.log(c.id, '|', c.name, '|', c.capital, '|', c.cont, '|', c.kind)
