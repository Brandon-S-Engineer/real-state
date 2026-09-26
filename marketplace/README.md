# Apple Price Catcher — Chrome Extension

Captura **pasiva** de listings de MacBook (M1–M5 y Neo) e iPhone (11 en adelante) en Facebook Marketplace y en grupos de Facebook, y los manda al CRM (`/dashboard/macbook` y `/dashboard/iphone`) para descubrir el precio real de mercado.

No hace scroll ni click. Lo único automático es recargar la pestaña de resultados de Marketplace cada 4–20 min (aleatorio, nunca con un producto abierto) para agarrar lo recién publicado.

> Esta carpeta nació como copia de la extensión de bienes raíces (`extension/`, que sigue intacta). El código de real estate que queda aquí (plantillas, autores, envío a Clientes) no se usa para MacBooks.

## Qué captura

| Dónde | Qué | Cómo |
|---|---|---|
| Búsqueda de Marketplace (`/marketplace/…/search?query=macbook`) | título, precio, precio anterior ("reduced from"), municipio, foto | `aria-label` de cada card |
| Item abierto (diálogo o página) | + descripción, condición, coordenadas del mapa, vendedor, vendido/no disponible | `h1`, filas `[justify="all"]`, mapa estático |
| Grupos configurados | posts que matchean las keywords (precio y specs se sacan del texto en el servidor) | observer de grupos existente |

El servidor decide si es MacBook o iPhone, descarta Intel / iPhones viejos (X, XR, 8…), accesorios, reparaciones, "busco/compro" e intercambios, parsea los specs y calcula el score de oportunidad.

## Instalación

1. CRM → **API Keys** → nueva key → cópiala (`rsk_…`)
2. `chrome://extensions` → Modo desarrollador → **Cargar descomprimida** → esta carpeta (`marketplace/`)
3. Opciones (⚙ en el popup) → **Conexión al CRM**: URL + API key → **Probar conexión**
4. (Grupos) agrega los grupos de compra-venta y carga **+ Pack MacBook**, **+ Pack iPhone** y **+ Pack ruido**
5. Abre Marketplace, busca "macbook" o "iphone" y scrollea. El indicador abajo a la derecha muestra lo capturado.

Tip: haz búsquedas separadas por zona (cambia la ubicación de Marketplace a Centro, Santa Fe, Polanco…) y **repite las mismas búsquedas en días distintos**. Así se detecta qué listings desaparecen, que es la señal de venta real.

## Cuando Facebook cambie el DOM

Todos los selectores viven en **`content/mp-selectors.js`** (sin clases ofuscadas, solo `aria-label`, `role`, `href`).

1. En la página rota: popup → **Copiar layout para debug** (HTML sin clases ni estilos)
2. Guárdalo en `fixtures/` (en `fixtures/raw/` si trae nombres de personas; esa carpeta no se versiona)
3. Ajusta `content/mp-selectors.js`
4. `npm run test:mp-selectors` para probar contra los fixtures

## Archivos

- `content/mp-selectors.js`: configuración de selectores (lo único que se toca cuando FB cambia)
- `content/mp-extract.js`: extracción pura (testeable con jsdom)
- `content/marketplace.js`: observer, lotes cada 3 s, indicador en pantalla
- `content/observer.js`: grupos (reenvía matches a Precios Electrónicos)
- `background/service-worker.js`: `ELEC_INGEST` → `POST /api/electronicos/listings`
- `fixtures/`: HTML real de FB (el del item está anonimizado)
