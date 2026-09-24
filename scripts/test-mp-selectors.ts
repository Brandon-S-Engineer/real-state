// Prueba los selectores de la extensión (marketplace/content/mp-*.js) contra
// los fixtures de HTML real de Facebook. Correr cuando FB cambie el DOM:
//   npm run test:mp-selectors
//
// Usa el fixture crudo (fixtures/raw/, no versionado) si existe; si no, el
// anonimizado.

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { JSDOM } from 'jsdom'

const ROOT = join(__dirname, '..', 'marketplace')
const scripts = ['content/mp-selectors.js', 'content/mp-extract.js'].map((f) => readFileSync(join(ROOT, f), 'utf8'))

function load(fixture: string, url: string) {
  const html = readFileSync(join(ROOT, 'fixtures', fixture), 'utf8')
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { url, runScripts: 'outside-only' })
  for (const s of scripts) dom.window.eval(s)
  return dom.window as unknown as Window & { MPExtract: any; MP_CONFIG: any }
}

let failures = 0
function check(name: string, cond: boolean, detail?: unknown) {
  if (!cond) failures++
  console.log(`${cond ? '✓' : '✗'} ${name}`, cond ? '' : detail ?? '')
}

// ── Grid de búsqueda ─────────────────────────────────────────────────────────
{
  const w = load('search_results.html', 'https://www.facebook.com/marketplace/mexicocity/search/?query=macbook%20pro')
  const cards = w.MPExtract.extractCards(w.document).map((c: any) => c.card)
  check('search: encuentra cards', cards.length >= 20, cards.length)
  check('search: todos vía aria-label', cards.every((c: any) => c._parsedFrom === 'aria'))
  const m1pro = cards.find((c: any) => c.externalId === 'mp_4396767557241789')
  check('search: precio + reducido', m1pro?.price === 17000 && m1pro?.originalPrice === 18500, m1pro)
  check('search: ubicación', m1pro?.locationText === 'La Magdalena Contreras, CDMX', m1pro?.locationText)
  check('search: foto', /^https:\/\/scontent/.test(m1pro?.imageUrl ?? ''))
  const macbooks = cards.filter((c: any) => w.MP_CONFIG.titleMustMatch.test(c.title))
  check('search: filtro MacBook descarta iPad/ASUS/cargadores Ugreen', macbooks.length < cards.length, `${macbooks.length}/${cards.length}`)
  console.log(`  ${cards.length} cards, ${macbooks.length} MacBook`)
}

// ── Item abierto (diálogo sobre la búsqueda) ────────────────────────────────
{
  const raw = existsSync(join(ROOT, 'fixtures/raw/item_page_raw.html'))
  const w = load(raw ? 'raw/item_page_raw.html' : 'item_page.html', 'https://www.facebook.com/marketplace/item/4439409179719391/')
  const { item, error } = w.MPExtract.extractItem(w.document, w.location.href)
  check('item: sin error', !error, error)
  check('item: id', item?.externalId === 'mp_4439409179719391', item?.externalId)
  check('item: título', item?.title === 'MacBook Pro M5', item?.title)
  check('item: precio', item?.price === 30000, item?.price)
  check('item: ubicación', item?.locationText === 'Coyoacán, CDMX', item?.locationText)
  check('item: condición', item?.condition === 'Used - like new', item?.condition)
  check('item: descripción', /MacBook Pro con chip M5/.test(item?.description ?? '') && !/See less/.test(item?.description ?? ''), item?.description?.slice(0, 80))
  check('item: coords', Math.abs((item?.lat ?? 0) - 19.3387) < 0.01 && Math.abs((item?.lng ?? 0) + 99.179) < 0.01, [item?.lat, item?.lng])
  check('item: vendedor', !!item?.sellerName && !!item?.sellerId)
  check('item: foto', /^https:\/\/scontent/.test(item?.imageUrl ?? ''))
  check('item: no vendido', item?.soldHint === false)
  check('relativeToMs', w.MPExtract.relativeToMs('2 weeks') === 14 * 86_400_000 && w.MPExtract.relativeToMs('una semana') === 7 * 86_400_000)
}

console.log(failures ? `\n${failures} fallas` : '\nTodo OK')
process.exit(failures ? 1 : 0)
