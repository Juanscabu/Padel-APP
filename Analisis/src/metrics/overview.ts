// 📊 NUEVA MÉTRICA: agregá una función pura acá si es global del partido.
// Recibe un Match y devuelve un objeto plano listo para visualizar.

import { Match, PlayerId } from "../parser/types";

export interface OverviewStats {
  totalPuntos: number;
  totalGolpes: number;
  puntosEquipoA: number;
  puntosEquipoB: number;
  totalWinners: number;
  totalErrores: number;
  jugadorMasGolpes: { id: PlayerId; nombre: string; count: number } | null;
  jugadorMasWinners: { id: PlayerId; nombre: string; count: number } | null;
  jugadorMasErrores: { id: PlayerId; nombre: string; count: number } | null;
}

export function computeOverview(match: Match): OverviewStats {
  let puntosA = 0;
  let puntosB = 0;
  let winners = 0;
  let errores = 0;

  const golpesPorJugador: Record<string, number> = {};
  const winnersPorJugador: Record<string, number> = {};
  const erroresPorJugador: Record<string, number> = {};

  for (const shot of match.shots) {
    golpesPorJugador[shot.jugador] = (golpesPorJugador[shot.jugador] ?? 0) + 1;
    if (shot.resultado === "winner") {
      winners += 1;
      winnersPorJugador[shot.jugador] = (winnersPorJugador[shot.jugador] ?? 0) + 1;
    }
    if (shot.resultado === "error") {
      errores += 1;
      erroresPorJugador[shot.jugador] = (erroresPorJugador[shot.jugador] ?? 0) + 1;
    }
    if (shot.equipoGanadorPunto === "A") puntosA += 1;
    if (shot.equipoGanadorPunto === "B") puntosB += 1;
  }

  return {
    totalPuntos: match.puntosCerrados,
    totalGolpes: match.totalGolpes,
    puntosEquipoA: puntosA,
    puntosEquipoB: puntosB,
    totalWinners: winners,
    totalErrores: errores,
    jugadorMasGolpes: topPlayer(match, golpesPorJugador),
    jugadorMasWinners: topPlayer(match, winnersPorJugador),
    jugadorMasErrores: topPlayer(match, erroresPorJugador),
  };
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
