// Evolución del marcador por GAMES acumulados. Para cada game cerrado
// emite un punto con la cuenta acumulada por equipo. Detecta cierres
// comparando el snapshot del marcador (pt_start_games_a/b + pt_start_sets_a/b
// guardado en cada primer saque) entre puntos consecutivos: si el game
// o set cambia, el punto anterior cerró un game.

import { Match } from "../parser/types";
import { shotsGroupedByPoint } from "./_shared";

export interface FlowPoint {
  game: number;
  A: number;
  B: number;
}

interface PuntoData {
  snapshot: { games_a: number; games_b: number; sets_a: number; sets_b: number };
  pts: { a: number; b: number };
  ganador: "A" | "B";
}

export function computeMatchFlow(match: Match): FlowPoint[] {
  const data = collectPuntos(match);
  let totalA = 0;
  let totalB = 0;
  const flow: FlowPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const curr = data[i];
    const next = data[i + 1];
    const cerroGame = next ? gameClosedBetween(curr, next) : lastPointClosedGame(curr);
    if (!cerroGame) continue;
    if (curr.ganador === "A") totalA += 1;
    else totalB += 1;
    flow.push({ game: flow.length + 1, A: totalA, B: totalB });
  }
  return flow;
}

function gameClosedBetween(curr: PuntoData, next: PuntoData): boolean {
  // Set nuevo: los games del set se resetean a 0 pero sets_a/b sube. Eso
  // también es un game cerrado (el último del set anterior).
  if (next.snapshot.sets_a > curr.snapshot.sets_a) return true;
  if (next.snapshot.sets_b > curr.snapshot.sets_b) return true;
  // Cambio de games dentro del mismo set.
  if (next.snapshot.games_a > curr.snapshot.games_a) return true;
  if (next.snapshot.games_b > curr.snapshot.games_b) return true;
  return false;
}

// Para el último punto registrado no hay snapshot siguiente. Inferimos
// con el score al INICIO del punto: si el ganador llegaba a 40, o si
// estaban en punto de oro, el punto cerró un game.
function lastPointClosedGame(curr: PuntoData): boolean {
  const { a, b } = curr.pts;
  if (a === 40 && b === 40) return true;
  if (curr.ganador === "A" && a === 40) return true;
  if (curr.ganador === "B" && b === 40) return true;
  return false;
}

function collectPuntos(match: Match): PuntoData[] {
  const out: PuntoData[] = [];
  for (const { shots } of shotsGroupedByPoint(match.shots)) {
    const first = shots[0];
    const cierre = shots[shots.length - 1];
    if (cierre.equipoGanadorPunto !== "A" && cierre.equipoGanadorPunto !== "B") continue;
    out.push({
      snapshot: {
        games_a: numOf(first.extras["pt_start_games_a"]),
        games_b: numOf(first.extras["pt_start_games_b"]),
        sets_a: numOf(first.extras["pt_start_sets_a"]),
        sets_b: numOf(first.extras["pt_start_sets_b"]),
      },
      pts: {
        a: numOf(first.extras["pt_start_pts_a"]),
        b: numOf(first.extras["pt_start_pts_b"]),
      },
      ganador: cierre.equipoGanadorPunto,
    });
  }
  return out;
}

function numOf(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
