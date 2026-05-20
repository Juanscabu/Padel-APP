// 📊 NUEVA MÉTRICA: agregá una función pura acá si es global del partido.
// Recibe un Match y devuelve un objeto plano listo para visualizar.

import { Match, PlayerId, isErrorResult, isForzado } from "../parser/types";
import { shotsGroupedByPoint } from "./_shared";

export interface OverviewStats {
  totalPuntos: number;
  totalGolpes: number;
  puntosEquipoA: number;
  puntosEquipoB: number;
  totalWinners: number;
  totalErrores: number;
  totalErroresForzados: number;
  totalErroresNoForzados: number;
  jugadorMasGolpes: { id: PlayerId; nombre: string; count: number } | null;
  jugadorMasWinners: { id: PlayerId; nombre: string; count: number } | null;
  jugadorMasErrores: { id: PlayerId; nombre: string; count: number } | null;
  jugadorMasGeneraErrores: { id: PlayerId; nombre: string; count: number } | null;
  erroresGeneradosPorJugador: Record<PlayerId, number>;
}

export function computeOverview(match: Match): OverviewStats {
  let puntosA = 0;
  let puntosB = 0;
  let winners = 0;
  let errores = 0;
  let erroresForzados = 0;
  let erroresNoForzados = 0;

  const golpesPorJugador: Record<string, number> = {};
  const winnersPorJugador: Record<string, number> = {};
  const erroresPorJugador: Record<string, number> = {};

  for (const shot of match.shots) {
    golpesPorJugador[shot.jugador] = (golpesPorJugador[shot.jugador] ?? 0) + 1;
    if (shot.resultado === "winner") {
      winners += 1;
      winnersPorJugador[shot.jugador] = (winnersPorJugador[shot.jugador] ?? 0) + 1;
    }
    if (isErrorResult(shot.resultado)) {
      errores += 1;
      erroresPorJugador[shot.jugador] = (erroresPorJugador[shot.jugador] ?? 0) + 1;
      if (isForzado(shot.resultado)) erroresForzados += 1;
      else erroresNoForzados += 1;
    }
    if (shot.equipoGanadorPunto === "A") puntosA += 1;
    if (shot.equipoGanadorPunto === "B") puntosB += 1;
  }

  const generados = computeErroresGenerados(match);

  return {
    totalPuntos: match.puntosCerrados,
    totalGolpes: match.totalGolpes,
    puntosEquipoA: puntosA,
    puntosEquipoB: puntosB,
    totalWinners: winners,
    totalErrores: errores,
    totalErroresForzados: erroresForzados,
    totalErroresNoForzados: erroresNoForzados,
    jugadorMasGolpes: topPlayer(match, golpesPorJugador),
    jugadorMasWinners: topPlayer(match, winnersPorJugador),
    jugadorMasErrores: topPlayer(match, erroresPorJugador),
    jugadorMasGeneraErrores: topPlayer(match, generados),
    erroresGeneradosPorJugador: generados,
  };
}

// Para cada error_forzado, busca dentro del mismo punto el último golpe
// anterior (mayor golpe_id < el del error) del equipo rival al que erra,
// y le atribuye +1. Si no hay golpe rival registrado en el rally (ej.
// error en devolución del saque sin shots intermedios), no atribuye a
// nadie — preferimos perder la atribución antes que inventarla.
function computeErroresGenerados(match: Match): Record<PlayerId, number> {
  const counts: Record<PlayerId, number> = { J1: 0, J2: 0, J3: 0, J4: 0 };
  for (const { shots } of shotsGroupedByPoint(match.shots)) {
    for (let i = 0; i < shots.length; i++) {
      const err = shots[i];
      if (!isForzado(err.resultado)) continue;
      for (let j = i - 1; j >= 0; j--) {
        const prev = shots[j];
        if (prev.equipo !== err.equipo) {
          counts[prev.jugador] += 1;
          break;
        }
      }
    }
  }
  return counts;
}

function topPlayer(match: Match, counts: Record<string, number>) {
  let topId: PlayerId | null = null;
  let topCount = 0;
  for (const [id, n] of Object.entries(counts)) {
    if (n > topCount) {
      topId = id as PlayerId;
      topCount = n;
    }
  }
  if (!topId) return null;
  return { id: topId, nombre: match.players[topId].nombre, count: topCount };
}
