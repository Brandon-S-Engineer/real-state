// ── Por qué se mueven los precios en cada festival ───────────────────────────
//
// Cada festival tiene su propia máquina de mover precios. Entenderla es lo que
// separa al barón del que apuesta: el barón NO abre cajas — le compra barato al
// que las abrió, perdió, y liquida lo poco que sacó.
//
// La cadena causal es siempre la misma en el fondo:
//   contenedor abierto en masa → su contenido satura el TP → precio se desploma
//   → termina el festival → la oferta se seca → el precio se recupera meses después
//
// Pero la DIRECCIÓN cambia según qué papel juegue el ítem:
//   - Sale de las cajas         ⇒ se hunde durante el festival ⇒ comprar
//   - Se PAGA para comprar cajas ⇒ sube durante el festival    ⇒ vender hacia él
//
// Nada de esto reemplaza a los números: `festival-cycle.ts` mide el efecto real
// contra 6 años de historial. Esto explica el PORQUÉ; la tabla dice el CUÁNTO.

export type EventMechanic = {
  /** El contenedor o actividad que la gente abre/farmea en masa. */
  container: string
  /** Item id si el contenedor se comercia en el TP (para linkearlo). */
  containerItemId?: number
  /** Cómo se consigue. */
  source: string
  /** Qué suelta y termina saturando el mercado. */
  floods: string
  /** La consecuencia concreta de precio. */
  effect: string
}

export type EventEconomics = {
  /** Resumen de una línea de la máquina económica del festival. */
  engine: string
  mechanics: EventMechanic[]
  /** La jugada del barón, concreta. */
  baronPlay: string
  /** Errores típicos que queman oro en este festival. */
  trap: string
}

export const EVENT_ECONOMICS: Record<string, EventEconomics> = {
  'lunar-new-year': {
    engine:
      'Un vendor vende sobres baratos con tope por cuenta, y el TP los paga mucho más caro. Eso arrastra a media Tyria a comprar el tope diario y abrirlos o revenderlos, y el contenido de millones de sobres abiertos termina inundando el mercado.',
    mechanics: [
      {
        container: 'Divine Lucky Envelope',
        containerItemId: 68646,
        source: 'Vendor del festival, con tope diario por cuenta (~1g). Se revende en el TP a varias veces ese precio.',
        floods: 'Essence of Luck, fuegos artificiales, comida de festival, mats variados y, muy rara vez, minis y skins del zodiaco.',
        effect:
          'Los fuegos artificiales y la comida del festival se desploman mientras dura el evento porque salen de millones de sobres abiertos a la vez. Las skins del zodiaco del año solo se acuñan acá.',
      },
    ],
    baronPlay:
      'Dos jugadas. La barata: comprar el tope diario del vendor y revenderlo en el TP mientras el diferencial siga abierto (oro seguro, pero con techo por el tope por cuenta). La de barón: comprar los consumibles y skins hundidos en el último tramo del festival y venderlos cuando la oferta se seque, meses después.',
    trap:
      'Abrir sobres esperando el mini o la skin. Esa es la apuesta que el 99% pierde — y es justo lo que abarata lo que vos deberías estar comprando.',
  },

  'super-adventure-box': {
    engine:
      'SAB no tiene un contenedor que inunde el mercado de materiales: lo que inunda son las SKINS. Solo se acuñan durante las ~3 semanas del evento, y todos los que las sacan las listan a la vez.',
    mechanics: [
      {
        container: 'Skins de armas Super',
        source: 'Se acuñan solo mientras SAB está activo (baubles y Bauble Bubbles son account-bound, no se comercian).',
        floods: 'El set completo de skins Super entra al TP en masa durante 3 semanas y desaparece de la oferta el resto del año.',
        effect:
          'Curva de libro: mínimo anual al cierre del festival, recuperación sostenida durante los ~11 meses siguientes hasta el próximo SAB.',
      },
    ],
    baronPlay:
      'El más simple de todos los festivales: comprar skins Super en los últimos días del evento y venderlas 6-9 meses después. No hay materiales que analizar, solo cosméticos con oferta que se corta de golpe.',
    trap:
      'Comprar al inicio del festival. La oferta sigue creciendo durante las 3 semanas — el piso está al final, no al principio.',
  },

  'dragon-bash': {
    engine:
      'Zhaitaffy y Jorbreaker funcionan como moneda del festival y se farmean sin parar, así que se abaratan mientras el evento corre. Los Dragon Coffer se abren en masa buscando holo-skins, y lo que sale se lista de inmediato.',
    mechanics: [
      {
        container: 'Dragon Coffer',
        containerItemId: 43357,
        source: 'Drop de las actividades del festival; también se compra en el TP.',
        floods: 'Holo-skins, minis, comida holográfica y consumibles del festival.',
        effect:
          'Las holo-skins y la comida de festival tocan su piso mientras el evento está activo, por la apertura masiva de coffers.',
      },
      {
        container: 'Piece of Zhaitaffy / Jorbreaker',
        containerItemId: 43319,
        source: 'Se farmea de las piñatas y actividades del festival, de forma prácticamente ilimitada.',
        floods: 'El propio Zhaitaffy, que es la moneda con la que se compran las recompensas del festival.',
        effect:
          'Baja de forma sostenida a medida que avanza el evento: cuanta más gente farmea, más barato. Pero ojo — al ser moneda del festival, también tiene un pico de DEMANDA cuando el evento arranca.',
      },
    ],
    baronPlay:
      'Comprar holo-skins y comida de festival en el último tramo del evento, cuando la apertura de coffers saturó la oferta, y venderlas a lo largo del año. El Zhaitaffy es más tramposo: medí su dirección en la tabla antes de moverte, porque es a la vez moneda (sube) y farmeo infinito (baja).',
    trap:
      'Tratar el Zhaitaffy como si fuera Candy Corn. No lo es: los datos muestran que se comporta más como moneda demandada que como material inundado, y varios años el buy-and-hold quedó en pérdida.',
  },

  'festival-of-the-four-winds': {
    engine:
      'Four Winds es el festival AL REVÉS, y por eso es el más malentendido. Las Zephyrite Supply Boxes NO se compran con oro: se pagan con materiales base de Tyria (tela, madera, metal, cuero) y con ectos. Como todo el mundo va a comprar cajas al mismo tiempo, el festival crea una ola de DEMANDA sobre esos materiales y los precios SUBEN en vez de bajar.',
    mechanics: [
      {
        container: 'Zephyrite Supply Box',
        source:
          'Se compra a los vendors del Bazaar Docks pagando con materiales base (p. ej. 30 Coarse Leather Sections) o Research Notes. La caja en sí es account-bound: no se comercia.',
        floods:
          'Materiales de todos los tiers, runas y skins del festival, y —con probabilidad de lotería— infusiones y cosméticos caros. Los datos de la comunidad sobre más de 81.000 cajas abiertas muestran drops como Winter\'s Heart Infusion apareciendo UNA sola vez.',
        effect:
          'Doble efecto: los materiales que se PAGAN por las cajas suben durante el festival, y lo que SALE de las cajas (skins, runas del festival, y las rarísimas infusiones) se abarata porque los pocos que ganan liquidan al instante.',
      },
    ],
    baronPlay:
      'Dos jugadas opuestas al mismo tiempo. (1) Acumular materiales base y ectos ANTES del festival y venderlos HACIA el pico de demanda — los números confirman que el ecto sube ~15% respecto a su línea base. (2) Comprar barato lo que los ganadores dumpean durante el evento (runas, skins del festival, infusiones) y aguantarlo meses.',
    trap:
      'Comprar ectos DURANTE el festival para aguantarlos. Es la jugada intuitiva y es la equivocada: al medir los 6 años, comprar ecto en la ventana del festival y vender después dio ganancia neta en 1 de 6 años. En Four Winds los mats base se VENDEN, no se compran.',
  },

  'halloween-shadow-of-the-mad-king': {
    engine:
      'El caso más limpio y consistente del año. Durante Halloween se abren millones de Trick-or-Treat Bags buscando infusiones y skins raras. Cada bolsa suelta caramelos, así que el mercado se ahoga en Candy Corn y compañía mientras el 1% que saca una infusión la lista de inmediato.',
    mechanics: [
      {
        container: 'Trick-or-Treat Bag',
        containerItemId: 36038,
        source: 'Drop constante de mobs y actividades durante todo el festival; también se compra en el TP.',
        floods:
          'Piece of Candy Corn, Nougat Center, Plastic Fangs y Chattering Skull en cantidades enormes; además Essence of Luck, tónicos, y en la cola rara: infusiones (Polysaturating / Phospholuminescent), minis y skins.',
        effect:
          'Los caramelos tocan su mínimo anual durante el festival y se recuperan durante los meses siguientes, cuando la única fuente vuelve a ser el stock acumulado. Las infusiones raras se abaratan por el dumping de los ganadores.',
      },
    ],
    baronPlay:
      'El motor de unidentified financia esto. Comprar caramelos en el último tramo del festival, cuando la oferta está saturada, y venderlos ~8 meses después. Aparte, cazar las infusiones que los ganadores liquidan durante el evento: son pocas unidades pero de valor alto, y su oferta se corta del todo cuando el festival cierra.',
    trap:
      'Esperar el x2 bruto que se ve en los gráficos. Después del 15% del TP y comprando al promedio del festival (no al mínimo exacto, que es imposible de clavar), el retorno real mediano es bastante menor. Sigue siendo positivo casi todos los años, pero hay que dimensionarlo bien.',
  },

  wintersday: {
    engine:
      'El espejo de Halloween en invierno. Los Wintersday Gift se abren por millones buscando la infusión gorda, y cada gift suelta copos y bastones de caramelo que hunden el mercado de esos materiales.',
    mechanics: [
      {
        container: 'Wintersday Gift',
        containerItemId: 77604,
        source: 'Vendor por karma, actividades del festival, minijuegos y cofres del evento.',
        floods:
          'Snowflake, Candy Cane, bebidas y tónicos del festival; en la cola rara, infusiones (Winter\'s Heart, Snow Diamond, Toy-Shell), minis y recetas.',
        effect:
          'Los copos se desploman durante el evento y se recuperan a lo largo del año. Las infusiones caras del festival sufren el dumping de los pocos ganadores mientras el evento está activo.',
      },
    ],
    baronPlay:
      'Mismo patrón que Halloween: comprar copos y caramelo barato al cierre del festival y venderlos a mitad de año. Y cazar las infusiones de Wintersday mientras los ganadores las liquidan — son el ítem de mayor valor unitario que se abarata en todo el festival.',
    trap:
      'Abrir gifts en masa esperando la Snow Diamond Infusion. En promedio conviene más vender los gifts que abrirlos — y son justamente los que sí los abren los que te dejan comprar barato.',
  },
}
