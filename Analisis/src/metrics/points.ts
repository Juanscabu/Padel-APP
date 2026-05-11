// 📊 Análisis de puntos: distribución, cierres, duración.

import { Match, PlayerId, Shot, Team } from "../parser/types";

export interface PuntoCerrado {
  puntoId: number;
  ganador: Team;
  cerradoPor: PlayerId;
  resultadoCierre: string; // 'winner' | 'error' | etc.
  longitud: number; // cantidad de golpes en el rally
  shots: Shot[];
}

export interface PointsStats {
  puntos: PuntoCerrado[];
  totalWinnersComoCierre: number;
  totalErroresComoCierre: number;
  winnersPorJugador: Record<PlayerId, number>;
  erroresPorJugador: Record<PlayerId, number>;
  longitudPromedio: number;
  histogramaLongitud: Array<{ longitud: number; cantidad: number }>;
}

export function computePoints(match: Match): PointsStats {
  const grouped = groupByPunto(match.shots);
  const puntos: PuntoCerrado[] = [];

  for (const [puntoIdStr, shots] of Object.entries(grouped)) {
    const ordered = [...shots].sort((a, b) => a.golpeId - b.golpeId);
    const cierre = ordered[ordered.length - 1];
    if (!cierre || cierre.equipoGanadorPunto === null) continue;
    puntos.push({
      puntoId: Number(puntoIdStr),
      ganador: cierre.equipoGanadorPunto,
      cerradoPor: cierre.jugador,
      resultadoCierre: cierre.resultado,
      longitud: ordered.length,
      shots: ordered,
    });
  }
  puntos.sort((a, b) => a.puntoId - b.puntoId);

  const winnersPorJugador = emptyPlayerCount();
  const erroresPorJugador = emptyPlayerCount();
  let totalWinners = 0;
  let totalErrores = 0;

  for (const p of puntos) {
    if (p.resultadoCierre === "winner") {
      totalWinners += 1;
      winnersPorJugador[p.cerradoPor] += 1;
    } else if (p.resultadoCierre === "error") {
      totalErrores += 1;
      erroresPorJugador[p.cerradoPor] += 1;
    }
  }

  const longitudes = puntos.map((p) => p.longitud);
  const longitudPromedio =
    longitudes.length === 0
      ? 0
      : Math.round((longitudes.reduce((a, b) => a + b, 0) / longitudes.length) * 10) / 10;

  return {
    puntos,
    totalWinnersComoCierre: totalWinners,
    totalErroresComoCierre: totalErrores,
    winnersPorJugador,
    erroresPorJugador,
    longitudPromedio,
    histogramaLongitud: buildHistogram(longitudes),
  };
}

function groupByPunto(shots: Shot[]): Record<number, Shot[]> {
  const out: Record<number, Shot[]> = {};
  for (const s of shots) {
    (out[s.puntoId] ??= []).push(s);
  }
  return out;
}

function emptyPlayerCount(): Record<PlayerId, number> {
  return { J1: 0, J2: 0, J3: 0, J4: 0 };
}

function buildHistogram(values: number[]): Array<{ longitud: number; cantidad: number }> {
  if (values.length === 0) return [];
  const counts: Record<number, number> = {};
  let max = 0;
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
    if (v > max) max = v;
  }
  const result = [];
  for (let i = 1; i <= max; i++) {
    result.push({ longitud: i, cantidad: counts[i] ?? 0 });
  }
  return result;
}
