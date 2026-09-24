# Real Estate Lead Catcher — Chrome Extension

Monitorea grupos de Facebook que tú elijas y genera alertas cuando alguien publique algo que matchee tus keywords. Sin scraping, sin ban: corre sobre tu sesión activa de Facebook mientras tú navegas normalmente.

## Cómo funciona

- **MutationObserver** detecta posts nuevos en el DOM mientras scrolleas — no scrapea ni hace clicks
- **Reload programado con jitter** (cada 5-15 min, aleatorio por grupo) refresca cada tab cuando estás AFK
- **Keywords positivas y negativas** filtran ruido
- **Alertas** se acumulan con badge count en el ícono + lista en el popup
- **Posts matched se resaltan** con borde verde y un badge "🎯" en la página de Facebook
- **CRM integration**: con un click envías una alerta como `Cliente` nuevo a tu CRM personal

## Instalación

### 1. Genera una API key en tu CRM

1. Abre el CRM: `http://localhost:3000` (o tu URL de producción)
2. Login
3. Sidebar → **API Keys** → **Nueva API key**
4. Nómbrala "Extensión Chrome"
5. **Copia la key inmediatamente** (`rsk_xxx…`) — no se vuelve a mostrar

### 2. Carga la extensión en Chrome

1. Abre `chrome://extensions/`
2. Activa **Modo de desarrollador** (toggle arriba a la derecha)
3. Click **Cargar descomprimida**
4. Selecciona esta carpeta: `real-state/extension/`
5. La extensión aparece en tu barra. Pin recomendado.

### 3. Configura

Click en el ícono → ⚙️ (esquina superior derecha del popup) → se abre la página de opciones.

**Grupos monitoreados**
- Click **+ Agregar grupo**
- Ponle nombre descriptivo
- Pega la URL completa del grupo de Facebook (ej. `https://www.facebook.com/groups/123456789/`)
- Guarda

**Keywords positivas**
- Una por línea. Ejemplos:
  ```
  busco departamento
  compro casa
  presupuesto
  interlomas
  hipoteca
  infonavit
  ```

**Keywords negativas** (opcional pero recomendado)
- Filtran ruido. Ejemplos:
  ```
  rento
  vendo mi
  crypto
  multinivel
  ```

**Conexión al CRM**
- URL: `http://localhost:3000` (o tu URL de prod)
- API Key: pega la `rsk_...` que generaste
- Click **Probar conexión** — debería crear un cliente de prueba que puedes borrar

### 4. Pruébala

1. Abre uno de los grupos que configuraste en Facebook
2. Scrollea normalmente
3. Los posts que matcheen aparecerán con un borde verde + badge "🎯"
4. El ícono de la extensión muestra el contador de alertas no leídas
5. Click en el ícono → lista de alertas → click → te abre el post en Facebook

## Seguridad

- **Cero automation**: no scrolls, no clicks, no posts. Solo lee el DOM mientras tú navegas. Indistinguible de cualquier extensión tipo dark-theme o highlighter.
- **Reloads con jitter**: cada tab se recarga entre 5-15 min con tiempo aleatorio. Patrón natural.
- **Stagger entre tabs**: las recargas se distribuyen, no son simultáneas.

## Permisos solicitados

- `storage`: para guardar tus grupos, keywords y alertas localmente
- `tabs`: para detectar en qué tab de FB estás y recargar grupos programadamente
- `alarms`: para los reloads programados
- `https://*.facebook.com/*`: para inyectar el observer en grupos
- `http://localhost:3000/*`: para enviar leads a tu CRM (cambiable según despliegue)

## Próximas fases

- **Fase 2**: Panel flotante en la página de Facebook + templates de respuesta por bloques (3,600 combinaciones)
- **Fase 3**: Botón "+ Lead a mi CRM" directo en alertas (ya hay endpoint listo)
- **Fase 4**: Monitoreo de comentarios cuando abres un post + author intelligence + cross-group detection
- **Fase 5**: Polish (pausas nocturnas, estadísticas, filtros)

## Debug

- `chrome://extensions/` → busca la extensión → **service worker** → abre consola para ver logs del background
- En cualquier tab de FB → DevTools → consola → busca `[RS Lead Catcher]` para ver logs del content script
- Storage: en DevTools del popup u options → Application tab → Storage → Extension storage
