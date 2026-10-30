// Checklists de revisión antes de comprar, por producto. Contenido de
// referencia (no vive en la DB): si algo cambia con una versión nueva de iOS o
// un servicio sube precios, se edita aquí. Investigado en octubre 2026.
//
// Criterio: muchos tratos, poco riesgo real. Si un vendedor miente por chat lo
// peor es perder el viaje (solo se entrega en plaza de Polanco y se paga al
// final), así que el chat filtra lo mínimo y el rigor va en persona: que no
// haya bypass, que no haya cambiazo y que el dinero sea real.

export type AuthProduct = 'IPHONE' | 'IPAD' | 'MACBOOK' | 'AUDIFONOS' | 'BOLSOS'
export type AuthMode = 'COMPRA' | 'VENTA'

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
  input: 'IMEI' | 'Serie' | 'IMEI o serie' | 'El bolso' | 'Certificado'
  what: string
}

export const AUTH_PRODUCTS: { id: AuthProduct; label: string }[] = [
  { id: 'IPHONE', label: 'iPhone' },
  { id: 'IPAD', label: 'iPad' },
  { id: 'MACBOOK', label: 'MacBook' },
  { id: 'AUDIFONOS', label: 'Audífonos' },
  { id: 'BOLSOS', label: 'Bolsos' },
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
]

// Contra el cambiazo: el IMEI/serie se vuelve a checar justo antes de cada
// paso que ya no tiene regreso (activar con tu cuenta, transferir).
const PAY_BUY: CheckItem = { id: 'pay', label: 'Pagas al final, por transferencia, y le enseñas tu app', how: 'Justo después de la última revisión del IMEI. Por transferencia queda registro y no traes efectivo.' }
const NO_SWAP_BUY = (where: string): CheckItem => ({
  id: 'no-swap',
  label: 'Última revisión del IMEI antes de cada paso clave',
  how: `Cuando te lo regresa después de cerrar sesión y borrar, y otra vez justo antes de transferir: ${where}. El cambiazo pasa en esos momentos ("deja te lo limpio", "te doy la caja"): te dan uno igual pero bloqueado o roto.`,
  stop: true,
})

// ─── Fases compartidas ───────────────────────────────────────────────────────

const closingIos = (device: string): CheckPhase => ({
  id: 'cierre',
  title: 'Cierre',
  hint: 'Hasta aquí se paga.',
  items: [
    { id: 'logout', label: 'El vendedor cierra sesión de su Apple ID frente a ti', how: `Ajustes › [su nombre] › Cerrar sesión. Pide su contraseña de Apple ID: eso apaga Buscar ${device}.`, stop: true },
    { id: 'erase', label: 'Borrar contenidos y ajustes, frente a ti', how: 'Ajustes › General › Transferir o restablecer › Borrar contenidos y ajustes.', stop: true },
    NO_SWAP_BUY('que el IMEI (en "Hola" toca ⓘ) sea el que anotaste'),
    { id: 'activation', label: 'Al reiniciar llega a "Hola" y se activa sin pedir el Apple ID de nadie', how: 'El borrado reinstala la activación limpia. Si pide "Bloqueo de activación" o muestra "Gestión remota", no se compra.', stop: true },
    { id: 'own-id', label: 'Último paso: lo configuras con TU Apple ID y prendes Buscar', how: `Prueba final contra bypass: un equipo con bypass no deja entrar a iCloud ni activar Buscar ${device}. Desde aquí queda bloqueado a tu nombre hasta que lo vendas.`, stop: true },
    { id: 'box', label: 'Caja con el mismo IMEI/serie y cable', how: 'La caja debe coincidir con el equipo; suma para vender en P75.' },
    { id: 'id', label: 'Foto de INE del vendedor y compraventa simple', how: 'Nombre, teléfono, IMEI/serie, precio, fecha y firma. Si tiene factura o ticket, foto.' },
    PAY_BUY,
  ],
})

// ─── Por chat (compra) ───────────────────────────────────────────────────────
// Lo mínimo para no perder el viaje. Los mensajes listos están en mensajes.ts.

const PLACE_ITEM: CheckItem = {
  id: 'place',
  label: 'Entrega en plaza comercial de Polanco',
  how: 'Antara, Plaza Carso o Miyana: seguridad, cámaras y gente. Va junto con la oferta, como lo que te queda ("me queda en Antara hoy a las 6"), no como condición en el primer mensaje. Si le queda lejos, ofrécele para el Uber; si aun así no, no hay trato (ni en la calle, ni en su casa, ni en metro).',
  stop: true,
}

// ─── iPhone ──────────────────────────────────────────────────────────────────

const IPHONE: CheckPhase[] = [
  {
    id: 'chat',
    title: 'Por chat',
    hint: 'Lo mínimo. Si mintió, lo cachas en persona y solo pierdes el viaje.',
    items: [
      PLACE_ITEM,
      { id: 'imei', label: 'Ya con lugar y hora: captura de Ajustes › General › Información', how: 'IMEI, modelo y capacidad. Pídela después de quedar (mensaje "Ya quedamos"); si a esas alturas no la manda, no vayas. Pega el IMEI arriba: en persona lo comparas.' },
      { id: 'crt', label: 'CRT: no reportado como robado en México', how: 'Gratis, 30 segundos: portal.crt.gob.mx/consultar-imei.', stop: true },
      { id: 'model', label: 'Número de modelo: primera letra y región', how: 'En la misma captura, toca "Modelo". M = nuevo de tienda · F = reacondicionado por Apple · N = reemplazo de garantía · P = grabado · 3 = demo. Sufijo: E/A México · LL/A EE. UU. (desde el iPhone 14 son solo eSIM, sin bandeja) · LZ/A Chile y Paraguay.' },
      { id: 'report', label: 'Opcional: reporte SICKW (~$6) si es caro o algo no cuadra', how: 'Carrier & FMI & Blacklist + Clean/Lost. Úsalo si dice "ya lo borré, no tiene cuenta", si el modelo no coincide o si el trato pasa de ~$15,000.' },
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
    id: 'chat',
    title: 'Por chat',
    hint: 'Lo mínimo. Los Wi-Fi no tienen IMEI: usa la serie.',
    items: [
      PLACE_ITEM,
      { id: 'serial', label: 'Ya con lugar y hora: captura de Ajustes › General › Información', how: 'Serie, modelo, capacidad, e IMEI si es Cellular.' },
      { id: 'crt', label: 'Si es Cellular: CRT no reportado', how: 'portal.crt.gob.mx/consultar-imei', stop: true },
      { id: 'model', label: 'Primera letra del modelo', how: 'M nuevo · F reacondicionado Apple · N reemplazo · 3 demo (los de exhibición tienen mucho uso de pantalla).' },
      { id: 'report', label: 'Opcional: reporte SICKW con MDM (~$8) si suena a escuela o empresa', how: 'Carrier + MDM & iCloud. En persona igual sale: perfiles de gestión y, al borrar, "Gestión remota".' },
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
    id: 'chat',
    title: 'Por chat',
    hint: 'Lo mínimo; MDM y bloqueo se ven en persona.',
    items: [
      PLACE_ITEM,
      { id: 'serial', label: 'Ya con lugar y hora: captura de menú Apple › Acerca de esta Mac', how: 'Chip, RAM, almacenamiento, serie y versión de macOS. Que sea la configuración anunciada.' },
      { id: 'coverage', label: 'Serie en Apple Cobertura coincide con modelo y año', how: 'Gratis. Si no existe o es otro modelo, no vayas.', stop: true },
      { id: 'report', label: 'Opcional: reporte SICKW iCloud + MDM (~$9) si suena a Mac de empresa', how: 'MacBook iCloud On/Off + Apple MDM Status. En persona igual sale con profiles status y al borrar.' },
    ],
  },
  {
    id: 'identidad',
    title: 'En persona · identidad y bloqueos',
    hint: 'Lo primero: arranca la actualización y prueba lo demás mientras baja.',
    items: [
      { id: 'update', label: 'Lo primero: ¿macOS está en la última versión? Si no, inicia la actualización', how: 'Ajustes del Sistema › General › Actualización de software (comparte internet desde tu teléfono). Las Mac Intel con chip T2 se pueden saltar el bloqueo con checkm8, pero no es permanente: al actualizar, reinstalar o reiniciar regresa. Si no deja actualizar, no se compra.', stop: true },
      { id: 'reboot', label: 'Reiníciala 2 o 3 veces: arranca normal a macOS', stop: true },
      { id: 'serial-match', label: 'Serie coincide en Acerca de esta Mac, base y caja', stop: true },
      { id: 'activation', label: 'Bloqueo de activación: Desactivado', how: 'Terminal: system_profiler SPHardwareDataType | grep -i activation → debe decir "Disabled". "Enabled" = sigue con Encontrar de alguien: que cierre sesión de iCloud ahí y vuelve a correrlo. (También: mantén Opción › menú Apple › Información del sistema › Hardware.) Lo tienen las Mac con Apple Silicon (M1 en adelante) y las Intel con chip T2 (2018–2020). Las Intel más viejas no, pero si las bloquearon desde iCloud piden un PIN al arrancar.', stop: true },
      { id: 'mdm', label: 'Sin MDM ni DEP', how: 'Terminal: sudo profiles status -type enrollment → "Enrolled via DEP: No" y "MDM enrollment: No". Luego sudo profiles show -type enrollment → debe decir "Client is not DEP enabled"; si muestra datos de una organización, no se compra. Y Ajustes › General › Gestión de dispositivos vacío. (sudo pide la contraseña de la Mac: que la escriba el vendedor.)', stop: true },
      { id: 'bypass', label: 'Sin rastros de bypass de MDM', how: 'Terminal: cat /etc/hosts → solo localhost y broadcasthost; si aparece deviceenrollment.apple.com, mdmenrollment.apple.com o iprofiles.apple.com, la bloquearon para esconder el MDM: no se compra. Luego ls -la /var/db/ConfigurationProfiles/Settings/ → .cloudConfigNoActivationRecord es normal; .cloudConfigProfileInstalled o .cloudConfigRecordNotFound = bypass: no se compra. Al borrarla saldría "Gestión remota".', stop: true },
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
      { id: 'setup', label: 'Arranca al asistente sin "Gestión remota" ni Apple ID ajeno', how: 'El borrado vuelve a pedir activación a Apple, y ahí sale cualquier bloqueo o MDM que se hayan saltado.', stop: true },
      { id: 'own-id', label: 'Último paso: la configuras con TU Apple ID y prendes Buscar mi Mac', how: 'Ajustes del Sistema › [tu nombre] › iCloud › Buscar mi Mac. Si no deja, algo está bloqueado. Desde aquí queda a tu nombre hasta que la vendas.', stop: true },
      NO_SWAP_BUY('que la serie (caja o base, y Acerca de esta Mac ya configurada) sea la que anotaste'),
      { id: 'charger', label: 'Cargador original', how: 'Cargador genérico baja precio.' },
      { id: 'id', label: 'Foto de INE del vendedor y compraventa simple' },
      PAY_BUY,
    ],
  },
]

// ─── Audífonos (AirPods) ─────────────────────────────────────────────────────

const AUDIFONOS: CheckPhase[] = [
  {
    id: 'chat',
    title: 'Por chat',
    hint: 'La serie sola no prueba nada: las clonan de cajas reales.',
    items: [
      PLACE_ITEM,
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
      { id: 'unlinked', label: 'El vendedor los quitó de su cuenta (Bloqueo de emparejamiento)', how: 'Es el bloqueo de iCloud de los AirPods (Pro, Max, 3.ª gen. y 4): en su app Encontrar › Eliminar este dispositivo. Restablecerlos NO lo quita y Apple tampoco puede. Si no lo hace, a tu iPhone le sale "vinculados a otro Apple ID".', stop: true },
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
      { id: 'own-findmy', label: 'Último paso: se emparejan con tu iPhone y aparecen en TU app Encontrar', how: 'Prueba final de que ya no están ligados al vendedor.', stop: true },
      NO_SWAP_BUY('que los seriales en tu iPhone sean los que anotaste'),
      { id: 'box', label: 'Caja con la misma serie y cable' },
      PAY_BUY,
    ],
  },
]

// ─── Bolsos (Entrupy) ────────────────────────────────────────────────────────
// La revisión a mano filtra lo obvio antes de gastar tokens; Entrupy decide.
// Si la marca o el modelo no está en Entrupy, no se puede certificar → no se
// compra para revender en P75.

const ENTRUPY_APP: CheckService = {
  name: 'Entrupy · escaneo',
  url: 'https://www.entrupy.com/bags-leather-goods-authentication/',
  cost: '2–20 tokens',
  input: 'El bolso',
  what: 'Fotos microscópicas con la app; resultado "Authentic" (con certificado y garantía financiera de 1 año) o "Unidentified". 3–5 min de escaneo; la mayoría responde en minutos, Ultra Prestige hasta 24 h.',
}
const ENTRUPY_SEARCH: CheckService = {
  name: 'Entrupy · buscar certificado',
  url: 'https://www.entrupy.com/search-certificate/',
  cost: 'Gratis',
  input: 'Certificado',
  what: 'Si el vendedor dice que ya está autenticado: confirma que el certificado existe y es de ese bolso (fotos y modelo).',
}

const BOLSOS: CheckPhase[] = [
  {
    id: 'chat',
    title: 'Por chat',
    hint: 'La mayoría de las réplicas se caen aquí: avísale que la escaneas con Entrupy.',
    items: [
      PLACE_ITEM,
      { id: 'entrupy-list', label: 'La marca y el material están en Entrupy', how: 'Ver la tabla de abajo. Michael Kors, Kate Spade, Tory Burch, Longchamp y Guess no los autentica: no se compran. Exóticos (cocodrilo, avestruz) en Hermès no.', stop: true },
      { id: 'price', label: 'El precio no está abajo del piso de la marca', how: 'El CRM marca "precio muy bajo para la marca". Una LV Neverfull a $3,000 no existe.', stop: true },
      { id: 'photos', label: 'Fotos reales, no de catálogo', how: 'Pide: logo/estampado interior, código de fecha o etiqueta de serie, herrajes y cierre de cerca, costuras de las asas, base y esquinas.' },
      { id: 'seller', label: 'Perfil del vendedor', how: 'Perfil nuevo vendiendo muchas bolsas "originales" distintas o el mismo modelo en varios colores = revendedor de réplicas.' },
      { id: 'cert-prev', label: 'Si dice que ya está autenticada: busca el certificado', how: 'Entrupy › buscar certificado. Recibos de tienda también se falsifican; el certificado se verifica.' },
    ],
  },
  {
    id: 'revision',
    title: 'En persona · revisión rápida',
    hint: 'Antes de gastar tokens. Si algo de aquí falla, ni la escaneas.',
    items: [
      { id: 'smell', label: 'Olor a piel, no a químico o plástico' },
      { id: 'stitching', label: 'Costuras parejas, rectas y del mismo largo', how: 'Sin hilos sueltos ni puntadas chuecas, sobre todo en asas y esquinas. Hilo con el mismo tono en todo el bolso.' },
      { id: 'hardware', label: 'Herrajes pesados, grabado nítido, sin pintura que se pele', how: 'Cierres que corren suave; jaladeras grabadas. Herraje ligero o dorado "amarillo chillón" = mala señal.' },
      { id: 'pattern', label: 'Logo y patrón simétricos y bien alineados', how: 'Monogramas centrados, sin logos cortados en lugares visibles; tipografía del logo limpia.' },
      { id: 'stamp', label: 'Estampado interior limpio y con profundidad pareja', how: 'Letras bien espaciadas, sin manchas de tinta.' },
      { id: 'code', label: 'Código de fecha, serie o chip', how: 'LV: código de fecha hasta 2021, después chip NFC (no hay código visible). Chanel: holograma con serie hasta 2021, después microchip. Gucci: etiqueta de piel con serie. Hermès: blind stamp con la letra del año. Que coincida con el modelo y la época.' },
      { id: 'accessories', label: 'Accesorios coinciden', how: 'Candado y llaves con el mismo número, correa original, dust bag y caja de la marca correcta.' },
    ],
  },
  {
    id: 'estado',
    title: 'Estado',
    hint: 'Define si vende en P75 o abajo.',
    items: [
      { id: 'corners', label: 'Esquinas y base sin desgaste ni piel pelada' },
      { id: 'handles', label: 'Asas: pátina pareja, sin grietas ni manchas de agua', how: 'En LV la vachetta oscura es normal; manchas de agua y grietas bajan el precio.' },
      { id: 'interior', label: 'Interior limpio: sin manchas de pluma o maquillaje, forro sin despegar' },
      { id: 'shape', label: 'Conserva la forma (no está aplastada ni deformada)' },
      { id: 'odor', label: 'Sin olor a humedad, humo o perfume fuerte' },
    ],
  },
  {
    id: 'entrupy',
    title: 'Entrupy',
    hint: 'Escanea antes de pagar.',
    items: [
      { id: 'scan', label: 'Escanea con Entrupy frente al vendedor', how: 'Con buena luz y Wi-Fi o datos. Sigue las tomas que pide la app.', stop: true },
      { id: 'result', label: 'Resultado "Authentic"', how: '"Unidentified" = no se compra (no significa falsa al 100%, pero no la puedes certificar ni vender en P75).', stop: true },
      { id: 'cert', label: 'Guarda el número de certificado', how: 'Va en el anuncio de venta y en Mis trades. La garantía financiera pide comprobante de compra: guarda la compraventa.' },
    ],
  },
  {
    id: 'cierre',
    title: 'Cierre',
    hint: 'Hasta aquí se paga.',
    items: [
      NO_SWAP_BUY('que el bolso sea el que escaneaste: código, herrajes y marcas de uso contra tus fotos'),
      { id: 'id', label: 'Foto de INE del vendedor y compraventa simple', how: 'Nombre, teléfono, marca, modelo, número de certificado Entrupy, precio, fecha y firma. La garantía de Entrupy pide comprobante de compra.' },
      PAY_BUY,
    ],
  },
]

export const CHECKLISTS: Record<AuthProduct, CheckPhase[]> = { IPHONE, IPAD, MACBOOK, AUDIFONOS, BOLSOS }

// ─── Venta ───────────────────────────────────────────────────────────────────
// Del otro lado los riesgos son el cambiazo, el comprobante falso y el billete
// falso. El seguro es el mismo que al comprar: tu Apple ID se queda puesto
// hasta que el dinero está en tu cuenta (o contado y revisado).

const salePrep = (ident: string, account: string | null): CheckPhase => ({
  id: 'prep',
  title: 'Antes de salir',
  hint: 'Evidencia por si te lo regresan o reclaman.',
  items: [
    PLACE_ITEM,
    { id: 'record', label: `Anota ${ident} y toma fotos de sus marcas únicas`, how: 'Rayones, golpecitos, el ángulo de la funda… lo que solo tiene el tuyo. Con eso reconoces el tuyo si te lo regresan.' },
    { id: 'video', label: 'Video corto del equipo funcionando', how: `Encendido, ${ident} en pantalla y lo principal funcionando. Si el comprador reclama después, ahí está cómo lo entregaste.` },
    ...(account ? [{ id: 'keep-id', label: `Va con ${account} puesto`, how: 'Si te lo arrebatan o te pagan con algo falso, queda bloqueado e inservible. Se quita hasta el cierre.' }] : []),
    { id: 'charge', label: 'Cargado y con caja, cable y accesorios del anuncio' },
  ],
})

const saleHandover = (check: string): CheckPhase => ({
  id: 'entrega',
  title: 'En persona · revisión del comprador',
  hint: 'Que revise todo lo que quiera, pero frente a ti.',
  items: [
    { id: 'in-sight', label: 'El equipo nunca sale de tu vista', how: 'Que lo revise en la mesa, frente a ti. No "lo voy a enseñar a mi esposa", no pasarlo a un acompañante, no ir al baño con él.', stop: true },
    { id: 'return-check', label: `Si te lo regresa ("no me convenció", "tiene falla"), revisa ${check} antes de aceptarlo`, how: 'El cambiazo se hace aquí: te regresan uno igual pero roto, bloqueado o réplica, con tu funda.', stop: true },
    { id: 'one-buyer', label: 'Una persona, un trato', how: 'Si llegan 2 o 3 y uno te distrae platicando mientras otro revisa, guarda el equipo y reagenda.' },
  ],
})

const SALE_PAYMENT: CheckPhase = {
  id: 'cobro',
  title: 'Cobro',
  hint: 'Nada se entrega hasta que el dinero es real.',
  items: [
    { id: 'transfer', label: 'Transferencia: confírmala en TU app del banco', how: 'No en la captura, correo o SMS que te enseñe: los comprobantes SPEI falsos son el fraude más común. SPEI llega en segundos; si "ya te la mandé pero tarda", no se entrega. Desconfía de "te la programé" o "está en proceso".', stop: true },
    { id: 'cash', label: 'Efectivo: cuenta y revisa cada billete de $200, $500 y $1,000', how: 'Toca el relieve; a contraluz, marca de agua y hilo; inclínalo: la tinta cambia de color. Una lámpara UV de llavero (~$100) delata el papel falso: brilla parejo. Un billete dudoso se rechaza; no aceptes "te lo cambio luego".', stop: true },
    { id: 'keep-cash', label: 'Lo que ya te pagaron no regresa a sus manos', how: 'Truco del billete: "déjame contarlo otra vez", "mejor te transfiero, regrésame el efectivo", "ese billete no, dame ese y te doy otro" — y en el cambio vuelven falsos. Si quiere cambiar a transferencia, primero te transfiere y ya que lo ves en tu app le regresas su efectivo.', stop: true },
    { id: 'hand-over', label: 'Entregas cuando el pago está completo', how: 'Mientras lo revisa está a la vista y con tu Apple ID puesto; no se lo das "para que lo vaya guardando" antes de pagar.', stop: true },
    { id: 'no-split', label: 'Sin pagos partidos ni "te deposito el resto mañana"', stop: true },
  ],
}

const saleClose = (steps: CheckItem[]): CheckPhase => ({
  id: 'cierre',
  title: 'Cierre',
  hint: 'Solo con el dinero confirmado.',
  items: [
    ...steps,
    { id: 'receipt', label: 'Nota de venta con foto de su INE', how: 'Producto, IMEI/serie, precio, fecha, "se entrega revisado y funcionando a satisfacción del comprador" y firma de los dos.' },
  ],
})

const iosSaleClose = (device: string) => saleClose([
  { id: 'logout', label: `Cierras sesión de TU Apple ID (apaga Buscar ${device})`, how: 'Último paso, ya cobrado.', stop: true },
  { id: 'erase', label: 'Borrar contenidos y ajustes frente al comprador', how: 'Que vea que llega a "Hola" y se activa sin pedir tu cuenta.', stop: true },
])

const SALE_CHECKLISTS_: Record<AuthProduct, CheckPhase[]> = {
  IPHONE: [salePrep('el IMEI', 'tu Apple ID'), saleHandover('el IMEI (*#06#) y tus marcas'), SALE_PAYMENT, iosSaleClose('mi iPhone')],
  IPAD: [salePrep('la serie', 'tu Apple ID'), saleHandover('la serie y tus marcas'), SALE_PAYMENT, iosSaleClose('mi iPad')],
  MACBOOK: [
    salePrep('la serie', 'tu Apple ID'),
    saleHandover('la serie (Acerca de esta Mac) y tus marcas'),
    SALE_PAYMENT,
    saleClose([
      { id: 'logout', label: 'Cierras sesión de iCloud (apaga Buscar mi Mac)', how: 'Último paso, ya cobrado.', stop: true },
      { id: 'erase', label: 'Borrar contenidos y ajustes frente al comprador', how: 'Ajustes del Sistema › General › Transferir o restablecer. Llega al asistente sin pedir tu cuenta.', stop: true },
    ]),
  ],
  AUDIFONOS: [
    salePrep('la serie de estuche y cada AirPod', 'tu cuenta (Encontrar)'),
    saleHandover('los seriales y tus marcas'),
    SALE_PAYMENT,
    saleClose([
      { id: 'remove', label: 'Los quitas de TU app Encontrar (Eliminar este dispositivo)', how: 'Último paso, ya cobrado. Sin esto le sale "vinculados a otro Apple ID".', stop: true },
      { id: 'reset', label: 'Restablecer frente al comprador y que los empareje con su iPhone', stop: true },
    ]),
  ],
  BOLSOS: [
    salePrep('el número de certificado Entrupy y el código', null),
    saleHandover('el código, herrajes y tus marcas contra tus fotos'),
    SALE_PAYMENT,
    saleClose([
      { id: 'cert', label: 'Le compartes el certificado Entrupy', how: 'Lo verifica en entrupy.com/search-certificate con el número.' },
    ]),
  ],
}

export const MODE_CHECKLISTS: Record<AuthMode, Record<AuthProduct, CheckPhase[]>> = { COMPRA: CHECKLISTS, VENTA: SALE_CHECKLISTS_ }

export const SERVICES: Record<AuthProduct, CheckService[]> = {
  IPHONE: [CRT, SICKW_BASIC, SICKW_LOST, APPLE_COVERAGE, SICKW_MDM, SICKW_REPLACEMENTS, SICKW_GSX],
  IPAD: [CRT, SICKW_MDM, APPLE_COVERAGE, SICKW_LOST, SICKW_GSX],
  MACBOOK: [APPLE_COVERAGE, SICKW_MAC, SICKW_GSX],
  AUDIFONOS: [APPLE_COVERAGE],
  BOLSOS: [ENTRUPY_APP, ENTRUPY_SEARCH],
}

// ─── Entrupy: planes y otras categorías ──────────────────────────────────────
// entrupy.com/pricing, octubre 2026. Precios en USD.

export const ENTRUPY_PLANS = [
  { name: 'Petit', monthly: 139, yearly: 1499, tokens: 25, perToken: 5.6 },
  { name: 'Moyen', monthly: 599, yearly: 6469, tokens: 125, perToken: 4.8 },
  { name: 'Grand', monthly: 1049, yearly: 11329, tokens: 250, perToken: 4.2 },
]

export const ENTRUPY_NOTE =
  'Tokens por mes (el anual da 12× y sale ~10% más barato). El primer mes regala los mismos tokens del plan. ' +
  'Necesitas la app de Entrupy en un teléfono compatible (revisa sus requisitos mínimos de hardware) y conexión para subir las fotos. ' +
  'Se renueva solo: cancela 30 días antes si no lo vas a seguir usando.'

/** Lo demás que autentica Entrupy, por si se abre otra categoría. */
export const ENTRUPY_OTHER: { category: string; tokens: string; brands: string }[] = [
  { category: 'Joyería', tokens: '2–15', brands: 'Cartier (Love, Juste un Clou, Clash: 15), Van Cleef & Arpels (Alhambra: 15), Tiffany & Co., David Yurman, Chrome Hearts, Chanel, Hermès, Louis Vuitton, Dior, Gucci. No cubre piedras ni ley del metal.' },
  { category: 'Tenis y zapatos', tokens: '2–5', brands: 'Jordan, Nike, Adidas, New Balance, Asics, Hoka, On, Salomon… (2); Gucci, Prada, Golden Goose, McQueen, Off-White (3); Dior, LV, Chanel, Louboutin, Balenciaga, Hermès, YSL, colaboraciones Dior/Off-White/LV (5).' },
  { category: 'Ropa', tokens: '2–8', brands: 'Supreme, BAPE, Palace, Stüssy, Essentials, Chrome Hearts, Moncler, Canada Goose, Burberry, Gucci, Prada, Dior, LV, Chanel, Hermès…' },
  { category: 'Lentes de sol', tokens: '2–4', brands: 'Chrome Hearts (4); Chanel, Gucci, Louis Vuitton (2).' },
]
