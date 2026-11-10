import type { Country, Region } from '../lib/types'

declare const world: {
  w: number
  h: number
  sphere: string
  neutral: string
  views: Record<Region, [number, number, number, number]>
  countries: Country[]
}
export default world
