// 📊 Métricas de presión: break points y puntos de oro.
//
// Reconstruye el score game-a-game a partir de los puntos cerrados.
// No depende del campo `pt_golden` del JSON (lo ignora a propósito) —
// así funciona también con JSONs viejos del Tracker que no lo traían.
//
// Asume formato pádel con punto de oro (no-ad): el game se cierra en
// cuanto un equipo llega a 4 puntos, sin ventaja. Tiebreak no se
// modela explícitamente — los puntos que caen ahí se cuentan como si
// fueran games regulares, lo cual aproxima razonablemente.

import { Match, Shot, Team } from "../parser/types";
import { shotsGroupedByPoint } from "./_shared";

export interface PressurePointsStats {
  bpChances: Record<Team, number>; // puntos jugados donde el restador podía quebrar
  bpConvertidos: Record<Team, number>; // de los anteriores, los que efectivamente quebraron
  goldenJugados: number; // puntos jugados con 40-40 (punto de oro)
  goldenGanados: Record<Team, number>; // distribución de cómo terminaron
}

interface PointSummary {
  puntoId: number;
  server: Team;
  winner: Team;
  inTiebreak: boolean;
}

export function computePressurePoints(match: Match): PressurePointsStats {
  const points = closedPointsInOrder(match.shots);

  const stats: PressurePointsStats = {
    bpChances: { A: 0, B: 0 },
    bpConvertidos: { A: 0, B: 0 },
    goldenJugados: 0,
    goldenGanados: { A: 0, B: 0 },
  };

  let ptsA = 0;
  let ptsB = 0;
  let currentServer: Team | null = null;
  let lastWasTiebreak = false;

  for (const p of points) {
    // Los puntos de tiebreak tienen reglas distintas (cuenta a 7, alternancia
    // de saque cada 2 puntos). Se saltean del conteo regular — pero hay que
    // resetear el game state al entrar y al salir, para no contaminar games
    // adyacentes con basura del TB.
    if (p.inTiebreak) {
      if (!lastWasTiebreak) {
        ptsA = 0;
        ptsB = 0;
        currentServer = null;
      }
      lastWasTiebreak = true;
      continue;
    }
    if (lastWasTiebreak) {
      ptsA = 0;
      ptsB = 0;
      currentServer = null;
      lastWasTiebreak = false;
    }

    // Cambio de saque ⇒ se cerró el game anterior. Reseteamos el score.
    if (currentServer !== null && currentServer !== p.server) {
      ptsA = 0;
      ptsB = 0;
    }
    currentServer = p.server;

    // Estado ANTES de jugar este punto.
    const returner: Team = p.server === "A" ? "B" : "A";
    const ptsReturner = returner === "A" ? ptsA : ptsB;
    const isGolden = ptsA === 3 && ptsB === 3;
    // Restador en 40 ⇒ si gana este punto, gana el game. Cubre 0-40,
    // 15-40, 30-40 y el punto de oro 40-40 (donde el restador tambien
    // tiene 3 pts).
    const isBreakPoint = ptsReturner === 3;

    if (isBreakPoint) {
      stats.bpChances[returner] += 1;
      if (p.winner === returner) {
        stats.bpConvertidos[returner] += 1;
      }
    }

    if (isGolden) {
      stats.goldenJugados += 1;
      stats.goldenGanados[p.winner] += 1;
    }

    // Aplicar resultado y cerrar game si corresponde.
    if (p.winner === "A") ptsA += 1;
    else ptsB += 1;
    if (ptsA >= 4 || ptsB >= 4) {
      ptsA = 0;
      ptsB = 0;
    }
  }

  return stats;
}

function closedPointsInOrder(shots: Shot[]): PointSummary[] {
  const result: PointSummary[] = [];
  for (const { puntoId, shots: ordered } of shotsGroupedByPoint(shots)) {
    const last = ordered[ordered.length - 1];
    if (!last || last.equipoGanadorPunto === null) continue;
    const saque = ordered.find((s) => s.tipoGolpe === "saque");
    if (!saque) continue;
    // El Tracker pone pt_tiebreak en el primer saque del punto. Si no
    // existe en el JSON (formato viejo), asumimos game regular.
    const firstSaque = ordered.find(
      (s) => s.tipoGolpe === "saque" && (s.extras["saque_numero"] === 1 || s.extras["saque_numero"] === undefined),
    );
    const tbFlag = firstSaque?.extras["pt_tiebreak"];
    result.push({
      puntoId,
      server: saque.equipo,
      winner: last.equipoGanadorPunto,
      inTiebreak: tbFlag === true,
    });
  }
  return result;
}
