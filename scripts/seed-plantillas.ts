/**
 * Reemplaza todas las plantillas con un set extenso enfocado en
 * bienes raíces (CDMX premium, Interlomas y similares).
 *
 * Ordenado por importancia descendente — las preguntas más frecuentes
 * y críticas arriba, conocimiento profesional/estudio abajo.
 *
 * Uso: npx tsx --tsconfig scripts/tsconfig.json scripts/seed-plantillas.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ── Plantillas ────────────────────────────────────────────────────────────────

const PLANTILLAS: { pregunta: string; respuesta: string }[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 1 — PRECIO Y FINANCIAMIENTO (lo más preguntado)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    pregunta: "¿El precio es negociable?",
    respuesta:
      "Casi toda propiedad tiene margen de negociación, típicamente entre 3% y 10% del precio de lista, dependiendo del tiempo publicada y la urgencia del vendedor. Una oferta sustentada en un análisis comparativo de mercado (ACM) se respeta más que una al tanteo. Si pagas de contado o tienes pre-aprobación bancaria, tu oferta pesa más.",
  },
  {
    pregunta: "¿Cuánto debo dar de enganche?",
    respuesta:
      "Con crédito hipotecario bancario el enganche va del 10% al 30% del valor de la propiedad. Con 20% o más obtienes mejor tasa, menos seguros obligatorios y menor mensualidad. Con Infonavit/Fovissste el monto se complementa con tu crédito y puede no requerir enganche si tu crédito alcanza.",
  },
  {
    pregunta: "¿Aceptan crédito Infonavit?",
    respuesta:
      "Sí, en sus modalidades Tradicional, Cofinavit y Apoyo Infonavit. Primero precalifica en mi.infonavit.org.mx para saber tu monto. La propiedad debe estar dentro del valor máximo permitido (actualmente alrededor de 2.6M MXN para Tradicional, más para Cofinavit). Si la propiedad excede ese tope, combinamos con crédito bancario.",
  },
  {
    pregunta: "¿Aceptan crédito Fovissste?",
    respuesta:
      "Sí, si cotizas al ISSSTE. Modalidades disponibles: Tradicional, Conyugal, Alia2 y Respalda2 entre otras. El proceso es similar a Infonavit: precalificación en línea, elección de propiedad, avalúo, y se ejerce ante notario. El tiempo de cierre con Fovissste va de 10 a 14 semanas en promedio.",
  },
  {
    pregunta: "¿Cómo funciona un crédito hipotecario bancario?",
    respuesta:
      "El banco te presta hasta 90% del valor (o de avalúo, el menor) a 5-20 años. Pagas mensualmente capital + intereses + seguros (vida y daños) + comisiones. Las tasas en pesos están entre 9% y 12% anual fijo. Compara el CAT (Costo Anual Total), no la tasa nominal — el CAT refleja el costo real incluyendo seguros y comisiones.",
  },
  {
    pregunta: "¿Puedo dar mi propiedad actual como parte de pago?",
    respuesta:
      "Sí, le llamamos permuta o parte de pago. Hacemos un avalúo de tu propiedad y se aplica como parte del precio de la nueva. Si tu propiedad vale menos, completas con efectivo o crédito; si vale más, recibes la diferencia. Es muy útil cuando quieres mudarte sin tener que vender primero.",
  },
  {
    pregunta: "¿Cuál es el ingreso mensual que necesito comprobar?",
    respuesta:
      "Regla general: tu ingreso comprobable debe ser 3 a 4 veces la mensualidad. Si la mensualidad va a ser $30,000, necesitas comprobar $90,000-$120,000 al mes. Se comprueba con recibos de nómina (últimos 3), estados de cuenta (6-12 meses si eres independiente), carta laboral, y declaración anual del SAT.",
  },
  {
    pregunta: "Estoy en Buró de Crédito, ¿puedo comprar?",
    respuesta:
      "Estar en Buró no es eliminatorio automáticamente; lo que importa es tu comportamiento actual. Si tienes pagos al corriente y movimiento sano, varios bancos pueden aprobarte. Si hay adeudos vencidos, regularízalos primero. Cada banco evalúa distinto — podemos preconsultar tu caso sin afectar tu score.",
  },
  {
    pregunta: "¿Qué es la pre-aprobación crediticia?",
    respuesta:
      "Es una carta del banco que indica cuánto te prestaría según tus ingresos, antes de elegir propiedad. Tiene vigencia de 60-90 días y es gratis en la mayoría de bancos. Te da poder de negociación, cierre más rápido y certeza sobre tu presupuesto real. Recomiendo siempre obtenerla antes de empezar a visitar.",
  },
  {
    pregunta: "¿Cuál es la tasa de interés actual?",
    respuesta:
      "Las tasas hipotecarias actuales están entre 9% y 12% anual en pesos a tasa fija. El número exacto depende del banco, plazo, monto, enganche y tu perfil. Lo importante es comparar el CAT, no la tasa nominal. Si vas con Banorte, BBVA, Santander, Scotia o HSBC, te puedo ayudar a comparar ofertas.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 2 — COSTOS ADICIONALES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    pregunta: "¿Cuánto debo pagar aparte del precio de la propiedad?",
    respuesta:
      "Calcula entre 6% y 10% del valor del inmueble en gastos adicionales: gastos notariales y escrituración (4-6%), ISAI/ISABI (2-4%), avalúo ($5,000-$25,000), y si vas con crédito comisión de apertura (1-2%). En un departamento de $10M MXN, los gastos extra rondan los $700,000 a $1,000,000. Conviene tener este monto reservado antes de empezar.",
  },
  {
    pregunta: "¿Cuánto cuesta la escrituración / gastos notariales?",
    respuesta:
      "En CDMX y Edomex los gastos notariales rondan el 4% al 6% del valor de la operación. Incluyen: honorarios del notario, derechos del Registro Público de la Propiedad, certificados de gravamen y libertad, avalúo catastral, ISAI/ISABI y otros impuestos locales. Por costumbre los paga el comprador.",
  },
  {
    pregunta: "¿Quién paga el ISR de la venta?",
    respuesta:
      "El ISR por enajenación de inmueble lo paga el vendedor, no el comprador. El notario lo retiene y lo entera al SAT al cerrar. La tasa va de 0% (si aplica exención por casa habitación) hasta 35% según utilidad. La exención por casa habitación aplica hasta ~700,000 UDIs (~$5M MXN actualmente) si fue tu vivienda principal los últimos 3 años.",
  },
  {
    pregunta: "¿Cuánto cuesta el avalúo?",
    respuesta:
      "Entre $5,000 y $25,000 MXN dependiendo del valor del inmueble. Es obligatorio si vas con crédito bancario, Infonavit o Fovissste, y casi siempre el banco lo coordina. Debe hacerlo un perito autorizado por la SHF o el propio banco. El costo lo paga el comprador.",
  },
  {
    pregunta: "¿Qué es el ISAI / ISABI?",
    respuesta:
      "Es el Impuesto Sobre Adquisición de Bienes Inmuebles (ISAI en CDMX, ISABI en Edomex). Lo paga el comprador al adquirir la propiedad. Tasa progresiva del 3% al 6% del valor de operación o avalúo (el mayor de los dos). Lo calcula y retiene el notario en el acto de firma de escritura.",
  },
  {
    pregunta: "¿Cuánto cobra el agente inmobiliario?",
    respuesta:
      "La comisión estándar es del 3% al 6% del precio de venta más IVA, y la paga el vendedor — no el comprador. Esa comisión cubre publicación, fotografía profesional, recorridos, negociación, asesoría legal, acompañamiento notarial y todo el proceso hasta la entrega de llaves. Tú como comprador no tienes ningún costo por mi asesoría.",
  },
  {
    pregunta: "¿Hay cuota de mantenimiento? ¿Cuánto es?",
    respuesta:
      "En desarrollos premium de Interlomas la cuota va de $4,000 a $15,000 MXN mensuales según metraje y amenidades. Cubre vigilancia 24/7, mantenimiento de áreas comunes, alberca, gimnasio, jardinería, administración y reservas. Antes de comprar siempre revisa el estado financiero del condominio y si tiene cuotas extraordinarias programadas.",
  },
  {
    pregunta: "¿Cuánto es el predial?",
    respuesta:
      "Depende del valor catastral (no comercial) y la zona. Para un departamento premium en CDMX/Edomex ronda entre $5,000 y $30,000 MXN al año. Se paga en enero/febrero con 5-10% de descuento o bimestralmente. El vendedor debe estar al corriente y presentar constancia de no adeudo antes de escriturar.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 3 — DOCUMENTACIÓN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    pregunta: "¿Qué documentos necesito como comprador?",
    respuesta:
      "INE vigente, CURP, RFC con homoclave, comprobante de domicilio reciente (≤3 meses), acta de nacimiento, y si vas con crédito: 3 recibos de nómina o 6-12 estados de cuenta (si eres independiente), carta laboral con antigüedad, declaración anual del SAT y referencias personales. Si estás casado por sociedad conyugal, también los datos completos de tu cónyuge.",
  },
  {
    pregunta: "¿Qué documentos debe entregar el vendedor?",
    respuesta:
      "Escritura pública a su nombre debidamente inscrita en el Registro Público de la Propiedad, INE, comprobante de domicilio, RFC, constancias de no adeudo de predial, agua y mantenimiento, reglamento de condominio, boletas pagadas del último año y avalúo vigente. Si es persona moral, acta constitutiva y poderes vigentes del representante legal.",
  },
  {
    pregunta: "¿Necesito ser mexicano para comprar?",
    respuesta:
      "No. Los extranjeros pueden comprar inmuebles en México. Fuera de la zona restringida (100 km de frontera y 50 km de costa) compran directamente igual que un mexicano. Dentro de zona restringida se hace vía fideicomiso bancario por 50 años renovables. CDMX, Edomex e Interlomas están fuera de la zona restringida — no hay restricción.",
  },
  {
    pregunta: "¿Qué es la zona restringida para extranjeros?",
    respuesta:
      "Es la franja de 100 km a lo largo de fronteras y 50 km a lo largo de costas. Por mandato constitucional, los extranjeros no pueden tener propiedad directa ahí. Para comprar dentro de esa zona se constituye un fideicomiso bancario donde el banco es titular y el extranjero el beneficiario por 50 años renovables. Trámite de 6-10 semanas adicional.",
  },
  {
    pregunta: "¿Qué es la escritura pública?",
    respuesta:
      "Es el documento legal donde un notario público da fe de la transmisión de propiedad. Debe inscribirse en el Registro Público de la Propiedad para ser oponible a terceros. En México es la única prueba válida de propiedad — una factura, contrato privado o cesión simple no transmiten dominio. Sin escritura inscrita, legalmente no eres dueño.",
  },
  {
    pregunta: "¿Cuál es la diferencia entre título de propiedad y escritura?",
    respuesta:
      "En México el instrumento jurídico válido es la escritura pública otorgada ante notario e inscrita en el Registro Público. 'Título de propiedad' no es una figura legal aquí — si alguien te ofrece un 'título' que no es escritura inscrita, casi siempre tiene problema legal. Verifica siempre la inscripción con búsqueda en el Registro Público antes de cualquier oferta.",
  },
  {
    pregunta: "¿Qué son las constancias de no adeudo?",
    respuesta:
      "Documentos que acreditan que la propiedad no debe predial, agua, mantenimiento o luz al momento de la venta. El notario las exige obligatoriamente para escriturar y son responsabilidad del vendedor. Si hay adeudos, el vendedor debe liquidarlos antes del cierre o descontarlos del precio (esto último previa negociación).",
  },
  {
    pregunta: "¿Qué es el certificado de libertad de gravamen?",
    respuesta:
      "Es un documento del Registro Público de la Propiedad que confirma que la propiedad está libre de hipotecas, embargos, demandas o cualquier carga legal. Tiene vigencia de 30 días. Si la propiedad tiene hipoteca activa (el vendedor está pagando crédito), debe cancelarse o liquidarse antes/durante la escrituración.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 4 — PROCESO DE COMPRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    pregunta: "¿Cómo es el proceso completo, desde que decido hasta las llaves?",
    respuesta:
      "1) Visita y oferta. 2) Aceptación y contrato de promesa de compraventa con arras (apartado del 5-10%). 3) Trámite del crédito si aplica (4-8 semanas). 4) Avalúo y revisión legal de documentos. 5) Cita en notaría: firma de escritura, pago del saldo y entrega de llaves. 6) Inscripción en el Registro Público. Total: 3-6 semanas de contado, 8-16 semanas con crédito.",
  },
  {
    pregunta: "¿Cuánto tarda toda la compra?",
    respuesta:
      "De contado: 3-6 semanas (cuello de botella son trámites notariales y registro). Con crédito bancario: 8-12 semanas. Con Infonavit o Fovissste: 10-16 semanas. El factor más lento siempre es el banco — los notarios mexicanos cierran rápido cuando los documentos están limpios. Tener pre-aprobación acelera el proceso considerablemente.",
  },
  {
    pregunta: "¿Qué es el contrato de promesa de compraventa?",
    respuesta:
      "Es el contrato privado que firman vendedor y comprador antes de la escritura, donde se acuerdan precio, plazo de cierre, condiciones y se entregan las arras. No transmite propiedad — eso solo lo hace la escritura — pero formaliza el compromiso. Si una parte se echa para atrás sin causa, hay penalizaciones definidas en el contrato.",
  },
  {
    pregunta: "¿Qué son las arras / apartado? ¿Cuánto se pide?",
    respuesta:
      "Es un monto que el comprador deja para reservar la propiedad y comprometer la operación, típicamente 5%-10% del precio. Si el cierre se concreta, se descuentan del precio total. Si el comprador desiste sin causa justificada, las pierde; si el vendedor desiste, debe devolverlas al doble (art. 2243 del Código Civil Federal y locales).",
  },
  {
    pregunta: "¿Quién elige al notario?",
    respuesta:
      "Por costumbre y por código, el comprador elige al notario, porque es quien paga la escrituración. En la práctica suele elegirse uno cercano al inmueble o de confianza del banco si hay crédito. Vale la pena entrevistar 2-3 antes de decidir — los honorarios y tiempos varían bastante. El notario debe estar en la entidad donde está la propiedad.",
  },
  {
    pregunta: "¿Cuándo recibo las llaves?",
    respuesta:
      "Tradicionalmente al firmar la escritura ante notario, una vez liquidado el saldo total. Si hay crédito bancario, el banco libera el monto al notario en ese mismo acto y este lo entrega al vendedor. Algunos vendedores permiten ocupación previa con contrato adicional o renta temporal, pero no es lo común.",
  },
  {
    pregunta: "¿Qué pasa si el crédito no se aprueba después del apartado?",
    respuesta:
      "Un contrato de promesa bien redactado incluye cláusula de 'no aprobación crediticia': si el banco no aprueba en el plazo acordado (típicamente 45-60 días), las arras se devuelven sin penalización. Siempre exige esta cláusula al firmar — sin ella, perderías el apartado si el banco rechaza por algo fuera de tu control.",
  },
  {
    pregunta: "¿Puedo hacer una contraoferta?",
    respuesta:
      "Por supuesto. La contraoferta es parte normal de la negociación. Lo importante es sustentarla: ACM con propiedades comparables, condiciones de mercado, tiempo del listing, gastos de mejora pendientes. Una contraoferta entre 5-8% por debajo del precio de lista, bien sustentada, suele ser aceptada o detonar una negociación seria.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 5 — PROPIEDAD ESPECÍFICA / VISITAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    pregunta: "¿Cuándo puedo agendar visita?",
    respuesta:
      "Las visitas las coordino directamente con el propietario o la administración del edificio. Normalmente puedo agendar dentro de 24-48 horas. Mándame los horarios que te quedan bien y el mismo día te confirmo. Duran 30-45 minutos por propiedad — si quieres comparar varias el mismo día, agendamos un tour.",
  },
  {
    pregunta: "¿Puedo hacer una segunda visita?",
    respuesta:
      "Sí, te lo recomiendo. La segunda visita es donde realmente decides. Te sugiero hacerla en horario distinto a la primera (una en la mañana, otra al atardecer) para evaluar luz natural, ruido, tráfico y vecindad. Y si te es posible, una visita en fin de semana para sentir el ambiente real cuando hay vecinos en casa.",
  },
  {
    pregunta: "¿Qué tipo de propiedad es exactamente?",
    respuesta:
      "Te confirmo el tipo exacto (departamento estándar, garden house, penthouse, loft, townhouse), el régimen (condominio horizontal o vertical), áreas privativas adicionales (roof garden, jardín, terraza), número de cajones de estacionamiento, si incluye bodega y nivel del piso. Mándame el link del listing y te paso la ficha técnica completa.",
  },
  {
    pregunta: "¿Aceptan mascotas?",
    respuesta:
      "La mayoría de los desarrollos en Interlomas y zonas premium las aceptan, pero cada condominio tiene reglamento propio: algunos limitan tamaño (hasta 25 kg), raza (excluyen razas consideradas peligrosas) o número (típicamente 2 máximo). Antes de cerrar te paso el extracto del reglamento para que veas las reglas exactas.",
  },
  {
    pregunta: "¿Cuántos estacionamientos incluye?",
    respuesta:
      "Te confirmo por listing. En desarrollos premium en la zona típicamente son 2-3 cajones por unidad, varios con bodega de 3-6 m² incluida. Si necesitas cajones adicionales, en muchos edificios se pueden comprar o rentar a otros condóminos.",
  },
  {
    pregunta: "¿Cuáles son las amenidades del desarrollo?",
    respuesta:
      "Depende del desarrollo. Los premium en Interlomas suelen incluir: vigilancia 24/7, alberca techada con calefacción, gimnasio equipado, salón de eventos, ludoteca, business center, asadores, áreas verdes, y en algunos casos spa, sala de cine, pet park o cancha de pádel/squash. Te paso la lista exacta del que te interese.",
  },
  {
    pregunta: "¿Cómo es la seguridad del edificio y la zona?",
    respuesta:
      "Los desarrollos en Interlomas y zonas similares cuentan con vigilancia privada 24/7, accesos controlados con caseta y registro de visitantes, cámaras CCTV en áreas comunes, sistema de circuito cerrado y en muchos casos guardias adicionales en horarios pico. La zona en general es de las más seguras de la ZMVM por la concentración residencial premium.",
  },
  {
    pregunta: "¿La propiedad está habitada o desocupada?",
    respuesta:
      "Te confirmo por listing. Desocupada: cierre y mudanza rápidos, puedes ocupar inmediatamente después de escriturar. Habitada por el dueño: se negocia plazo de desocupación, típicamente 30-60 días post-escritura. Habitada por inquilino: se respeta el contrato vigente y la propiedad se vende con el contrato como carga, salvo negociación distinta.",
  },
  {
    pregunta: "¿Cuándo se construyó el edificio?",
    respuesta:
      "Te paso el año exacto y el desarrollador. En Interlomas hay obra nueva (Manigua, Nua, Antia, Murano — últimos 1-5 años) y edificios consolidados de 10-20 años (Bosques de Interlomas, Hacienda del Ciervo, Be Grand). Obra nueva: mejores acabados, eficiencia energética, garantías. Consolidados: vecinos establecidos, mantenimientos planeados y plusvalía ya demostrada.",
  },
  {
    pregunta: "¿Puedo remodelar la propiedad?",
    respuesta:
      "Remodelaciones interiores casi siempre se permiten con aviso previo a la administración y respetando horarios (típicamente lunes a sábado 9 a 6, prohibido domingos y festivos). Cambios estructurales, de fachada o que afecten áreas comunes requieren aprobación de la asamblea de condóminos. Antes de cerrar te paso el reglamento.",
  },
  {
    pregunta: "¿Cuánto se renta una propiedad similar?",
    respuesta:
      "Las rentas en Interlomas premium van del 0.4% al 0.6% del valor mensual (rentabilidad bruta anual del 4.8%-7.2%). Por ejemplo, un depto de $10M renta entre $40,000 y $60,000 al mes. Esto sirve para evaluar si te conviene rentar mientras decides comprar, o para análisis de inversión. Te paso comparables si te interesa.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 6 — ESTUDIO / CONOCIMIENTO PROFESIONAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    pregunta: "¿Qué es la plusvalía y cómo se calcula?",
    respuesta:
      "Plusvalía = aumento porcentual de valor de un inmueble por año. Se calcula con: ((valor_actual / valor_compra)^(1/años)) - 1. En CDMX las zonas premium plusvalúan entre 6% y 12% anual en pesos en los últimos 10 años. Factores: ubicación, conectividad nueva (línea de metro/Mexibús), desarrollos cercanos, seguridad, demanda demográfica. Interlomas es de las zonas con plusvalía más sostenida del país.",
  },
  {
    pregunta: "¿Qué es un análisis comparativo de mercado (ACM)?",
    respuesta:
      "Estudio que compara la propiedad con otras similares vendidas o publicadas recientemente en la misma zona (mismos m², recámaras, antigüedad, amenidades). Sirve para: validar precio justo, sustentar oferta, negociar con datos. Un buen agente siempre te presenta un ACM antes de ofertar — nunca ofertes por intuición. Yo trabajo con ACM de los últimos 6 meses para que sea relevante.",
  },
  {
    pregunta: "¿Diferencia entre departamento, garden house, penthouse, loft, townhouse?",
    respuesta:
      "Departamento: unidad en edificio multifamiliar. Garden house: planta baja con jardín privado, casi siempre con doble altura. Penthouse: último piso o niveles superiores, generalmente más amplios, con vistas privilegiadas y a veces roof garden privado. Loft: planta abierta sin divisiones, origen industrial, normalmente con doble altura. Townhouse: casa adosada en condominio horizontal, varios niveles.",
  },
  {
    pregunta: "¿Qué es el régimen de propiedad en condominio?",
    respuesta:
      "Figura legal donde múltiples propietarios comparten un inmueble. Cada unidad (tu depto) es propiedad privada exclusiva; las áreas comunes (pasillos, alberca, jardines) son propiedad indivisa compartida proporcionalmente. Está regulado por la Ley de Propiedad en Condominio de cada entidad y el reglamento interno. Pueden ser verticales (edificio) u horizontales (conjunto de casas).",
  },
  {
    pregunta: "¿Cómo funciona el cofinanciamiento Cofinavit?",
    respuesta:
      "Combinación de crédito Infonavit + crédito bancario para acceder a propiedades de mayor valor. Infonavit aporta hasta su tope vigente (~$2.6M) y el banco completa el resto. Pagas dos mensualidades: una a Infonavit descontada vía nómina, otra al banco. Te permite comprar premium aunque tu Infonavit solo no alcance. Tu pago mensual total ronda entre 25% y 35% del ingreso comprobable.",
  },
  {
    pregunta: "¿Qué es el CAT y por qué importa más que la tasa?",
    respuesta:
      "CAT = Costo Anual Total. Refleja el costo REAL del crédito incluyendo intereses, seguros obligatorios, comisión de apertura, anualidades y todo cargo asociado. Una tasa nominal de 10% con seguros caros puede tener CAT de 13%. Siempre compara CAT entre bancos, no la tasa nominal — la tasa pelada engaña, el CAT no. Lo publican obligatoriamente por la Condusef.",
  },
  {
    pregunta: "¿Cuándo conviene comprar de contado vs con crédito?",
    respuesta:
      "Contado: 5-10% adicional de descuento por poder de negociación, cierre rápido (3-6 semanas), cero costo financiero. Crédito: conservas liquidez para inversiones que pueden rendir más que la tasa (~10%), apalancamiento aprovecha plusvalía. Regla: si el inmueble plusvalúa > tasa del crédito, apalancarse es ganador; si es para uso personal sin venta cercana, contado simplifica.",
  },
  {
    pregunta: "¿Qué es el fideicomiso inmobiliario?",
    respuesta:
      "Figura donde un banco (fiduciario) recibe en propiedad el inmueble y lo administra a favor de un beneficiario (extranjero o varios mexicanos). Se usa principalmente para que extranjeros puedan tener inmuebles en zona restringida (50/100 km de costa/frontera), o para esquemas de protección patrimonial. Vigencia inicial de 50 años renovables.",
  },
  {
    pregunta: "¿Cómo se valida que el vendedor es el dueño real?",
    respuesta:
      "Tres verificaciones obligatorias antes de ofertar: 1) Pides copia de la escritura y verificas que coincide con su INE. 2) Solicitas certificado de libertad de gravamen del Registro Público (≤30 días vigencia). 3) Verificas folio real con búsqueda en el Registro Público. Si alguno no cuadra, no avances. Yo hago esta verificación de oficio antes de presentar cualquier listing.",
  },
  {
    pregunta: "¿Cómo me preparo para mi primera asesoría como vendedor?",
    respuesta:
      "Estudia 5 cosas: (1) tu inventario al detalle — m², año, amenidades, mantenimiento, predial; (2) tu zona — desarrollos competidores, precios por m², plusvalía histórica; (3) tipos de crédito y requisitos básicos; (4) costos de cierre típicos; (5) régimenes de propiedad. Practica explicaciones de 30 segundos por concepto. Lleva ACM impreso a las visitas. Escucha 70%, habla 30%.",
  },
  {
    pregunta: "¿Cuáles son las señales de alerta de un fraude inmobiliario?",
    respuesta:
      "Banderas rojas: precio muy por debajo del mercado de la zona, vendedor presionando cierre rápido sin notario, exige apartado por transferencia a cuenta personal, se niega a mostrar escritura original, propiedad sin inscribir en Registro Público, certificados con fechas inconsistentes, escrituras con tachones o anexos sin folio. Si ves dos o más, retírate. Usa siempre notario para validar.",
  },
  {
    pregunta: "¿Qué es el SCR / Sociedad Conyugal y cómo afecta la compra?",
    respuesta:
      "Si el comprador o vendedor está casado bajo sociedad conyugal, ambos cónyuges deben firmar la escritura y aparecer en el contrato — sin esto el acto es anulable. Bajo separación de bienes solo firma el titular. Verifica el régimen pidiendo el acta de matrimonio. Si el cónyuge está en el extranjero, se requiere poder notarial apostillado para firmar a su nombre.",
  },
]

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Borrando plantillas existentes...`)
  const deleted = await prisma.plantilla.deleteMany({})
  console.log(`  ↺ ${deleted.count} plantillas eliminadas`)

  console.log(`\nInsertando ${PLANTILLAS.length} plantillas nuevas...`)
  for (let i = 0; i < PLANTILLAS.length; i++) {
    const p = PLANTILLAS[i]
    await prisma.plantilla.create({
      data: { pregunta: p.pregunta, respuesta: p.respuesta, orden: i + 1 },
    })
  }

  console.log(`\n✅ ${PLANTILLAS.length} plantillas insertadas en orden de importancia.`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
