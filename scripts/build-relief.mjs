// Erzeugt public/relief.webp: Gebirgsschattierung in derselben Projektion wie die Karte.
// Quelle: Natural Earth "Shaded Relief Basic" 1:50m (gemeinfrei),
// https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip
// Aufruf: node scripts/build-relief.mjs /pfad/zu/SR_50M.tif
import { geoNaturalEarth1 } from 'd3-geo'
import sharp from 'sharp'

const src = process.argv[2]
if (!src) throw new Error('Pfad zur SR_50M.tif fehlt')

// Muss zu scripts/build-data.mjs passen.
const W = 2000
const H = 1000
const SCALE = 1.5
const projection = geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' })

const SW = 5400
const SH = 2700
const { data: gray } = await sharp(src, { limitInputPixels: false })
  .resize(SW, SH, { kernel: 'lanczos3' })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true })

// Der häufigste Grauwert ist die ebene Fläche (Meer und Flachland).
const hist = new Uint32Array(256)
for (let i = 0; i < gray.length; i++) hist[gray[i]]++
const flat = hist.indexOf(Math.max(...hist))

const OW = Math.round(W * SCALE)
const OH = Math.round(H * SCALE)
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

const file = new URL('../public/relief.webp', import.meta.url).pathname
const info = await sharp(out, { raw: { width: OW, height: OH, channels: 4 } })
  .webp({ quality: 62, alphaQuality: 70, effort: 6 })
  .toFile(file)
console.log(`relief.webp ${OW}x${OH}, ${(info.size / 1024).toFixed(0)} KB, Ebene bei Grauwert ${flat}`)
