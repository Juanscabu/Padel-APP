// 📊 Línea de tiempo: diferencia acumulada de puntos punto a punto.
// Permite ver momentum y rachas.

import { Match, PlayerId, Team } from "../parser/types";
import { computePoints, PuntoCerrado } from "./points";

export interface TimelinePoint {
  puntoId: number;
  ganador: Team;
  cerradoPor: PlayerId;
  resultadoCierre: string;
  acumA: number;
  acumB: number;
  diferencia: number; // A - B
}

export interface TimelineStats {
  serie: TimelinePoint[];
  puntos: PuntoCerrado[]; // referencia a los puntos completos para drill-down
}

export function computeTimeline(match: Match): TimelineStats {
  const points = computePoints(match);
  let a = 0;
  let b = 0;
  const serie: TimelinePoint[] = [];
  for (const p of points.puntos) {
    if (p.ganador === "A") a += 1;
    else b += 1;
    serie.push({
      puntoId: p.puntoId,
      ganador: p.ganador,
      cerradoPor: p.cerradoPor,
      resultadoCierre: p.resultadoCierre,
      acumA: a,
      acumB: b,
      diferencia: a - b,
    });
  }
  return { serie, puntos: points.puntos };
}
