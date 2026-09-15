# GW2 — extraído de programming_crm

Todo lo de GW2 vivía mezclado dentro del CRM (`src/app/gw2`, `src/app/api/gw2`,
`src/components/gw2`, `src/lib/gw2`, `scripts/gw2`, etc). Esta carpeta junta
todo eso preservando la misma estructura relativa que tenía en `src/`, para
que al moverla a su propio proyecto Next.js baste con:

1. Renombrar `GW2/app` → `src/app`, `GW2/api` → `src/app/api`,
   `GW2/components` → `src/components`, `GW2/lib` → `src/lib`,
   `GW2/content` → `src/content`, `GW2/scripts` → `scripts`.
2. Configurar el alias `@/*` → `./src/*` en `tsconfig.json` (igual que en el
   CRM) — todos los imports internos (`@/lib/gw2/...`, `@/components/gw2/...`,
   `@/content/gw2-...`) ya están escritos para resolver así.
3. Copiar `GW2/prisma/gw2-schema.prisma` a `prisma/schema.prisma` del proyecto
   nuevo. Ojo: define de nuevo el enum `ScrapeRunStatus` (queda comentado al
   inicio del archivo) — en el CRM es compartido con un modelo no-GW2
   (`ScrapeRun`, scraper de propiedades), así que no vino incluido.
4. Las tablas `Gw2*` (+ `ExtractorSourceItem`, `SalvageRate`,
   `ExtractorOpportunity`) ya fueron **borradas** de `prisma/schema.prisma`
   del CRM. Si ese schema se vuelve a pushear/migrar antes de levantar la DB
   nueva, esas tablas se caen de la base de datos compartida.
5. `GW2/.github/workflows/gw2-item-sync.yml` corre `npm run sync:gw2-items`
   (ese script ya no existe en el `package.json` del CRM, fue quitado junto
   con `scan:gw2-market`, `sync:gw2-refinement` y `prewarm:gw2-events`) —
   hay que recrear esas 4 entradas en el `package.json` del proyecto nuevo.

## Dependencias compartidas que se quedaron en el CRM (no se copiaron)

Estos archivos siguen siendo usados por el resto del CRM (Trading, etc.), así
que el código de acá los sigue importando por su ruta original pero **no
existen dentro de esta carpeta** — hay que traer una copia propia al montar
el proyecto:

- `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/input`,
  `@/components/ui/select` — primitivas shadcn/ui genéricas.
- `@/lib/db` — cliente de Prisma.
- `@/lib/utils` — helpers genéricos (`cn`, etc).

`Gw2ThemeToggle` (toggle de tema oscuro/claro) SÍ se copió completo a
`GW2/components/gw2/gw2-theme-toggle.tsx` porque no tenía lógica de GW2 — en
el CRM se reemplazó su único uso externo (`src/app/trading/layout.tsx`) por
el `ThemeToggle` genérico que ya existía en `@/components/theme-toggle`.
