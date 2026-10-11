// Checklists de revisión antes de comprar, por producto. Contenido de
// referencia (no vive en la DB): si algo cambia con una versión nueva de iOS o
// un servicio sube precios, se edita aquí. Investigado en octubre 2026.

export type AuthProduct = 'IPHONE' | 'IPAD' | 'MACBOOK' | 'AUDIFONOS'

export type CheckItem = {
  id: string
  label: string
  /** Cómo revisarlo / qué buscar. */
  how?: string
  /** Si falla, no se compra (o solo con descuento muy fuerte). */
  stop?: boolean
}

export type CheckPhase = { id: string; title: string; hint: string; items: CheckItem[] }

export type CheckService = {
  name: string
  url: string
  cost: string
  input: 'IMEI' | 'Serie' | 'IMEI o serie'
  what: string
}

export const AUTH_PRODUCTS: { id: AuthProduct; label: string }[] = [
  { id: 'IPHONE', label: 'iPhone' },
  { id: 'IPAD', label: 'iPad' },
  { id: 'MACBOOK', label: 'MacBook' },
  { id: 'AUDIFONOS', label: 'Audífonos' },
]

// ─── Servicios de consulta ───────────────────────────────────────────────────

const CRT: CheckService = {
  name: 'CRT · Consulta IMEI',
  url: 'https://portal.crt.gob.mx/consultar-imei',
  cost: 'Gratis',
  input: 'IMEI',
  what: 'Reportado como robado o extraviado en México (sustituye a la consulta del IFT). Solo desde México y 2 consultas al día.',
}
const APPLE_COVERAGE: CheckService = {
  name: 'Apple · Cobertura',
  url: 'https://checkcoverage.apple.com/?locale=es_MX',
  cost: 'Gratis',
  input: 'Serie',
  what: 'Confirma que la serie existe y a qué modelo/color corresponde, si la fecha de compra está validada y si tiene AppleCare.',
}
const SICKW_BASIC: CheckService = {
  name: 'SICKW · Carrier & FMI & Blacklist',
  url: 'https://sickw.com/?page=services',
  cost: '~US$0.10',
  input: 'IMEI o serie',
  what: 'Operador y bloqueo de SIM, Buscar (FMI) on/off y lista negra GSMA. El primer filtro, barato.',
}
const SICKW_LOST: CheckService = {
  name: 'SICKW · iCloud Clean/Lost',
  url: 'https://sickw.com/?page=services',
  cost: '~US$0.22',
  input: 'IMEI o serie',
  what: 'Si el dueño lo marcó como perdido en iCloud. FMI ON es normal antes de borrar; "Lost" no.',
}
const SICKW_MDM: CheckService = {
  name: 'SICKW · Carrier + MDM & iCloud & GSX',
  url: 'https://sickw.com/?page=services',
  cost: '~US$0.40',
  input: 'IMEI o serie',
  what: 'Todo lo anterior más si está inscrito a MDM de una empresa o escuela (no se puede quitar).',
}
const SICKW_REPLACEMENTS: CheckService = {
  name: 'SICKW · Replacements History',
  url: 'https://sickw.com/?page=services',
  cost: '~US$0.70',
  input: 'IMEI o serie',
  what: 'Si Apple lo cambió por garantía (equipo de reemplazo).',
}
const SICKW_GSX: CheckService = {
  name: 'SICKW · GSX Premium',
  url: 'https://sickw.com/?page=services',
  cost: '~US$1.80',
  input: 'IMEI o serie',
  what: 'Reporte completo de Apple: país y tienda de venta, fecha de compra, reparaciones, garantía. Para los equipos caros o cuando algo no cuadra.',
}
const SICKW_MAC: CheckService = {
  name: 'SICKW · MacBook iCloud On/Off',
  url: 'https://sickw.com/?page=services',
  cost: '~US$0.20',
  input: 'Serie',
  what: 'Bloqueo de activación de la Mac. Combínalo con "Apple MDM Status" (~US$0.30).',
}

export const SERVICES_NOTE =
  'SICKW cobra por crédito prepagado (recargas desde ~US$5; con recargas de US$100+ baja ~20%). ' +
  'Precios de octubre 2026. Para un iPhone basta CRT + Carrier & FMI & Blacklist + Clean/Lost: unos US$0.32 (~$6 MXN). ' +
  'imei.info e imeicheck.com sirven de respaldo con checks básicos gratis.'

// ─── Anti-bypass de iCloud ───────────────────────────────────────────────────
// Hay herramientas que hacen arrancar un equipo robado con Bloqueo de
// activación (checkm8 en A11 y anteriores; iRemoval y similares en A12–A18).
// Solo funcionan en ciertas versiones de iOS, suelen dejarlo sin señal y sin
// iCloud, y se caen al actualizar, restaurar o (algunas) al reiniciar.

const antiBypass = (device: string): CheckItem[] => [
  { id: 'update', label: `Lo primero: ¿${device} tiene la última versión? Si no, inicia la actualización`, how: 'Ajustes › General › Actualización de software. Comparte internet desde tu teléfono (2 h de datos Telcel ~$15) y prueba lo demás mientras descarga. Un bypass solo funciona en versiones específicas; al actualizar regresa el Bloqueo de activación. Si no deja actualizar o la opción no aparece, no se compra.', stop: true },
  { id: 'reboot', label: 'Reinícialo 2 o 3 veces: enciende normal y con señal', how: 'Los bypass "tethered" se caen al reiniciar y regresa la pantalla de activación.', stop: true },
  { id: 'own-id', label: 'Inicia sesión con TU Apple ID en Ajustes', how: 'Un equipo con bypass no deja entrar a iCloud ni a App Store, o falla al activar Buscar. Cierras sesión antes del borrado.', stop: true },
]

// ─── Fases compartidas ───────────────────────────────────────────────────────

const closingIos = (device: string): CheckPhase => ({
  id: 'cierre',
  title: 'Cierre',
  hint: 'Hasta aquí se paga.',
  items: [
    { id: 'logout', label: 'El vendedor cierra sesión de su Apple ID frente a ti', how: `Ajustes › [su nombre] › Cerrar sesión. Pide su contraseña de Apple ID: eso apaga Buscar ${device}.`, stop: true },
    { id: 'erase', label: 'Borrar contenidos y ajustes, frente a ti', how: 'Ajustes › General › Transferir o restablecer › Borrar contenidos y ajustes.', stop: true },
    { id: 'activation', label: 'Al reiniciar llega a "Hola" y se activa sin pedir el Apple ID de nadie', how: 'Es la prueba definitiva contra bypass: el borrado reinstala la activación limpia. Si pide "Bloqueo de activación" o muestra "Gestión remota", no se compra.', stop: true },
    { id: 'box', label: 'Caja con el mismo IMEI/serie y cable', how: 'La caja debe coincidir con el equipo; suma para vender en P75.' },
    { id: 'id', label: 'Foto de INE del vendedor y compraventa simple', how: 'Nombre, teléfono, IMEI/serie, precio, fecha y firma. Si tiene factura o ticket, foto.' },
    { id: 'pay', label: 'Pagas al final, por transferencia', how: 'Así queda registro y no traes efectivo.' },
  ],
})

// ─── iPhone ──────────────────────────────────────────────────────────────────

const IPHONE: CheckPhase[] = [
  {
    id: 'previo',
    title: 'Antes de ir',
    hint: 'Por chat, con el IMEI y la serie. Filtra antes de gastar tiempo.',
    items: [
      { id: 'imei', label: 'Pide captura de Ajustes › General › Información', how: 'Ahí salen IMEI, número de serie, modelo y capacidad.' },
      { id: 'crt', label: 'CRT: no reportado como robado en México', how: 'portal.crt.gob.mx/consultar-imei', stop: true },
      { id: 'blacklist', label: 'Reporte pagado: lista negra limpia, sin bloqueo de operador, no "Lost"', how: 'SICKW Carrier & FMI & Blacklist + Clean/Lost. FMI ON todavía es normal; se apaga en el cierre. Pero FMI ON + "ya lo borré, no tiene cuenta" = posible bypass.', stop: true },
      { id: 'coverage', label: 'Serie en Apple Cobertura coincide con modelo y color', how: 'Si dice otro modelo o no existe, es carcasa cambiada o equipo armado.', stop: true },
      { id: 'model', label: 'Número de modelo: revisa la primera letra y la región', how: 'Ajustes › General › Información › toca "Modelo". M = nuevo de tienda · F = reacondicionado por Apple · N = reemplazo de garantía · P = grabado · 3 = demo. Sufijo: E/A México · LL/A EE. UU. (desde el iPhone 14 son solo eSIM, sin bandeja) · LZ/A Chile y Paraguay.' },
      { id: 'battery-pre', label: 'Captura de Salud de la batería y de Historial de piezas', how: 'Si no la quiere mandar, mala señal.' },
    ],
  },
  {
    id: 'identidad',
    title: 'En persona · identidad y bloqueos',
    hint: 'Lo primero al tenerlo en la mano: arranca la actualización y prueba lo demás mientras baja.',
    items: [
      ...antiBypass('el iPhone'),
      { id: 'imei-match', label: 'El IMEI coincide en *#06#, Ajustes, bandeja SIM y caja', stop: true },
      { id: 'sim', label: 'Tu SIM funciona: llamada y datos', how: 'Mete tu chip (o activa eSIM) y haz una llamada. "SIM no válida" = bloqueado por operador; "Sin servicio" con chip bueno = posible bypass (casi todos dejan el equipo sin señal).', stop: true },
      { id: 'rsim', label: 'Sin chip pegado en la bandeja', how: 'Un chip delgado bajo la SIM (R-SIM/Turbo SIM) = liberación falsa; se cae en cualquier actualización.', stop: true },
      { id: 'mdm', label: 'Sin perfiles de gestión', how: 'Ajustes › General › VPN y gestión de dispositivos: debe estar vacío (o solo VPN).', stop: true },
    ],
  },
  {
    id: 'bateria',
    title: 'Batería y piezas',
    hint: 'Lo que más mueve el precio de venta.',
    items: [
      { id: 'health', label: 'Salud de la batería ≥ 85%', how: 'Ajustes › Batería › Salud. Para vender en P75 apunta a ≥ 85%; < 80% sale "Servicio" y baja el precio.' },
      { id: 'cycles', label: 'iPhone 15 o más nuevo: ciclos, fecha de fabricación y primer uso', how: 'Ajustes › General › Información (o Batería › Salud). Salud 100% con 500+ ciclos no cuadra.' },
      { id: 'parts', label: 'Historial de piezas: sin "Pieza desconocida"', how: 'Ajustes › General › Información › Historial de piezas y servicio. "Desconocida" en pantalla, batería o cámara = pieza genérica: descuento fuerte o no. "Genuina" = reparado con pieza Apple: descuento leve. "Usada" = pieza sacada de otro iPhone.', stop: true },
      { id: 'truetone', label: 'True Tone aparece en Centro de control', how: 'Mantén presionado el brillo. Si no aparece, la pantalla fue cambiada.' },
    ],
  },
  {
    id: 'hardware',
    title: 'Hardware',
    hint: 'Prueba todo; 5 minutos.',
    items: [
      { id: 'screen', label: 'Pantalla: sin manchas, píxeles muertos, líneas ni quemado', how: 'Brillo al máximo con fondos blanco, negro y gris (busca "test de pantalla" en Safari). Rayones con la lámpara de lado.' },
      { id: 'touch', label: 'Táctil en toda la pantalla', how: 'Arrastra un ícono por todas las orillas y esquinas; no debe soltarse.' },
      { id: 'faceid', label: 'Face ID: registra tu cara', how: 'Ajustes › Face ID y código › Configurar apariencia alternativa. Si falla, es caro de arreglar.', stop: true },
      { id: 'cameras', label: 'Todas las cámaras: 0.5×, 1×, zoom, frontal, video y flash', how: 'Enfoca de cerca y de lejos; sin polvo, manchas ni zumbido o temblor (estabilizador dañado).' },
      { id: 'audio', label: 'Bocinas, auricular y micrófonos', how: 'Graba una nota de voz con cada cámara (usa micrófonos distintos) y haz una llamada en altavoz y normal.' },
      { id: 'buttons', label: 'Botones', how: 'Volumen, lateral, botón de Acción (15 Pro+), Control de Cámara (16), interruptor de silencio (15/15 Plus).' },
      { id: 'port', label: 'Carga por cable y MagSafe/inalámbrica', how: 'Puerto firme, sin falso contacto.' },
      { id: 'sensors', label: 'Proximidad, vibración, Wi-Fi, Bluetooth y GPS', how: 'En llamada la pantalla se apaga al acercar la cara; abre Mapas.' },
      { id: 'body', label: 'Marco y vidrio trasero', how: 'Sin golpes, curvatura (apóyalo en una mesa) ni vidrio estrellado. Tornillos de abajo sin marcas = no abierto.' },
      { id: 'lci', label: 'Indicador de humedad en la ranura SIM: blanco o plateado', how: 'Rojo = se mojó. (Los de EE. UU. sin bandeja no tienen dónde ver.)' },
    ],
  },
  closingIos('mi iPhone'),
]

// ─── iPad ────────────────────────────────────────────────────────────────────

const IPAD: CheckPhase[] = [
  {
    id: 'previo',
    title: 'Antes de ir',
    hint: 'Por chat. Los Wi-Fi no tienen IMEI: usa la serie.',
    items: [
      { id: 'serial', label: 'Pide captura de Ajustes › General › Información', how: 'Serie, modelo, capacidad, e IMEI si es Cellular.' },
      { id: 'crt', label: 'Si es Cellular: CRT no reportado', how: 'portal.crt.gob.mx/consultar-imei', stop: true },
      { id: 'mdm-pre', label: 'Reporte pagado con MDM', how: 'SICKW Carrier + MDM & iCloud (~US$0.40). Los iPads de escuelas y empresas vienen inscritos y no se pueden liberar.', stop: true },
      { id: 'coverage', label: 'Serie en Apple Cobertura coincide con modelo y color', stop: true },
      { id: 'model', label: 'Primera letra del modelo', how: 'M nuevo · F reacondicionado Apple · N reemplazo · 3 demo (los de exhibición tienen mucho uso de pantalla).' },
    ],
  },
  {
    id: 'identidad',
    title: 'En persona · identidad y bloqueos',
    hint: 'Lo primero al tenerlo en la mano: arranca la actualización y prueba lo demás mientras baja.',
    items: [
      ...antiBypass('el iPad'),
      { id: 'serial-match', label: 'Serie/IMEI coincide en Ajustes, caja y parte de atrás', stop: true },
      { id: 'mdm', label: 'Sin perfiles de gestión', how: 'Ajustes › General › VPN y gestión de dispositivos: vacío. "Supervisado" debajo del nombre en Ajustes = de una organización.', stop: true },
      { id: 'sim', label: 'Si es Cellular: tu SIM da datos', stop: true },
    ],
  },
  {
    id: 'bateria',
    title: 'Batería',
    hint: 'iPadOS no siempre lo muestra.',
    items: [
      { id: 'health', label: 'Salud y ciclos', how: 'Los iPad recientes lo muestran en Ajustes › Batería. En los demás: conéctalo a una Mac con coconutBattery, o pide captura del vendedor.' },
      { id: 'drain', label: 'No baja rápido con el brillo al máximo', how: 'Mira el % al llegar y al irte.' },
    ],
  },
  {
    id: 'hardware',
    title: 'Hardware',
    hint: 'La pantalla es lo caro.',
    items: [
      { id: 'screen', label: 'Pantalla: sin manchas de presión, píxeles ni sangrado de luz', how: 'Fondo blanco y gris a brillo máximo; en negro, revisa orillas en un cuarto oscuro.' },
      { id: 'touch', label: 'Táctil en toda la pantalla', how: 'Arrastra un ícono por todas las orillas.' },
      { id: 'bend', label: 'No está doblado', how: 'Apóyalo en una mesa y míralo de lado. Los Pro delgados se doblan en mochila.', stop: true },
      { id: 'biometric', label: 'Touch ID o Face ID: registra tu huella o cara', stop: true },
      { id: 'pencil', label: 'Apple Pencil: empareja, carga y escribe en toda la pantalla', how: 'Lleva un Pencil compatible. Si es Pro M4 o más nuevo, prueba hover.' },
      { id: 'keyboard', label: 'Smart Connector', how: 'Si lo vende con teclado, prueba teclas y trackpad.' },
      { id: 'audio', label: 'Las 2 o 4 bocinas, micrófonos y cámaras' },
      { id: 'buttons', label: 'Botones, puerto USB-C/Lightning y Wi-Fi/Bluetooth' },
      { id: 'body', label: 'Chasis sin golpes en esquinas', how: 'Golpe en esquina suele venir con daño de pantalla.' },
    ],
  },
  closingIos('mi iPad'),
]

// ─── MacBook ─────────────────────────────────────────────────────────────────

const MACBOOK: CheckPhase[] = [
  {
    id: 'previo',
    title: 'Antes de ir',
    hint: 'Por chat, con la serie.',
    items: [
      { id: 'serial', label: 'Pide captura de menú Apple › Acerca de esta Mac', how: 'Chip, RAM, almacenamiento, serie y versión de macOS.' },
      { id: 'coverage', label: 'Serie en Apple Cobertura coincide con modelo y año', stop: true },
      { id: 'icloud-mdm', label: 'Reporte pagado: iCloud y MDM', how: 'SICKW MacBook iCloud On/Off (~US$0.20) + Apple MDM Status (~US$0.30). Las Mac de empresa inscritas en DEP no se liberan.', stop: true },
      { id: 'cycles-pre', label: 'Captura de ciclos de batería', how: 'Información del sistema › Energía.' },
    ],
  },
  {
    id: 'identidad',
    title: 'En persona · identidad y bloqueos',
    hint: 'Antes de probar hardware.',
    items: [
      { id: 'serial-match', label: 'Serie coincide en Acerca de esta Mac, base y caja', stop: true },
      { id: 'activation', label: 'Bloqueo de activación: Desactivado', how: 'Mantén Opción › menú Apple › Información del sistema › Hardware: "Estado del bloqueo de activación".', stop: true },
      { id: 'mdm', label: 'Sin MDM ni DEP', how: 'Terminal: profiles status -type enrollment → "No" en las dos líneas. Y Ajustes › General › Gestión de dispositivos vacío.', stop: true },
      { id: 'specs', label: 'Chip, RAM y SSD son los anunciados' },
      { id: 'firmware', label: 'Intel: sin contraseña de firmware', how: 'Al arrancar en recuperación no debe pedir candado.' },
    ],
  },
  {
    id: 'bateria',
    title: 'Batería',
    hint: 'En MacBook la batería es cara.',
    items: [
      { id: 'cycles', label: 'Ciclos y condición "Normal"', how: 'Información del sistema › Energía. Apple Silicon aguanta ~1,000 ciclos; < 300 es buen estado.' },
      { id: 'health', label: 'Capacidad máxima ≥ 85%', how: 'Ajustes del Sistema › Batería › (i) junto a Salud.' },
      { id: 'swollen', label: 'Batería no inflada', how: 'Trackpad que no hace clic o está levantado, o base abombada = inflada.', stop: true },
    ],
  },
  {
    id: 'hardware',
    title: 'Hardware',
    hint: '10 minutos.',
    items: [
      { id: 'diag', label: 'Apple Diagnostics sin errores', how: 'Apple Silicon: apágala, mantén el botón de encendido hasta "Opciones", luego ⌘D. Intel: reinicia manteniendo D. "ADP000" = sin problemas.' },
      { id: 'screen', label: 'Pantalla: sin manchas, píxeles ni capa antirreflejo pelada', how: 'Fondos blanco, negro y gris. Revisa orillas.' },
      { id: 'hinge', label: 'Bisagra firme y pantalla sin parpadeo al abrir y cerrar' },
      { id: 'keyboard', label: 'Todas las teclas y Touch ID', how: 'Usa un keyboard tester web; registra tu huella.' },
      { id: 'trackpad', label: 'Trackpad: clic en toda la superficie y Force Touch' },
      { id: 'ports', label: 'Cada puerto carga y transfiere', how: 'Cada USB-C, MagSafe, HDMI y SD (Pro), jack.' },
      { id: 'av', label: 'Bocinas, micrófono y cámara FaceTime' },
      { id: 'wireless', label: 'Wi-Fi y Bluetooth' },
      { id: 'body', label: 'Chasis sin golpes y tornillos sin marcas', how: 'Teclas pegajosas o residuo en puertos = líquido.' },
    ],
  },
  {
    id: 'cierre',
    title: 'Cierre',
    hint: 'Hasta aquí se paga.',
    items: [
      { id: 'logout', label: 'El vendedor cierra sesión de iCloud (apaga Buscar mi Mac)', stop: true },
      { id: 'erase', label: 'Borrar contenidos y ajustes, frente a ti', how: 'Ajustes del Sistema › General › Transferir o restablecer.', stop: true },
      { id: 'setup', label: 'Arranca al asistente sin "Gestión remota" ni Apple ID ajeno', stop: true },
      { id: 'charger', label: 'Cargador original', how: 'Cargador genérico baja precio.' },
      { id: 'id', label: 'Foto de INE del vendedor y compraventa simple' },
      { id: 'pay', label: 'Pagas al final, por transferencia' },
    ],
  },
]

// ─── Audífonos (AirPods) ─────────────────────────────────────────────────────

const AUDIFONOS: CheckPhase[] = [
  {
    id: 'previo',
    title: 'Antes de ir',
    hint: 'La serie sola no prueba nada: las clonan de cajas reales.',
    items: [
      { id: 'serial', label: 'Pide la serie (estuche, tapa interior)', how: 'Revísala en Apple Cobertura: descarta números inventados, no clones.' },
      { id: 'model', label: 'Modelo exacto', how: 'Pro 2 Lightning vs USB-C, Pro 3, AirPods 4 con o sin cancelación. Cambia mucho el precio.' },
    ],
  },
  {
    id: 'identidad',
    title: 'En persona · autenticidad',
    hint: 'Aquí se cachan los clones.',
    items: [
      { id: 'pair', label: 'Animación nativa de Apple al abrir junto a tu iPhone', how: 'Muestra batería de cada AirPod y estuche.' },
      { id: 'serials', label: 'Seriales distintos en estuche, izquierdo y derecho', how: 'Ajustes › [AirPods] › toca el número de serie para cambiar entre cada uno. Iguales = clon.', stop: true },
      { id: 'firmware', label: 'Firmware actual', how: 'Ajustes › [AirPods] › Información › Versión. Compara con "Actualizaciones de firmware de AirPods" de Apple. Los clones se quedan en versiones viejas o raras.', stop: true },
      { id: 'findmy', label: 'Aparecen en la app Encontrar y suenan', how: 'Pro 2+: el estuche también suena.' },
      { id: 'unlinked', label: 'El vendedor los quitó de su cuenta', how: 'En su app Encontrar › Eliminar este dispositivo. Si no, a tu iPhone le sale "vinculados a otro Apple ID".', stop: true },
    ],
  },
  {
    id: 'funcion',
    title: 'Funciones',
    hint: '5 minutos con tu iPhone.',
    items: [
      { id: 'anc', label: 'Cancelación de ruido, Transparencia y Adaptativo', how: 'Cambia entre modos con el tallo; la diferencia debe ser clara.' },
      { id: 'ear', label: 'Sensor de oído: pausa al quitarlos' },
      { id: 'controls', label: 'Controles del tallo y Prueba de ajuste de puntas' },
      { id: 'sound', label: 'Los dos suenan igual, sin crujidos', how: 'Ajustes › Accesibilidad › Audio › Balance para probar cada lado.' },
      { id: 'mics', label: 'Micrófonos: graba nota de voz o llamada' },
      { id: 'battery', label: 'Batería pareja', how: 'No hay % de salud. Que los dos estén al 100% y no baje uno mucho más rápido en 15 minutos.' },
      { id: 'case', label: 'Estuche carga por cable y MagSafe/Qi; bisagra e imán firmes' },
      { id: 'hygiene', label: 'Mallas limpias, sin cera', how: 'Puntas de repuesto son baratas; mallas tapadas bajan volumen.' },
    ],
  },
  {
    id: 'cierre',
    title: 'Cierre',
    hint: 'Hasta aquí se paga.',
    items: [
      { id: 'reset', label: 'Restablecer: botón del estuche 15 s hasta luz ámbar y luego blanca', stop: true },
      { id: 'box', label: 'Caja con la misma serie y cable' },
      { id: 'pay', label: 'Pagas al final, por transferencia' },
    ],
  },
]

export const CHECKLISTS: Record<AuthProduct, CheckPhase[]> = { IPHONE, IPAD, MACBOOK, AUDIFONOS }

export const SERVICES: Record<AuthProduct, CheckService[]> = {
  IPHONE: [CRT, SICKW_BASIC, SICKW_LOST, APPLE_COVERAGE, SICKW_MDM, SICKW_REPLACEMENTS, SICKW_GSX],
  IPAD: [CRT, SICKW_MDM, APPLE_COVERAGE, SICKW_LOST, SICKW_GSX],
  MACBOOK: [APPLE_COVERAGE, SICKW_MAC, SICKW_GSX],
  AUDIFONOS: [APPLE_COVERAGE],
}
