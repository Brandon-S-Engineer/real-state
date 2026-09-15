// ── Bóveda: activos duros para inversión a largo plazo ───────────────────────
//
// El oro de barón pesado no sale de flipear commodities (trabajo, techo bajo,
// bots). Sale de PARQUEAR capital en activos que se aprecian y aguantar: Mystic
// Coins, ectos, mats T6, dust — sumideros perpetuos de legendarias con oferta
// acotada. Ej: Mystic Coin ~90s (2017) → ~2g (2026). La estrategia: comprar cada
// activo cuando está BARATO relativo a su propia historia de años, aguantar, y
// vender en el pico del ciclo (o guardar para craftear legendarias).
//
// El motor de oro (los amarillos) genera el capital; esto lo multiplica.

export type InvestAsset = {
  id: number
  category: 'Moneda dura' | 'Input universal' | 'Sumidero T6' | 'Material T6' | 'Upgrade gama alta'
  thesis: string
}

export const INVEST_ASSETS: InvestAsset[] = [
  { id: 19976, category: 'Moneda dura', thesis: 'La reserva de valor del juego. Oferta capada por el login diario, demanda perpetua de legendarias. De ~90s (2017) a ~2g (2026): el activo de acumulación por excelencia.' },
  { id: 19721, category: 'Input universal', thesis: 'Glob of Ectoplasm: se consume en casi todo el ascendido y legendario. Piso durísimo, sube con la inflación del juego.' },
  { id: 24277, category: 'Sumidero T6', thesis: 'Crystalline Dust: sumidero constante de legendarias y Mystic Forge. Cae tras los festivales por sobreoferta — ahí es cuando se acumula.' },
  { id: 24295, category: 'Material T6', thesis: 'Vial of Powerful Blood: demanda de legendarias/ascendido. Toca fondo tras festivales; buen hold barato.' },
  { id: 24283, category: 'Material T6', thesis: 'Powerful Venom Sac: material T6 de legendarias. Ciclo estacional — acumular en el piso.' },
  { id: 24300, category: 'Material T6', thesis: 'Elaborate Totem: material T6 de legendarias. Ciclo estacional — acumular en el piso.' },
  { id: 24289, category: 'Material T6', thesis: 'Armored Scale: material T6 de legendarias. Ciclo estacional — acumular en el piso.' },
  { id: 24358, category: 'Material T6', thesis: 'Ancient Bone: material T6 de legendarias. Ciclo estacional — acumular en el piso.' },
  { id: 24357, category: 'Material T6', thesis: 'Vicious Fang: material T6 de legendarias. Ciclo estacional — acumular en el piso.' },
  { id: 24351, category: 'Material T6', thesis: 'Vicious Claw: material T6 de legendarias. Ciclo estacional — acumular en el piso.' },
  { id: 89216, category: 'Upgrade gama alta', thesis: 'Charm of Skill: componente de sigilos/runas de gama alta. Valor unitario alto y demanda constante de gearing.' },
]

export function investItemIds(): number[] {
  return INVEST_ASSETS.map((a) => a.id)
}
