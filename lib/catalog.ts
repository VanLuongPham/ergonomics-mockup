export type FormFactor = 'over-ear' | 'in-ear'
export type Dimension = 'sound' | 'anc' | 'battery' | 'comfort' | 'calls' | 'value'

export interface Product {
  id: string
  name: string
  brand: string
  image: string
  price: number
  listPrice?: number
  formFactor: FormFactor
  rating: number
  reviews: number
  colors: string[]
  badge?: string
  blurb: string
  specs: {
    sound: number
    anc: number
    battery: number
    weight: number
    comfort: number
    mic: number
    water: 'None' | 'IPX4' | 'IPX5' | 'IPX7'
    multipoint: boolean
    codec: string
  }
}

export const CATALOG: Product[] = [
  {
    id: 'sonari-halo',
    name: 'Sonari Halo 700',
    brand: 'Sonari',
    image: '/products/sonari-halo.png',
    price: 329,
    listPrice: 379,
    formFactor: 'over-ear',
    rating: 4.7,
    reviews: 2341,
    colors: ['Midnight', 'Silver'],
    badge: 'Best seller',
    blurb: 'Flagship noise cancelling with plush memory-foam cushions.',
    specs: { sound: 9, anc: 9.6, battery: 30, weight: 250, comfort: 9, mic: 8.4, water: 'None', multipoint: true, codec: 'LDAC' },
  },
  {
    id: 'aurel-q7',
    name: 'Aurel Q7 Wireless',
    brand: 'Aurel',
    image: '/products/aurel-q7.png',
    price: 279,
    formFactor: 'over-ear',
    rating: 4.6,
    reviews: 1876,
    colors: ['Sand', 'Graphite'],
    blurb: 'Strong ANC and 40-hour battery in a fold-flat frame.',
    specs: { sound: 8.6, anc: 9, battery: 40, weight: 265, comfort: 8.2, mic: 7.2, water: 'None', multipoint: true, codec: 'AAC' },
  },
  {
    id: 'velo-studio',
    name: 'Velo Studio Pro',
    brand: 'Velo',
    image: '/products/velo-studio.png',
    price: 199,
    listPrice: 249,
    formFactor: 'over-ear',
    rating: 4.4,
    reviews: 3120,
    colors: ['Navy', 'Black'],
    badge: 'Deal',
    blurb: 'Big, warm sound and marathon battery. Heavier build.',
    specs: { sound: 8.1, anc: 7.6, battery: 50, weight: 290, comfort: 7, mic: 6.4, water: 'None', multipoint: false, codec: 'AAC' },
  },
  {
    id: 'kiro-air',
    name: 'Kiro Air Lite',
    brand: 'Kiro',
    image: '/products/kiro-air.png',
    price: 129,
    formFactor: 'over-ear',
    rating: 4.3,
    reviews: 985,
    colors: ['White', 'Black'],
    blurb: 'Featherweight everyday headphones with 60-hour battery.',
    specs: { sound: 7, anc: 6.4, battery: 60, weight: 220, comfort: 7.8, mic: 6, water: 'None', multipoint: true, codec: 'SBC' },
  },
  {
    id: 'brava-monitor',
    name: 'Brava Monitor X',
    brand: 'Brava',
    image: '/products/brava-monitor.png',
    price: 449,
    formFactor: 'over-ear',
    rating: 4.8,
    reviews: 642,
    colors: ['Walnut'],
    badge: 'Premium',
    blurb: 'Reference-grade tuning with walnut cups and top-tier ANC.',
    specs: { sound: 9.8, anc: 9.4, battery: 24, weight: 330, comfort: 8.4, mic: 8.6, water: 'None', multipoint: true, codec: 'aptX Adaptive' },
  },
  {
    id: 'sonari-buds',
    name: 'Sonari Buds Pro 2',
    brand: 'Sonari',
    image: '/products/sonari-buds.png',
    price: 249,
    formFactor: 'in-ear',
    rating: 4.6,
    reviews: 4210,
    colors: ['Black', 'Pearl'],
    blurb: 'Pocketable earbuds with class-leading noise cancelling.',
    specs: { sound: 8.6, anc: 9.1, battery: 30, weight: 6, comfort: 8.4, mic: 8, water: 'IPX4', multipoint: true, codec: 'LDAC' },
  },
  {
    id: 'pulse-sport',
    name: 'Pulse Sport Fit',
    brand: 'Pulse',
    image: '/products/pulse-sport.png',
    price: 149,
    formFactor: 'in-ear',
    rating: 4.5,
    reviews: 1532,
    colors: ['Ember', 'Graphite'],
    blurb: 'Secure ear-hook fit and IPX7 for hard workouts.',
    specs: { sound: 7.2, anc: 6, battery: 32, weight: 9, comfort: 9, mic: 6.6, water: 'IPX7', multipoint: false, codec: 'AAC' },
  },
  {
    id: 'aurel-dot',
    name: 'Aurel Dot E3',
    brand: 'Aurel',
    image: '/products/aurel-dot.png',
    price: 89,
    formFactor: 'in-ear',
    rating: 4.2,
    reviews: 2678,
    colors: ['Mint', 'White'],
    badge: 'Under $100',
    blurb: 'Tiny, affordable earbuds for everyday listening.',
    specs: { sound: 6.6, anc: 5.2, battery: 24, weight: 5, comfort: 7.6, mic: 6, water: 'IPX5', multipoint: true, codec: 'SBC' },
  },
  {
    id: 'halden-work',
    name: 'Halden Work H2',
    brand: 'Halden',
    image: '/products/halden-work.png',
    price: 179,
    formFactor: 'over-ear',
    rating: 4.5,
    reviews: 734,
    colors: ['Slate'],
    blurb: 'Built for calls: 6-mic array and all-day fabric comfort.',
    specs: { sound: 7.2, anc: 7.2, battery: 36, weight: 240, comfort: 8.6, mic: 9.5, water: 'None', multipoint: true, codec: 'AAC' },
  },
  {
    id: 'velo-buds',
    name: 'Velo Buds ANC',
    brand: 'Velo',
    image: '/products/velo-buds.png',
    price: 179,
    formFactor: 'in-ear',
    rating: 4.4,
    reviews: 1290,
    colors: ['White', 'Black'],
    blurb: 'Balanced stem earbuds with solid ANC and clear calls.',
    specs: { sound: 7.8, anc: 8.2, battery: 28, weight: 5, comfort: 8, mic: 7.4, water: 'IPX4', multipoint: true, codec: 'AAC' },
  },
]

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(
  CATALOG.map((p) => [p.id, p]),
)

export const BRANDS = Array.from(new Set(CATALOG.map((p) => p.brand))).sort()

interface DimensionMeta {
  label: string
  get: (p: Product) => number
  format: (p: Product) => string
  higherIsBetter: boolean
}

export const DIMENSION_ORDER: Dimension[] = ['sound', 'anc', 'battery', 'comfort', 'calls', 'value']

export const DIMENSIONS: Record<Dimension, DimensionMeta> = {
  sound: { label: 'Sound quality', get: (p) => p.specs.sound, format: (p) => `${p.specs.sound}/10`, higherIsBetter: true },
  anc: { label: 'Noise cancelling', get: (p) => p.specs.anc, format: (p) => `${p.specs.anc}/10`, higherIsBetter: true },
  battery: { label: 'Battery life', get: (p) => p.specs.battery, format: (p) => `${p.specs.battery} h`, higherIsBetter: true },
  comfort: { label: 'Comfort', get: (p) => p.specs.comfort, format: (p) => `${p.specs.comfort}/10`, higherIsBetter: true },
  calls: { label: 'Call quality', get: (p) => p.specs.mic, format: (p) => `${p.specs.mic}/10`, higherIsBetter: true },
  value: { label: 'Price', get: (p) => p.price, format: (p) => `$${p.price}`, higherIsBetter: false },
}

export function formFactorLabel(f: FormFactor | 'any') {
  if (f === 'any') return 'Any type'
  return f === 'in-ear' ? 'Earbuds' : 'Over-ear'
}
