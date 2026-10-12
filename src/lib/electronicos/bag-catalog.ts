// ── Catálogo Bolsos (solo marcas que autentica Entrupy) ─────────────────────
//
// Fuente: entrupy.com/pricing (consultado 2026-10): Bags & Leather Goods por
// nivel. Solo entran marcas que Entrupy certifica — un bolso que no se puede
// certificar no se puede vender en P75. Fuera a propósito: Michael Kors, Kate
// Spade, Tory Burch, Longchamp, Guess (no las autentica) y las marcas
// streetwear del nivel Contemporary (Supreme, BAPE, Palace…: bolsos de poco valor).
//
// Igual que audífonos, el modelo es la "config" (no hay más specs que separen
// precio de forma confiable en un título). Por marca hay dos líneas de
// respaldo: bolso de modelo no identificado y cartera/accesorio de piel.

export type BagTier = 'ULTRA' | 'PRESTIGE' | 'DESIGNER' | 'CONTEMPORARY'
export type BagKind = 'bolso' | 'slg'

export const TIER_LABEL: Record<BagTier, string> = {
  ULTRA: 'Ultra Prestige',
  PRESTIGE: 'Prestige',
  DESIGNER: 'Designer',
  CONTEMPORARY: 'Contemporary',
}

/** Tokens de Entrupy por autenticación (bolso / cartera, cinturón o accesorio). */
export const TIER_TOKENS: Record<BagTier, Record<BagKind, number>> = {
  ULTRA: { bolso: 20, slg: 10 },
  PRESTIGE: { bolso: 8, slg: 5 },
  DESIGNER: { bolso: 5, slg: 3 },
  CONTEMPORARY: { bolso: 2, slg: 2 },
}

export type BagBrand = {
  code: string
  name: string
  tier: BagTier
  /** Regex (texto normalizado: minúsculas, sin acentos) que identifica la marca. */
  re: RegExp
  /**
   * Piso de precio MXN para un bolso auténtico usado. Abajo de esto casi
   * siempre es réplica sin decirlo: se marca "sospechoso" y no entra a
   * precios. Carteras/accesorios: 40% del piso.
   */
  floor: number
  models: { key: string; label: string; re: RegExp; ultra?: boolean }[]
}

export const BAG_BRANDS: BagBrand[] = [
  {
    code: 'HERMES', name: 'Hermès', tier: 'PRESTIGE', floor: 35000,
    re: /\bherm[e]s\b/,
    models: [
      { key: 'BIRKIN', label: 'Birkin', re: /\bbirkin\b/, ultra: true },
      { key: 'KELLY', label: 'Kelly', re: /\bkelly\b/, ultra: true },
      { key: 'CONSTANCE', label: 'Constance', re: /\bconstance\b/, ultra: true },
      { key: 'PICOTIN', label: 'Picotin', re: /\bpicotin\b/, ultra: true },
      { key: 'LINDY', label: 'Lindy', re: /\blindy\b/, ultra: true },
      { key: 'BOLIDE', label: 'Bolide', re: /\bbolide\b/, ultra: true },
      { key: 'ROULIS', label: 'Roulis', re: /\broulis\b/, ultra: true },
      { key: 'JYPSIERE', label: 'Jypsière', re: /\bjypsiere\b/, ultra: true },
      { key: '2424', label: '24/24', re: /\b24 ?\/ ?24\b/, ultra: true },
      { key: 'EVELYNE', label: 'Evelyne', re: /\bevelyne\b/ },
      { key: 'GARDEN_PARTY', label: 'Garden Party', re: /\bgarden ?party\b/ },
      { key: 'HERBAG', label: 'Herbag', re: /\bherbag\b/ },
    ],
  },
  {
    code: 'CHANEL', name: 'Chanel', tier: 'PRESTIGE', floor: 30000,
    re: /\bchanel\b/,
    models: [
      { key: 'WOC', label: 'Wallet on Chain', re: /\bwoc\b|wallet on chain/ },
      { key: 'BOY', label: 'Boy', re: /\bboy\b/ },
      { key: 'REISSUE', label: '2.55 Reissue', re: /\breissue\b|\b2\.?55\b/ },
      { key: '19', label: 'Chanel 19', re: /\bchanel 19\b|\b19 (bag|flap)\b/ },
      { key: '22', label: 'Chanel 22', re: /\bchanel 22\b|\b22 bag\b/ },
      { key: 'GABRIELLE', label: 'Gabrielle', re: /\bgabrielle\b/ },
      { key: 'GST', label: 'Grand Shopping Tote', re: /\bgst\b|grand shopping/ },
      { key: 'DEAUVILLE', label: 'Deauville', re: /\bdeauville\b/ },
      { key: 'VANITY', label: 'Vanity', re: /\bvanity\b/ },
      { key: 'TRENDY', label: 'Trendy CC', re: /\btrendy\b/ },
      { key: 'COCO_HANDLE', label: 'Coco Handle', re: /coco handle/ },
      // Va al final: "flap"/"timeless" también aparecen en los de arriba
      { key: 'CLASSIC_FLAP', label: 'Classic Flap', re: /classic ?flap|\btimeless\b|\b11\.?12\b|double flap|\bflap\b|\bjumbo\b/ },
    ],
  },
  {
    code: 'DIOR', name: 'Dior', tier: 'PRESTIGE', floor: 18000,
    re: /\b(christian )?dior\b/,
    models: [
      { key: 'LADY', label: 'Lady Dior', re: /\blady ?dior\b|\blady\b/ },
      { key: 'SADDLE', label: 'Saddle', re: /\bsaddle\b/ },
      { key: 'BOOK_TOTE', label: 'Book Tote', re: /\bbook ?tote\b/ },
      { key: 'MONTAIGNE', label: '30 Montaigne', re: /\bmontaigne\b/ },
      { key: 'BOBBY', label: 'Bobby', re: /\bbobby\b/ },
      { key: 'CARO', label: 'Caro', re: /\bcaro\b/ },
      { key: 'DIORAMA', label: 'Diorama', re: /\bdiorama\b/ },
    ],
  },
  {
    code: 'GOYARD', name: 'Goyard', tier: 'PRESTIGE', floor: 15000,
    re: /\bgoyard\b/,
    models: [
      { key: 'SAINT_LOUIS', label: 'Saint Louis', re: /\b(saint|st\.?) ?louis\b/ },
      { key: 'ANJOU', label: 'Anjou', re: /\banjou\b/ },
      { key: 'ARTOIS', label: 'Artois', re: /\bartois\b/ },
      { key: 'SAIGON', label: 'Saïgon', re: /\bsaigon\b/ },
      { key: 'BELVEDERE', label: 'Belvedere', re: /\bbelvedere\b/ },
      { key: 'ROUETTE', label: 'Rouette', re: /\brouette\b/ },
    ],
  },
  {
    code: 'LV', name: 'Louis Vuitton', tier: 'DESIGNER', floor: 7000,
    re: /\b(louis|luis|lui|loui) ?vu?it+on\b|\bl\.? ?v\b(?! ?\d)/,
    models: [
      { key: 'NEVERFULL', label: 'Neverfull', re: /\bnever ?full\b/ },
      { key: 'SPEEDY', label: 'Speedy', re: /\bspeedy\b/ },
      { key: 'ALMA', label: 'Alma', re: /\balma\b/ },
      { key: 'KEEPALL', label: 'Keepall', re: /\bkeep ?all\b/ },
      { key: 'POCHETTE_METIS', label: 'Pochette Métis', re: /\bmetis\b/ },
      { key: 'MULTI_POCHETTE', label: 'Multi Pochette', re: /\bmulti ?pochette\b/ },
      { key: 'FELICIE', label: 'Pochette Félicie', re: /\bfelicie\b/ },
      { key: 'ONTHEGO', label: 'OnTheGo', re: /\bon ?the ?go\b/ },
      { key: 'CAPUCINES', label: 'Capucines', re: /\bcapucines?\b/ },
      { key: 'TWIST', label: 'Twist', re: /\btwist\b/ },
      { key: 'NOE', label: 'Noé', re: /\bnoe\b/ },
      { key: 'FAVORITE', label: 'Favorite', re: /\bfavorite\b/ },
      { key: 'DAUPHINE', label: 'Dauphine', re: /\bdauphine\b/ },
      { key: 'ARTSY', label: 'Artsy', re: /\bartsy\b/ },
      { key: 'PALM_SPRINGS', label: 'Palm Springs', re: /\bpalm ?springs?\b/ },
      { key: 'GRACEFUL', label: 'Graceful', re: /\bgraceful\b/ },
      { key: 'DIANE', label: 'Diane', re: /\bdiane\b/ },
      { key: 'CARRYALL', label: 'CarryAll', re: /\bcarry ?all\b/ },
      { key: 'COUSSIN', label: 'Coussin', re: /\bcoussin\b/ },
      { key: 'BOULOGNE', label: 'Boulogne', re: /\bboulogne\b/ },
      { key: 'LOOP', label: 'Loop', re: /\bloop\b/ },
      { key: 'BUMBAG', label: 'Bumbag', re: /\bbum ?bag\b|\brinonera\b/ },
      { key: 'AVENUE', label: 'Avenue Sling', re: /\bavenue\b/ },
      { key: 'CHRISTOPHER', label: 'Christopher', re: /\bchristopher\b/ },
      { key: 'DISCOVERY', label: 'Discovery', re: /\bdiscovery\b/ },
      { key: 'POCHETTE_ACC', label: 'Pochette Accessoires', re: /\bpochette (accessoires?|accesorios?)\b/ },
      { key: 'EVA', label: 'Eva', re: /\beva\b/ },
      { key: 'ODEON', label: 'Odéon', re: /\bodeon\b/ },
    ],
  },
  {
    code: 'GUCCI', name: 'Gucci', tier: 'DESIGNER', floor: 6000,
    re: /\bgucci\b/,
    models: [
      { key: 'MARMONT', label: 'GG Marmont', re: /\bmarmont\b/ },
      { key: 'DIONYSUS', label: 'Dionysus', re: /\bdionysus\b/ },
      { key: 'JACKIE', label: 'Jackie', re: /\bjackie\b/ },
      { key: 'HORSEBIT', label: 'Horsebit 1955', re: /\bhorsebit\b/ },
      { key: 'OPHIDIA', label: 'Ophidia', re: /\bophidia\b/ },
      { key: 'SOHO', label: 'Soho Disco', re: /\bsoho\b|\bdisco\b/ },
      { key: 'SYLVIE', label: 'Sylvie', re: /\bsylvie\b/ },
      { key: 'BAMBOO', label: 'Bamboo', re: /\bbamboo\b/ },
      { key: 'BLONDIE', label: 'Blondie', re: /\bblondie\b/ },
      { key: 'ATTACHE', label: 'Attache', re: /\battache\b/ },
      { key: 'DIANA', label: 'Diana', re: /\bdiana\b/ },
      { key: 'PADLOCK', label: 'Padlock', re: /\bpadlock\b/ },
      { key: 'JUMBO_GG', label: 'Jumbo GG', re: /\bjumbo gg\b/ },
    ],
  },
  {
    code: 'PRADA', name: 'Prada', tier: 'DESIGNER', floor: 6000,
    re: /\bprada\b/,
    models: [
      { key: 'RE_EDITION', label: 'Re-Edition', re: /\bre ?-? ?edition\b|\b2005\b|\b2000\b/ },
      { key: 'GALLERIA', label: 'Galleria', re: /\bgalleria\b/ },
      { key: 'CLEO', label: 'Cleo', re: /\bcleo\b/ },
      { key: 'CAHIER', label: 'Cahier', re: /\bcahier\b/ },
      { key: 'NYLON', label: 'Re-Nylon', re: /\bre ?-? ?nylon\b|\bnylon\b/ },
    ],
  },
  {
    code: 'FENDI', name: 'Fendi', tier: 'DESIGNER', floor: 7000,
    re: /\bfendi\b/,
    models: [
      { key: 'BAGUETTE', label: 'Baguette', re: /\bbaguette\b/ },
      { key: 'PEEKABOO', label: 'Peekaboo', re: /\bpeek ?a ?boo\b/ },
      { key: 'FIRST', label: 'Fendi First', re: /\bfendi first\b/ },
      { key: 'SUNSHINE', label: 'Sunshine', re: /\bsunshine\b/ },
      { key: 'BY_THE_WAY', label: 'By The Way', re: /\bby the way\b/ },
      { key: 'MON_TRESOR', label: 'Mon Trésor', re: /\bmon tresor\b/ },
      { key: 'KAN_I', label: 'Kan I', re: /\bkan ?i\b/ },
    ],
  },
  {
    code: 'YSL', name: 'Saint Laurent', tier: 'DESIGNER', floor: 7000,
    re: /\b(yves )?saint ?laurent\b|\bysl\b/,
    models: [
      { key: 'LOULOU', label: 'Loulou', re: /\bloulou\b/ },
      { key: 'KATE', label: 'Kate', re: /\bkate\b/ },
      { key: 'SAC_DE_JOUR', label: 'Sac de Jour', re: /\bsac de jour\b/ },
      { key: 'NIKI', label: 'Niki', re: /\bniki\b/ },
      { key: 'LE_5A7', label: 'Le 5 à 7', re: /\b5 a 7\b/ },
      { key: 'SUNSET', label: 'Sunset', re: /\bsunset\b/ },
      { key: 'ENVELOPE', label: 'Envelope', re: /\benvelope\b/ },
      { key: 'COLLEGE', label: 'College', re: /\bcollege\b/ },
      { key: 'ICARE', label: 'Icare', re: /\bicare\b/ },
      { key: 'SOLFERINO', label: 'Solferino', re: /\bsolferino\b/ },
      { key: 'LE_37', label: 'Le 37', re: /\ble 37\b/ },
    ],
  },
  {
    code: 'CELINE', name: 'Celine', tier: 'DESIGNER', floor: 12000,
    re: /\bceline\b/,
    models: [
      { key: 'TRIOMPHE', label: 'Triomphe', re: /\btriomphe\b/ },
      { key: 'LUGGAGE', label: 'Luggage', re: /\bluggage\b/ },
      { key: 'BELT', label: 'Belt Bag', re: /\bbelt bag\b/ },
      { key: 'AVA', label: 'Ava', re: /\bava\b/ },
      { key: 'BOX', label: 'Classic Box', re: /\bclassic box\b|\bbox bag\b/ },
      { key: 'CABAS', label: 'Cabas', re: /\bcabas\b/ },
      { key: 'TABOU', label: 'Tabou', re: /\btabou\b/ },
    ],
  },
  {
    code: 'BOTTEGA', name: 'Bottega Veneta', tier: 'DESIGNER', floor: 12000,
    re: /\bbottega( veneta)?\b/,
    models: [
      { key: 'JODIE', label: 'Jodie', re: /\bjodie\b/ },
      { key: 'CASSETTE', label: 'Cassette', re: /\bcassette\b/ },
      { key: 'POUCH', label: 'The Pouch', re: /\bpouch\b/ },
      { key: 'ARCO', label: 'Arco', re: /\barco\b/ },
      { key: 'ANDIAMO', label: 'Andiamo', re: /\bandiamo\b/ },
      { key: 'SARDINE', label: 'Sardine', re: /\bsardine\b/ },
      { key: 'CABAT', label: 'Cabat', re: /\bcabat\b/ },
    ],
  },
  {
    code: 'LOEWE', name: 'Loewe', tier: 'DESIGNER', floor: 12000,
    re: /\bloewe\b/,
    models: [
      { key: 'PUZZLE', label: 'Puzzle', re: /\bpuzzle\b/ },
      { key: 'GATE', label: 'Gate', re: /\bgate\b/ },
      { key: 'HAMMOCK', label: 'Hammock', re: /\bhammock\b/ },
      { key: 'FLAMENCO', label: 'Flamenco', re: /\bflamenco\b/ },
      { key: 'AMAZONA', label: 'Amazona', re: /\bamazona\b/ },
      { key: 'BASKET', label: 'Basket', re: /\bbasket\b|\bcanasta\b/ },
    ],
  },
  {
    code: 'BALENCIAGA', name: 'Balenciaga', tier: 'DESIGNER', floor: 6000,
    re: /\bbalenciaga\b/,
    models: [
      { key: 'CITY', label: 'City', re: /\bcity\b|\bmotorcycle\b/ },
      { key: 'HOURGLASS', label: 'Hourglass', re: /\bhourglass\b/ },
      { key: 'CAGOLE', label: 'Le Cagole', re: /\bcagole\b/ },
      { key: 'NEO_CLASSIC', label: 'Neo Classic', re: /\bneo classic\b/ },
    ],
  },
  {
    code: 'MIUMIU', name: 'Miu Miu', tier: 'DESIGNER', floor: 9000,
    re: /\bmiu ?miu\b/,
    models: [
      { key: 'WANDER', label: 'Wander', re: /\bwander\b/ },
      { key: 'ARCADIE', label: 'Arcadie', re: /\barcadie\b/ },
      { key: 'MATELASSE', label: 'Matelassé', re: /\bmatelasse\b/ },
      { key: 'BEAU', label: 'Beau', re: /\bbeau\b/ },
    ],
  },
  {
    code: 'BURBERRY', name: 'Burberry', tier: 'DESIGNER', floor: 4000,
    re: /\bburberr?ys?\b/,
    models: [
      { key: 'LOLA', label: 'Lola', re: /\blola\b/ },
      { key: 'TB', label: 'TB Bag', re: /\btb\b/ },
      { key: 'POCKET', label: 'Pocket', re: /\bpocket\b/ },
      { key: 'OLYMPIA', label: 'Olympia', re: /\bolympia\b/ },
    ],
  },
  {
    code: 'GIVENCHY', name: 'Givenchy', tier: 'DESIGNER', floor: 7000,
    re: /\bgivenchy\b/,
    models: [
      { key: 'ANTIGONA', label: 'Antigona', re: /\bantigona\b/ },
      { key: 'PANDORA', label: 'Pandora', re: /\bpandora\b/ },
    ],
  },
  {
    code: 'VALENTINO', name: 'Valentino', tier: 'DESIGNER', floor: 6000,
    // "Mario Valentino" y "Valentino Orlandi" son otras marcas (baratas)
    re: /(?<!mario )\bvalentino\b(?! orlandi)/,
    models: [
      { key: 'ROCKSTUD', label: 'Rockstud', re: /\brockstud\b/ },
      { key: 'VSLING', label: 'VSling', re: /\bv ?sling\b/ },
      { key: 'LOCO', label: 'Locò', re: /\bloco\b/ },
      { key: 'ONE_STUD', label: 'One Stud', re: /\bone stud\b/ },
    ],
  },
  {
    code: 'CHLOE', name: 'Chloé', tier: 'DESIGNER', floor: 5000,
    re: /\bchloe\b/,
    models: [
      { key: 'MARCIE', label: 'Marcie', re: /\bmarcie\b/ },
      { key: 'FAYE', label: 'Faye', re: /\bfaye\b/ },
      { key: 'DREW', label: 'Drew', re: /\bdrew\b/ },
      { key: 'WOODY', label: 'Woody', re: /\bwoody\b/ },
      { key: 'TESS', label: 'Tess', re: /\btess\b/ },
      { key: 'PADDINGTON', label: 'Paddington', re: /\bpaddington\b/ },
      { key: 'NILE', label: 'Nile', re: /\bnile\b/ },
    ],
  },
  {
    code: 'FERRAGAMO', name: 'Ferragamo', tier: 'DESIGNER', floor: 3500,
    re: /\b(salvatore )?ferragamo\b/,
    models: [],
  },
  {
    code: 'DG', name: 'Dolce & Gabbana', tier: 'DESIGNER', floor: 5000,
    re: /\bdolce (& |y |and )?gabbana\b|\bd ?& ?g\b/,
    models: [
      { key: 'SICILY', label: 'Sicily', re: /\bsicily\b/ },
      { key: 'DEVOTION', label: 'Devotion', re: /\bdevotion\b/ },
    ],
  },
  {
    code: 'LOUBOUTIN', name: 'Christian Louboutin', tier: 'DESIGNER', floor: 6000,
    re: /\blouboutin\b/,
    models: [
      { key: 'PALOMA', label: 'Paloma', re: /\bpaloma\b/ },
      { key: 'CABATA', label: 'Cabata', re: /\bcabata\b/ },
    ],
  },
  {
    code: 'COACH', name: 'Coach', tier: 'CONTEMPORARY', floor: 1200,
    re: /\bcoach\b/,
    models: [
      { key: 'TABBY', label: 'Tabby', re: /\btabby\b/ },
      { key: 'ROGUE', label: 'Rogue', re: /\brogue\b/ },
      { key: 'WILLOW', label: 'Willow', re: /\bwillow\b/ },
      { key: 'BROOKLYN', label: 'Brooklyn', re: /\bbrooklyn\b/ },
      { key: 'SWINGER', label: 'Swinger', re: /\bswinger\b/ },
    ],
  },
  {
    code: 'MCM', name: 'MCM', tier: 'CONTEMPORARY', floor: 2500,
    re: /\bmcm\b/,
    models: [
      { key: 'STARK', label: 'Stark', re: /\bstark\b/ },
    ],
  },
]

export type BagLine = string

/** Línea: BAG_<MARCA>_<MODELO> · BAG_<MARCA> (bolso sin modelo) · BAG_<MARCA>_SLG (cartera/accesorio). */
export const bagLine = (brand: string, model?: string) => (model ? `BAG_${brand}_${model}` : `BAG_${brand}`)

export type BagEntry = { line: BagLine; label: string; brand: BagBrand; kind: BagKind; tier: BagTier }

export const BAG_CATALOG: BagEntry[] = BAG_BRANDS.flatMap((b) => [
  ...b.models.map((m) => ({ line: bagLine(b.code, m.key), label: `${b.name} ${m.label}`, brand: b, kind: 'bolso' as const, tier: m.ultra ? 'ULTRA' as const : b.tier })),
  { line: bagLine(b.code), label: `${b.name} · otro modelo`, brand: b, kind: 'bolso' as const, tier: b.tier },
  { line: bagLine(b.code, 'SLG'), label: `${b.name} · cartera/accesorio`, brand: b, kind: 'slg' as const, tier: b.tier },
])

export const BAG_LINES: BagLine[] = BAG_CATALOG.map((e) => e.line)

export const BAG_LINE_LABEL: Record<string, string> = Object.fromEntries(BAG_CATALOG.map((e) => [e.line, e.label]))

const BY_LINE = new Map(BAG_CATALOG.map((e) => [e.line, e]))

export function bagEntry(line: string | null | undefined): BagEntry | undefined {
  return line ? BY_LINE.get(line) : undefined
}

export function isBagLine(line: string | null | undefined): boolean {
  return !!line && line.startsWith('BAG_')
}

/** Piso de precio para que un listing cuente como posible auténtico. */
export function bagPriceFloor(line: string | null | undefined): number {
  const e = bagEntry(line)
  if (!e) return 1200
  return e.kind === 'slg' ? Math.round(e.brand.floor * 0.4) : e.brand.floor
}

/** Costo aproximado de la autenticación Entrupy en MXN (plan Petit: US$5.60/token). */
export function entrupyCostMxn(line: string | null | undefined, usdMxn = 18.5): number | null {
  const e = bagEntry(line)
  if (!e) return null
  return Math.round(TIER_TOKENS[e.tier][e.kind] * 5.6 * usdMxn)
}
