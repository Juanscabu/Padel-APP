// Labels y colores para valores conocidos. Si el JSON trae un valor
// nuevo (tipo de golpe, dirección, resultado), los helpers caen al
// string crudo capitalizado. Nunca rompen.

const SHOT_TYPE_LABELS: Record<string, string> = {
  drive: "Drive",
  reves: "Revés",
  volea: "Volea",
  bandeja: "Bandeja/Víbora",
  bajada: "Bajada de Pared",
  salida: "Salida de Pared",
  smash: "Smash",
  globo: "Globo",
  saque: "Saque",
  chiquita: "Chiquita",
  dejada: "Dejada",
  contra_pared: "Contra Pared",
  x3: "X3",
  x4: "X4",
  otro: "Otro",
};

const DIRECTION_LABELS: Record<string, string> = {
  cruzado: "Cruzado",
  paralelo: "Paralelo",
  medio: "Medio",
  // Partidos viejos guardaron "centro"; el parser los normaliza, este
  // fallback queda por si algún shot legacy no pasa por parseMatch.
  centro: "Medio",
  "cuerpo drive": "Cuerpo Drive",
  "cuerpo reves": "Cuerpo Revés",
  reja: "Reja",
  desconocida: "Desconocida",
};

const RESULT_LABELS: Record<string, string> = {
  winner: "Winner",
  error: "Error",
  error_forzado: "Error forzado",
  error_no_forzado: "Error no forzado",
  en_juego: "En juego",
  falta: "Falta",
  doble_falta: "Doble falta",
};

export function shotTypeLabel(id: string): string {
  return SHOT_TYPE_LABELS[id] ?? capitalize(id);
}

export function directionLabel(id: string): string {
  return DIRECTION_LABELS[id] ?? capitalize(id);
}

export function resultLabel(id: string): string {
  return RESULT_LABELS[id] ?? capitalize(id);
}

const SIDE_LABELS: Record<string, string> = {
  drive: "Drive",
  reves: "Revés",
};

export function sideLabel(id: string): string {
  return SIDE_LABELS[id] ?? capitalize(id);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
