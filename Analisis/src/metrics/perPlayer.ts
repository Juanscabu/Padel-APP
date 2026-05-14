// 📊 NUEVA MÉTRICA por jugador: agregá un campo en PlayerStats y
// poblalo en computePlayerStats. Cada métrica se computa en un solo
// pase de los shots — agregá la lógica al loop existente.

import { Match, PlayerId, Shot, isErrorResult, isForzado } from "../parser/types";

export interface CountMap {
  [key: string]: number;
}

// Tipos de golpe considerados "ofensivos" para la métrica de eficiencia.
// Editá este set si cambia la definición.
const OFFENSIVE_SHOT_TYPES = new Set(["smash", "x3", "x4", "bandeja", "volea"]);

export interface SideBreakdown {
  total: number;
  winners: number;
  errores: number;
  erroresForzados: number;
  erroresNoForzados: number;
  erroresGenerados: number;
  enJuego: number;
}

export interface ShotTypeBreakdown {
  tipo: string;
  winners: number;
  errores: number;
  // Desglose de "errores" cometidos en este tipo de golpe.
  erroresForzadosCometidos: number;
  erroresNoForzadosCometidos: number;
  enJuego: number;
  total: number;
  // Conteo de direcciones de este tipo de golpe (cruzado, paralelo, medio,
  // cuerpo drive, cuerpo reves, reja, desconocida).
  porDireccion: CountMap;
  // Desglose por lado (drive / revés) para tipos que llevan el flag lado
  // en extras. Para los que no aplica (drive, revés como tipo, saque),
  // queda vacío. Útil para ver, p.ej., qué tan rentable es la volea de
  // revés vs la de drive.
  porLado: Record<string, SideBreakdown>;
  // Errores generados: errores forzados del rival atribuidos a este
  // tipo de golpe del jugador (último golpe antes del error_forzado).
  erroresGenerados: number;
  // Calculados pero no visibles en UI. Quedan para reactivar si vuelve
  // a ser útil mostrarlos.
  conPared: number;
  sinPared: number;
}

export interface PlayerStats {
  id: PlayerId;
  nombre: string;
  totalGolpes: number;
  golpesPorTipo: CountMap;
  golpesPorDireccion: CountMap;
  winners: number;
  errores: number;
  erroresForzados: number;
  erroresNoForzados: number;
  erroresGenerados: number;
  enJuego: number;
  pctWinners: number;
  pctErrores: number;
  pctEnJuego: number;
  // Conteo de golpes que llevan el flag con_pared (drive, revés, globo,
  // chiquita). Los tipos que no aplican no se incluyen en ninguno.
  // Calculados pero no visibles en UI hoy; quedan disponibles si vuelve
  // a ser útil mostrarlos.
  golpesConPared: number;
  golpesSinPared: number;
  // Eficiencia al saque: puntos jugados / ganados cuando ESTE jugador sacó,
  // separados según el rally se haya cerrado con 1º o 2º saque.
  puntosServidosPrimerSaque: number;
  puntosServidosSegundoSaque: number;
  puntosGanadosPrimerSaque: number;
  puntosGanadosSegundoSaque: number;
  pctPuntosGanadosPrimerSaque: number;
  pctPuntosGanadosSegundoSaque: number;
  // Eficiencia ofensiva: % de golpes ofensivos decisivos productivos.
  //   (winners + generados) / (winners + generados + no_forzados)
  // calculado solo sobre OFFENSIVE_SHOT_TYPES. Denominador excluye los
  // golpes que siguieron en juego — solo cuenta los que decidieron algo.
  winnersOfensivos: number;
  erroresGeneradosOfensivos: number;
  erroresNoForzadosOfensivosCometidos: number;
  pctEficienciaOfensiva: number;
  // Devolución del saque (resto): solo cuenta golpes marcados con
  // es_resto: true (primer golpe del jugador tras un saque del rival).
  totalRestos: number;
  restosWinner: number;
  restosError: number;
  restosEnJuego: number;
  pctRestoWinner: number;
  pctRestoError: number;
  pctRestoEnJuego: number;
  // Para el gráfico de "winners vs errores vs en juego por tipo"
  breakdownPorTipo: ShotTypeBreakdown[];
}

export function computePlayerStats(match: Match, jugador: PlayerId): PlayerStats {
  const shots = match.shots.filter((s) => s.jugador === jugador);
  const total = shots.length;

  const tipos: CountMap = {};
  const direcciones: CountMap = {};
  const breakdown: Record<string, ShotTypeBreakdown> = {};

  let winners = 0;
  let errores = 0;
  let erroresForzados = 0;
  let erroresNoForzados = 0;
  let enJuego = 0;
  let golpesConPared = 0;
  let golpesSinPared = 0;
  let winnersOfensivos = 0;
  let erroresNoForzadosOfensivos = 0;

  for (const s of shots) {
    tipos[s.tipoGolpe] = (tipos[s.tipoGolpe] ?? 0) + 1;
    direcciones[s.direccion] = (direcciones[s.direccion] ?? 0) + 1;

    const b =
      breakdown[s.tipoGolpe] ??
      (breakdown[s.tipoGolpe] = {
        tipo: s.tipoGolpe,
        winners: 0,
        errores: 0,
        erroresForzadosCometidos: 0,
        erroresNoForzadosCometidos: 0,
        enJuego: 0,
        total: 0,
        porDireccion: {},
        porLado: {},
        erroresGenerados: 0,
        conPared: 0,
        sinPared: 0,
      });
    b.total += 1;
    b.porDireccion[s.direccion] = (b.porDireccion[s.direccion] ?? 0) + 1;
    if (s.resultado === "winner") {
      winners += 1;
      b.winners += 1;
    } else if (isErrorResult(s.resultado)) {
      errores += 1;
      b.errores += 1;
      if (isForzado(s.resultado)) {
        erroresForzados += 1;
        b.erroresForzadosCometidos += 1;
      } else {
        erroresNoForzados += 1;
        b.erroresNoForzadosCometidos += 1;
      }
    } else {
      enJuego += 1;
      b.enJuego += 1;
    }
    const conPared = s.extras["con_pared"];
    if (conPared === true) {
      golpesConPared += 1;
      b.conPared += 1;
    } else if (conPared === false) {
      golpesSinPared += 1;
      b.sinPared += 1;
    }
    const lado = s.extras["lado"];
    if (typeof lado === "string" && lado.length > 0) {
      const sb = (b.porLado[lado] ??= {
        total: 0,
        winners: 0,
        errores: 0,
        erroresForzados: 0,
        erroresNoForzados: 0,
        erroresGenerados: 0,
        enJuego: 0,
      });
      sb.total += 1;
      if (s.resultado === "winner") sb.winners += 1;
      else if (isErrorResult(s.resultado)) {
        sb.errores += 1;
        if (isForzado(s.resultado)) sb.erroresForzados += 1;
        else sb.erroresNoForzados += 1;
      } else sb.enJuego += 1;
    }
    if (OFFENSIVE_SHOT_TYPES.has(s.tipoGolpe)) {
      if (s.resultado === "winner") {
        winnersOfensivos += 1;
      } else if (isErrorResult(s.resultado) && !isForzado(s.resultado)) {
        erroresNoForzadosOfensivos += 1;
      }
    }
  }

  // Stats del resto. Recorrido aparte para mantener el loop principal
  // legible y porque los conteos no aplican a tipos ni breakdowns.
  let totalRestos = 0;
  let restosWinner = 0;
  let restosError = 0;
  let restosEnJuego = 0;
  for (const s of shots) {
    if (s.extras["es_resto"] !== true) continue;
    totalRestos += 1;
    if (s.resultado === "winner") restosWinner += 1;
    else if (isErrorResult(s.resultado)) restosError += 1;
    else restosEnJuego += 1;
  }

  const generados = countErroresGenerados(match, jugador);
  const erroresGenerados = generados.total;
  // Volcar el desglose por tipo en cada bucket (los tipos sin atribución
  // quedan en 0 por la inicialización).
  let erroresGeneradosOfensivos = 0;
  for (const [tipo, n] of Object.entries(generados.porTipo)) {
    const b = breakdown[tipo];
    if (b) b.erroresGenerados = n;
    if (OFFENSIVE_SHOT_TYPES.has(tipo)) erroresGeneradosOfensivos += n;
  }
  // Volcar errores generados por (tipo, lado) en cada sub-bucket.
  for (const [tipo, porLado] of Object.entries(generados.porTipoYLado)) {
    const b = breakdown[tipo];
    if (!b) continue;
    for (const [lado, n] of Object.entries(porLado)) {
      const sb = (b.porLado[lado] ??= {
        total: 0,
        winners: 0,
        errores: 0,
        erroresForzados: 0,
        erroresNoForzados: 0,
        erroresGenerados: 0,
        enJuego: 0,
      });
      sb.erroresGenerados += n;
    }
  }
  const ofensivosProductivos = winnersOfensivos + erroresGeneradosOfensivos;
  const pctEficienciaOfensiva = pct(
    ofensivosProductivos,
    ofensivosProductivos + erroresNoForzadosOfensivos,
  );
  const servicio = computeServiceStats(match, jugador);

  return {
    id: jugador,
    nombre: match.players[jugador].nombre,
    totalGolpes: total,
    golpesPorTipo: tipos,
    golpesPorDireccion: direcciones,
    winners,
    errores,
    erroresForzados,
    erroresNoForzados,
    erroresGenerados,
    enJuego,
    pctWinners: pct(winners, total),
    pctErrores: pct(errores, total),
    pctEnJuego: pct(enJuego, total),
    puntosServidosPrimerSaque: servicio.servidos1,
    puntosServidosSegundoSaque: servicio.servidos2,
    puntosGanadosPrimerSaque: servicio.ganados1,
    puntosGanadosSegundoSaque: servicio.ganados2,
    pctPuntosGanadosPrimerSaque: pct(servicio.ganados1, servicio.servidos1),
    pctPuntosGanadosSegundoSaque: pct(servicio.ganados2, servicio.servidos2),
    winnersOfensivos,
    erroresGeneradosOfensivos,
    erroresNoForzadosOfensivosCometidos: erroresNoForzadosOfensivos,
    pctEficienciaOfensiva,
    totalRestos,
    restosWinner,
    restosError,
    restosEnJuego,
    pctRestoWinner: pct(restosWinner, totalRestos),
    pctRestoError: pct(restosError, totalRestos),
    pctRestoEnJuego: pct(restosEnJuego, totalRestos),
    golpesConPared,
    golpesSinPared,
    breakdownPorTipo: Object.values(breakdown).sort((a, b) => b.total - a.total),
  };
}

// Mira el primer golpe de cada punto: si es un saque del jugador, clasifica
// el rally como jugado con 1º o 2º saque según el resultado del primer
// saque (falta → fue con 2º; cualquier otro → fue con 1º). Cuenta como
// ganado cuando el equipo del sacador se llevó el punto.
function computeServiceStats(match: Match, jugador: PlayerId) {
  const porPunto: Record<number, Shot[]> = {};
  for (const s of match.shots) {
    (porPunto[s.puntoId] ??= []).push(s);
  }
  let servidos1 = 0;
  let servidos2 = 0;
  let ganados1 = 0;
  let ganados2 = 0;
  for (const shots of Object.values(porPunto)) {
    const ordered = [...shots].sort((a, b) => a.golpeId - b.golpeId);
    const primero = ordered[0];
    if (!primero || primero.tipoGolpe !== "saque" || primero.jugador !== jugador) continue;
    const cierre = ordered[ordered.length - 1];
    if (!cierre.equipoGanadorPunto) continue;
    const seJugoCon2 = primero.resultado === "falta";
    const sacadorGano = cierre.equipoGanadorPunto === primero.equipo;
    if (seJugoCon2) {
      servidos2 += 1;
      if (sacadorGano) ganados2 += 1;
    } else {
      servidos1 += 1;
      if (sacadorGano) ganados1 += 1;
    }
  }
  return { servidos1, servidos2, ganados1, ganados2 };
}

// Errores generados: errores forzados del rival atribuidos a `jugador`
// por ser el último del equipo opuesto que tocó la pelota antes del
// error. Devuelve total + desglose por tipo del golpe que los generó,
// y un sub-desglose por lado (drive/revés) cuando el golpe lo trae.
function countErroresGenerados(
  match: Match,
  jugador: PlayerId,
): { total: number; porTipo: CountMap; porTipoYLado: Record<string, CountMap> } {
  const porPunto: Record<number, Shot[]> = {};
  for (const s of match.shots) {
    (porPunto[s.puntoId] ??= []).push(s);
  }
  let total = 0;
  const porTipo: CountMap = {};
  const porTipoYLado: Record<string, CountMap> = {};
  for (const shots of Object.values(porPunto)) {
    const ordered = [...shots].sort((a, b) => a.golpeId - b.golpeId);
    for (let i = 0; i < ordered.length; i++) {
      const err = ordered[i];
      if (!isForzado(err.resultado)) continue;
      for (let j = i - 1; j >= 0; j--) {
        const prev = ordered[j];
        if (prev.equipo !== err.equipo) {
          if (prev.jugador === jugador) {
            total += 1;
            porTipo[prev.tipoGolpe] = (porTipo[prev.tipoGolpe] ?? 0) + 1;
            const lado = prev.extras["lado"];
            if (typeof lado === "string" && lado.length > 0) {
              const m = (porTipoYLado[prev.tipoGolpe] ??= {});
              m[lado] = (m[lado] ?? 0) + 1;
            }
          }
          break;
        }
      }
    }
  }
  return { total, porTipo, porTipoYLado };
}

export function computeAllPlayerStats(match: Match): PlayerStats[] {
  const ids: PlayerId[] = ["J1", "J2", "J3", "J4"];
  return ids.map((id) => computePlayerStats(match, id));
}

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 1000) / 10;
}

// Helpers expuestos por si los necesita otra capa (ej: ordenar por valor)
export function sortedCountEntries(map: CountMap): Array<[string, number]> {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

// Filtro pequeño compartido — útil si más adelante se agregan métricas
// específicas a winners.
export function isWinner(s: Shot) {
  return s.resultado === "winner";
}
