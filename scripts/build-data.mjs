// Erzeugt src/data/world.js aus world-atlas (Geometrie) und world-countries (Stammdaten).
// Aufruf: npm run data
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
// Geometrie: Natural Earth 1:10m, hier auf Zoomtiefe der App vereinfacht.
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-10m.json'), 'utf8'))
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
const NAME_TO_CCA2 = {
  Kosovo: 'XK', 'N. Cyprus': 'CY', 'Cyprus U.N. Buffer Zone': 'CY', Dhekelia: 'CY', Akrotiri: 'CY',
  Somaliland: 'SO', Baikonur: 'KZ', 'USNB Guantanamo Bay': 'CU',
}

const SUB_DE = {
  'Northern Europe': 'in Nordeuropa', 'Western Europe': 'in Westeuropa', 'Southern Europe': 'in Südeuropa',
  'Eastern Europe': 'in Osteuropa', 'Southeast Europe': 'in Südosteuropa', 'Central Europe': 'in Mitteleuropa',
  'Western Asia': 'in Vorderasien', 'Central Asia': 'in Zentralasien', 'Southern Asia': 'in Südasien',
  'South-Eastern Asia': 'in Südostasien', 'Eastern Asia': 'in Ostasien', 'Northern Africa': 'in Nordafrika',
  'Western Africa': 'in Westafrika', 'Middle Africa': 'in Zentralafrika', 'Eastern Africa': 'in Ostafrika',
  'Southern Africa': 'im südlichen Afrika', 'North America': 'in Nordamerika',
  'Central America': 'in Mittelamerika', Caribbean: 'in der Karibik', 'South America': 'in Südamerika',
  'Australia and New Zealand': 'in Ozeanien', Melanesia: 'in Melanesien im Südpazifik',
  Micronesia: 'in Mikronesien im Westpazifik', Polynesia: 'in Polynesien im Südpazifik',
}

function continentOf(c) {
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'suedamerika' : 'nordamerika'
  return { Europe: 'europa', Asia: 'asien', Africa: 'afrika', Oceania: 'ozeanien' }[c.region] ?? null
}

const projection = geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' })
const path = geoPath(projection)

/** Projizierte Ringe eines Features einsammeln (inklusive Zuschnitt am Kartenrand). */
function ringsOf(f) {
  const rings = []
  let cur = null
  geoPath(projection, {
    moveTo(x, y) { cur = [[x, y]]; rings.push(cur) },
    lineTo(x, y) { cur.push([x, y]) },
    closePath() {},
    arc() {},
  })(f)
  return rings
}

const ringArea = (r) => {
  let a = 0
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]
  return Math.abs(a / 2)
}

/** Douglas-Peucker ohne Rekursion. */
function simplify(pts, tol) {
  if (pts.length < 5 || tol <= 0) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  const t2 = tol * tol
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = pts[a]
    const dx = pts[b][0] - ax
    const dy = pts[b][1] - ay
    const len = dx * dx + dy * dy
    let max = 0
    let at = -1
    for (let i = a + 1; i < b; i++) {
      const px = pts[i][0] - ax
      const py = pts[i][1] - ay
      let d
      if (len === 0) d = px * px + py * py
      else {
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len))
        d = (px - t * dx) ** 2 + (py - t * dy) ** 2
      }
      if (d > max) { max = d; at = i }
    }
    if (max > t2) { keep[at] = 1; stack.push([a, at], [at, b]) }
  }
  return pts.filter((_, i) => keep[i])
}

const TOL = 0.075 // Karteneinheiten, bei maximalem Zoom unter einem Pixel
const num = (n) => String(Math.round(n * 100) / 100)

/** Kleine Länder bleiben unverändert, große verlieren nur Details unterhalb der Zoomtiefe. */
function shapeOf(f) {
  // Fehlerhaft orientierte Polygone liefern einen Ring um die ganze Erdkugel: verwerfen.
  const rings = ringsOf(f).filter((r) => ringArea(r) < W * H * 0.4)
  const total = rings.reduce((s, r) => s + ringArea(r), 0)
  const small = total < 4
  let d = ''
  let main = null
  for (const ring of rings) {
    if (!main || ringArea(ring) > ringArea(main)) main = ring
    if (!small && ringArea(ring) < 0.025) continue
    const pts = small ? ring : simplify(ring, TOL)
    if (pts.length < 3) continue
    d += 'M' + pts.map((p) => `${num(p[0])},${num(p[1])}`).join('L') + 'Z'
  }
  if (!d) return null
  // Für Tippfläche und Zoom zählt das größte Teilstück (Frankreich ohne Guayana, USA ohne Hawaii).
  const xs = main.map((p) => p[0])
  const ys = main.map((p) => p[1])
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  return { d, area: total, box, c: [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] }
}

const byNum = new Map(countries.map((c) => [c.ccn3, c]))
const shapes = new Map() // cca2 -> { d, box, area }
const neutral = []

for (const f of feature(topo, topo.objects.countries).features) {
  const c = f.id != null ? byNum.get(String(f.id).padStart(3, '0')) : null
  const cca2 = c?.cca2 ?? NAME_TO_CCA2[f.properties.name]
  const shape = shapeOf(f)
  if (!shape) continue
  if (!cca2 || cca2 === 'AQ') { neutral.push(shape.d); continue }
  const prev = shapes.get(cca2)
  // Zusatzflächen (z. B. Nordzypern) erweitern nur die Form des Hauptlands.
  if (prev) prev.d += shape.d
  else shapes.set(cca2, shape)
}

const cca3to2 = new Map(countries.map((c) => [c.cca3, c.cca2]))

// Sechs Farben so verteilen, dass Nachbarn nie dieselbe bekommen.
const COLORS = 6
const color = new Map()
const used = new Array(COLORS).fill(0)
const order = [...countries].sort((a, b) => b.borders.length - a.borders.length || a.cca2.localeCompare(b.cca2))
for (const c of order) {
  const taken = new Set(c.borders.map((b) => color.get(cca3to2.get(b))).filter((n) => n != null))
  // Kosovo fehlt in den Grenzlisten von world-countries.
  if (c.cca2 === 'XK') for (const n of ['RS', 'AL', 'MK', 'ME']) taken.add(color.get(n))
  let best = -1
  for (let i = 0; i < COLORS; i++) if (!taken.has(i) && (best < 0 || used[i] < used[best])) best = i
  if (best < 0) best = 0
  color.set(c.cca2, best)
  used[best]++
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
    // Zu klein zum sicheren Antippen: bekommt eine unsichtbare, größere Tippfläche.
    tiny: !shape || shape.area < 14,
    col: color.get(c.cca2) ?? 0,
    sub: SUB_DE[c.subregion] ?? '',
    nb: c.borders.map((b) => cca3to2.get(b)).filter(Boolean),
    n: c.ccn3 ?? '',
    ll: [c.latlng[1], c.latlng[0]],
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
    JSON.stringify({ w: W, h: H, sphere: path({ type: 'Sphere' }).replace(/-?\d+\.\d+/g, (n) => num(Number(n))), neutral: neutral.join(''), views, countries: out }) +
    '\n',
)

const count = (k) => out.filter((c) => c.kind === k).length
console.log(`Länder: ${out.length} (Staaten ${count('staat')}, abhängig ${count('abhaengig')}, umstritten ${count('umstritten')})`)
console.log('ohne Fläche:', out.filter((c) => !c.d).map((c) => c.id).join(' '))
console.log('winzig:', out.filter((c) => c.tiny).length, '| klein:', out.filter((c) => c.small && c.kind === 'staat').map((c) => c.id).join(' '))
for (const k of Object.keys(VIEWS_LL)) console.log(k, out.filter((c) => c.cont === k && c.kind === 'staat').length)
if (process.argv.includes('--list')) for (const c of out) console.log(c.id, '|', c.name, '|', c.capital, '|', c.cont, '|', c.kind)
