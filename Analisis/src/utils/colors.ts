// Paleta única para colores de equipos, jugadores y resultados.
// Cambiar acá se propaga a todo el dashboard.

import { PlayerId, Team } from "../parser/types";

export const TEAM_COLORS: Record<Team, string> = {
  A: "#569cd6", // azul
  B: "#ce9178", // naranja
};

export const PLAYER_COLORS: Record<PlayerId, string> = {
  J1: "#3a7bd5", // azul oscuro
  J2: "#7ec0ee", // celeste
  J3: "#d96f3a", // naranja oscuro
  J4: "#f0b75c", // ámbar
};

export const RESULT_COLORS: Record<string, string> = {
  winner: "#73c990",
  error: "#f48771",
  en_juego: "#888888",
  falta: "#dcdcaa",
  doble_falta: "#f48771",
};

// Paleta de respaldo para valores desconocidos (tipos de golpe nuevos,
// direcciones nuevas, etc). Hashea el string al índice del array.
const FALLBACK_PALETTE = [
  "#4ec9b0",
  "#c586c0",
  "#dcdcaa",
  "#9cdcfe",
  "#ce9178",
  "#b5cea8",
  "#d4d4d4",
  "#569cd6",
  "#f48771",
  "#73c990",
];

export function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

export function resultColor(result: string): string {
  return RESULT_COLORS[result] ?? colorForKey(result);
}
