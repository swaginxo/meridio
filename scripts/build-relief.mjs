// Erzeugt die Gebirgsschattierung in derselben Projektion wie die Karte:
//   public/relief.webp          Übersicht für die ganze Welt
//   public/relief/<x>_<y>.webp  Kacheln in voller Quellauflösung, beim Hineinzoomen nachgeladen
//   src/data/relief-tiles.ts    Liste der Kacheln, die Gebirge enthalten
// Quelle: Natural Earth "Shaded Relief Basic" 1:50m (gemeinfrei),
// https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip
// Aufruf: node scripts/build-relief.mjs /pfad/zu/SR_50M.tif
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { geoNaturalEarth1 } from 'd3-geo'
import sharp from 'sharp'

const src = process.argv[2]
if (!src) throw new Error('Pfad zur SR_50M.tif fehlt')

// Muss zu scripts/build-data.mjs passen.
const W = 2000
const H = 1000
const projection = geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' })

/** Pixel je Karteneinheit: 5 entspricht etwa der Auflösung der Quelle. */
const SCALE = 5
/** Kachelgröße in Karteneinheiten und Überlappung gegen sichtbare Nähte. */
const TILE = 200
const LAP = 0.4
const BASE_W = 3000

const { data: gray, info } = await sharp(src, { limitInputPixels: false })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true })
const SW = info.width
const SH = info.height

// Der häufigste Grauwert ist die ebene Fläche (Meer und Flachland).
const hist = new Uint32Array(256)
for (let i = 0; i < gray.length; i += 7) hist[gray[i]]++
const flat = hist.indexOf(Math.max(...hist))

const OW = W * SCALE
const OH = H * SCALE
const out = Buffer.alloc(OW * OH * 4)

const sample = (lon, lat) => {
  const fx = Math.min(SW - 1.001, Math.max(0, ((lon + 180) / 360) * SW - 0.5))
  const fy = Math.min(SH - 1.001, Math.max(0, ((90 - lat) / 180) * SH - 0.5))
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const i = y0 * SW + x0
  const top = gray[i] * (1 - tx) + gray[i + 1] * tx
  const bottom = gray[i + SW] * (1 - tx) + gray[i + SW + 1] * tx
  return top * (1 - ty) + bottom * ty
}

for (let py = 0; py < OH; py++) {
  for (let px = 0; px < OW; px++) {
    const x = (px + 0.5) / SCALE
    const y = (py + 0.5) / SCALE
    const ll = projection.invert([x, y])
    if (!ll || Math.abs(ll[0]) > 180 || Math.abs(ll[1]) > 90) continue
    // Außerhalb der Erdkugel liefert invert trotzdem Werte: per Rückprojektion prüfen.
    const back = projection(ll)
    if (Math.abs(back[0] - x) > 0.5 || Math.abs(back[1] - y) > 0.5) continue
    const g = sample(ll[0], ll[1])
    const o = (py * OW + px) * 4
    if (g < flat) {
      // Schattenhang: warmes Dunkelbraun.
      out[o] = 46
      out[o + 1] = 34
      out[o + 2] = 22
      out[o + 3] = Math.min(255, ((flat - g) / flat) * 1.55 * 255)
    } else {
      // Sonnenhang: Weiß.
      out[o] = out[o + 1] = out[o + 2] = 255
      out[o + 3] = Math.min(255, ((g - flat) / (255 - flat)) * 0.9 * 255)
    }
  }
}

const raw = { raw: { width: OW, height: OH, channels: 4 }, limitInputPixels: false }
const pub = new URL('../public/', import.meta.url).pathname

const base = await sharp(out, raw)
  .resize(BASE_W, Math.round((BASE_W * H) / W), { kernel: 'lanczos3' })
  .webp({ quality: 62, alphaQuality: 70, effort: 6 })
  .toFile(pub + 'relief.webp')

rmSync(pub + 'relief', { recursive: true, force: true })
mkdirSync(pub + 'relief')
const keys = []
let bytes = 0
const lap = Math.round(LAP * SCALE)
for (let ty = 0; ty < H / TILE; ty++) {
  for (let tx = 0; tx < W / TILE; tx++) {
    const left = Math.max(0, tx * TILE * SCALE - lap)
    const top = Math.max(0, ty * TILE * SCALE - lap)
    const right = Math.min(OW, (tx + 1) * TILE * SCALE + lap)
    const bottom = Math.min(OH, (ty + 1) * TILE * SCALE + lap)
    const region = { left, top, width: right - left, height: bottom - top }
    const tile = sharp(out, raw).extract(region)
    // Kacheln ohne nennenswerte Schattierung (offenes Meer) auslassen.
    const { channels } = await tile.clone().stats()
    if (channels[3].mean < 0.6) continue
    const file = await tile.webp({ quality: 58, alphaQuality: 68, effort: 5 }).toFile(`${pub}relief/${tx}_${ty}.webp`)
    bytes += file.size
    keys.push(`${tx}_${ty}`)
  }
}

writeFileSync(
  new URL('../src/data/relief-tiles.ts', import.meta.url),
  `// Generiert von scripts/build-relief.mjs, nicht von Hand bearbeiten.
/** Kachelgröße in Karteneinheiten und Überlappung der Bilder. */
export const RELIEF_TILE = ${TILE}
export const RELIEF_LAP = ${LAP}
/** Pixel je Karteneinheit in Übersicht und Kacheln. */
export const RELIEF_BASE_SCALE = ${BASE_W / W}
export const RELIEF_TILE_SCALE = ${SCALE}
/** Kacheln (Spalte_Zeile), die Gebirge enthalten. */
export const RELIEF_TILES = new Set(${JSON.stringify(keys)})
`,
)
console.log(
  `Übersicht ${(base.size / 1024).toFixed(0)} KB, ${keys.length} Kacheln mit zusammen ${(bytes / 1048576).toFixed(1)} MB, Ebene bei Grauwert ${flat}`,
)
