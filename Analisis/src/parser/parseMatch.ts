// Único lugar que conoce la forma cruda del JSON. Si el Tracker agrega
// un campo nuevo, se incorpora acá y se expone en `extras` del Shot
// para que los componentes lo consuman cuando estén listos.

import {
  Match,
  PlayerId,
  PlayerInfo,
  RawMatch,
  RawShot,
  Shot,
  Team,
} from "./types";

const PLAYER_IDS: PlayerId[] = ["J1", "J2", "J3", "J4"];
const TEAM_OF_PLAYER: Record<PlayerId, Team> = {
  J1: "A",
  J2: "A",
  J3: "B",
  J4: "B",
};

// Campos que se promueven a propiedades tipadas del Shot. Cualquier otra
// clave del RawShot termina en `extras` sin filtrar — eso preserva
// compatibilidad cuando el Tracker agrega campos nuevos.
const KNOWN_SHOT_FIELDS = new Set([
  "punto_id",
  "golpe_id",
  "jugador",
  "tipo_golpe",
  "direccion",
  "resultado",
  "equipo_ganador_punto",
  "timestamp",
]);

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export function parseMatch(raw: unknown): Match {
  if (!raw || typeof raw !== "object") {
    throw new ParseError("El JSON no es un objeto válido");
  }
  const rawMatch = raw as RawMatch;
  if (!Array.isArray(rawMatch.shots)) {
    throw new ParseError("Falta el array 'shots' en el JSON");
  }

  const players = buildPlayers(rawMatch.players);
  const shots = rawMatch.shots
    .map((rs, idx) => parseShot(rs, idx))
    .filter((s): s is Shot => s !== null);

  const puntosCerrados = new Set(
    shots.filter((s) => s.equipoGanadorPunto !== null).map((s) => s.puntoId),
  ).size;

  return {
    schemaVersion: typeof rawMatch.schema_version === "number" ? rawMatch.schema_version : 1,
    startedAt: typeof rawMatch.started_at === "string" ? rawMatch.started_at : "",
    players,
    shots,
    puntosCerrados,
    totalGolpes: shots.length,
  };
}

function buildPlayers(raw?: Record<string, string>): Record<PlayerId, PlayerInfo> {
  const result = {} as Record<PlayerId, PlayerInfo>;
  for (const id of PLAYER_IDS) {
    const nombre = raw && typeof raw[id] === "string" && raw[id].trim() ? raw[id] : id;
    result[id] = { id, nombre, equipo: TEAM_OF_PLAYER[id] };
  }
  return result;
}

function parseShot(raw: RawShot, idx: number): Shot | null {
  const jugador = raw.jugador as PlayerId | undefined;
  // Defensivo: si no hay jugador o no es uno conocido, descarto el shot
  // en silencio. Mejor ignorar entradas malas que romper el dashboard.
  if (!jugador || !PLAYER_IDS.includes(jugador)) return null;

  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_SHOT_FIELDS.has(key)) {
      extras[key] = value;
    }
  }

  return {
    puntoId: typeof raw.punto_id === "number" ? raw.punto_id : idx + 1,
    golpeId: typeof raw.golpe_id === "number" ? raw.golpe_id : 1,
    jugador,
    equipo: TEAM_OF_PLAYER[jugador],
    tipoGolpe: typeof raw.tipo_golpe === "string" ? raw.tipo_golpe : "otro",
    direccion: typeof raw.direccion === "string" ? raw.direccion : "desconocida",
    resultado: typeof raw.resultado === "string" ? raw.resultado : "en_juego",
    equipoGanadorPunto:
      raw.equipo_ganador_punto === "A" || raw.equipo_ganador_punto === "B"
        ? raw.equipo_ganador_punto
        : null,
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : "",
    extras,
  };
}
