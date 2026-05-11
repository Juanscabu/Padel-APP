// 📊 NUEVA MÉTRICA por jugador: agregá un campo en PlayerStats y
// poblalo en computePlayerStats. Cada métrica se computa en un solo
// pase de los shots — agregá la lógica al loop existente.

import { Match, PlayerId, Shot } from "../parser/types";

export interface CountMap {
  [key: string]: number;
}

export interface ShotTypeBreakdown {
  tipo: string;
  winners: number;
  errores: number;
  enJuego: number;
  total: number;
}

export interface PlayerStats {
  id: PlayerId;
  nombre: string;
  totalGolpes: number;
  golpesPorTipo: CountMap;
  golpesPorDireccion: CountMap;
  winners: number;
  errores: number;
  enJuego: number;
  pctWinners: number;
  pctErrores: number;
  pctEnJuego: number;
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
  let enJuego = 0;

  for (const s of shots) {
    tipos[s.tipoGolpe] = (tipos[s.tipoGolpe] ?? 0) + 1;
    direcciones[s.direccion] = (direcciones[s.direccion] ?? 0) + 1;

    const b =
      breakdown[s.tipoGolpe] ??
      (breakdown[s.tipoGolpe] = {
        tipo: s.tipoGolpe,
        winners: 0,
        errores: 0,
        enJuego: 0,
        total: 0,
      });
    b.total += 1;
    if (s.resultado === "winner") {
      winners += 1;
      b.winners += 1;
    } else if (s.resultado === "error") {
      errores += 1;
      b.errores += 1;
    } else {
      enJuego += 1;
      b.enJuego += 1;
    }
  }

  return {
    id: jugador,
    nombre: match.players[jugador].nombre,
    totalGolpes: total,
    golpesPorTipo: tipos,
    golpesPorDireccion: direcciones,
    winners,
    errores,
    enJuego,
    pctWinners: pct(winners, total),
    pctErrores: pct(errores, total),
    pctEnJuego: pct(enJuego, total),
    breakdownPorTipo: Object.values(breakdown).sort((a, b) => b.total - a.total),
  };
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
