// 📊 Mapa de direcciones: cuántos golpes fueron en cada dirección,
// globalmente y por jugador.

import { Match, PlayerId } from "../parser/types";

export interface DirectionRow {
  direccion: string;
  total: number;
  porJugador: Record<PlayerId, number>;
}

export interface DirectionsStats {
  global: Array<{ direccion: string; total: number }>;
  detalle: DirectionRow[]; // pivote dirección × jugador
}

export function computeDirections(match: Match): DirectionsStats {
  const global: Record<string, number> = {};
  const matriz: Record<string, Record<PlayerId, number>> = {};

  for (const s of match.shots) {
    global[s.direccion] = (global[s.direccion] ?? 0) + 1;
    const row =
      matriz[s.direccion] ??
      (matriz[s.direccion] = { J1: 0, J2: 0, J3: 0, J4: 0 });
    row[s.jugador] += 1;
  }

  const detalle: DirectionRow[] = Object.entries(matriz)
    .map(([direccion, porJugador]) => ({
      direccion,
      total: global[direccion],
      porJugador,
    }))
    .sort((a, b) => b.total - a.total);

  const globalArr = Object.entries(global)
    .map(([direccion, total]) => ({ direccion, total }))
    .sort((a, b) => b.total - a.total);

  return { global: globalArr, detalle };
}
