// ── Selectores de Facebook Marketplace (ÚNICO lugar a tocar cuando FB cambie) ─
//
// Facebook ofusca las clases (x1i10hfl…) y las rota seguido, así que aquí NO hay
// ni una clase. Todo se ancla en cosas semánticas que FB mantiene por
// accesibilidad: href, aria-label, role, h1, atributos raros pero estables.
//
// Cuando algo se rompa:
//   1. Abre la página en FB → popup de la extensión → "Copiar layout para debug"
//   2. Pega el HTML en marketplace/fixtures/ (raw/ si trae datos personales)
//   3. Ajusta este archivo y corre:  npm run test:mp-selectors
//
// Fixtures de referencia: marketplace/fixtures/search_results.html (grid de
// búsqueda) y marketplace/fixtures/item_page.html (item abierto como diálogo).

;(() => {
  window.MP_CONFIG = {
    // ── Resultados de búsqueda / categoría ────────────────────────────────────
    card: {
      // Cada card es un <a> al item. Los anuncios apuntan a l.facebook.com → no matchean.
      link: 'a[href*="/marketplace/item/"]',
      // aria-label: "MacBook Pro 16 M1 Pro, MX$17,000, reduced from MX$18,500, La Magdalena Contreras, CDMX, listing 4396767557241789"
      ariaLabel: /^(.*), (MX\$[\d,]+|Free|Gratis)(?:, (?:reduced from|precio anterior:?|antes) (MX\$[\d,]+))?, (.+), listing (\d+)$/i,
      itemId: /\/marketplace\/item\/(\d+)/,
      image: 'img',
      // Líneas de innerText que no son título (badges sobre la foto)
      noiseLines: /^(Just listed|Recién publicado|Nuevo|Sponsored|Patrocinado)$/i,
    },

    // ── Página / diálogo de un item ───────────────────────────────────────────
    item: {
      // Abierto desde la búsqueda = diálogo sobre el grid. Abierto directo = main.
      roots: [
        '[role="dialog"][aria-label="Marketplace Listing Viewer"]',
        '[role="dialog"][aria-label*="Marketplace"]',
        '[role="main"]',
      ],
      title: 'h1',
      // "MX$30,000 · In stock" (a veces "MX$27,000MX$29,000" con el tachado)
      priceText: /^MX\$\s?[\d,]+/,
      // "Listed in Coyoacán, CDMX" / "Listed 2 weeks ago in Coyoacán, CDMX" / "Publicado hace 3 días en …"
      listedText: /^(Listed|Publicado)\b/,
      listedAgoIn: /^Listed\s+(.+?)\s+ago\s+in\s+(.+)$/i,
      listedIn: /^Listed\s+in\s+(.+)$/i,
      publicadoHaceEn: /^Publicado\s+hace\s+(.+?)\s+en\s+(.+)$/i,
      publicadoEn: /^Publicado\s+en\s+(.+)$/i,
      // Filas "Condition | Used - like new" (el atributo justify="all" es raro y estable)
      detailRow: '[justify="all"]',
      conditionLabel: /^(Condition|Estado|Condición)$/i,
      // La descripción vive en un span dentro de div[aria-hidden=false]; elegimos el más largo
      descriptionCandidates: 'div[aria-hidden="false"] > span[dir="auto"] > span',
      seeMore: /\s*(See more|See less|Ver más|Ver menos)\s*$/i,
      // Mapa estático: background-image: url('…static_map.php?…center=19.33%2C-99.17…')
      map: '[style*="static_map.php"]',
      mapCenter: /center=(-?[\d.]+)(?:%2C|,)(-?[\d.]+)/,
      seller: 'a[href*="/marketplace/profile/"][aria-label]',
      sellerId: /\/marketplace\/profile\/(\d+)/,
      productIdLink: 'a[href*="product_id="]',
      productIdParam: /product_id=(\d+)/,
      photos: '[aria-label^="View photo"] img, [aria-label^="Ver foto"] img',
      photoFallback: 'img[alt^="Product photo of"], img[alt^="Foto del producto"]',
      // Zonas a ignorar al buscar descripción (carruseles de anuncios)
      ignoreWithin: 'a[aria-label="Advertiser link"], [aria-label="Loading More Ad Images"]',
      soldText: /·\s*(Sold|Vendido|Pending|Pendiente)\b/i,
      unavailableText: /(This listing is no longer available|no longer available|ya no está disponible|Esta publicación ya no está disponible)/i,
    },

    // ── Filtro de relevancia ──────────────────────────────────────────────────
    // Solo se manda al CRM lo que parece MacBook. El servidor vuelve a filtrar
    // (Intel, accesorios, "busco") con el parser completo.
    titleMustMatch: /mac\s?book/i,
  }
})()
