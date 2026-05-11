// Modelo interno de la app. Es lo que consumen las capas de Métricas y
// Visualización. El parser es el único lugar autorizado a transformar el
// JSON crudo a esta forma — si el JSON cambia, se toca SOLO el parser.

export type PlayerId = "J1" | "J2" | "J3" | "J4";
export type Team = "A" | "B";

// Los enumerados se mantienen como string (no union estricta) a propósito:
// si el Tracker agrega un tipo_golpe nuevo (ej: "remate_x4"), aparece
// automáticamente en los gráficos sin tocar código. Los helpers de labels
// caen al string crudo si no lo conocen.
export type ShotType = string;
export type Direction = string;
export type Result = "winner" | "error" | "en_juego" | "falta" | "doble_falta" | string;

export interface Shot {
  puntoId: number;
  golpeId: number;
  jugador: PlayerId;
  equipo: Team;
  tipoGolpe: ShotType;
  direccion: Direction;
  resultado: Result;
  equipoGanadorPunto: Team | null;
  timestamp: string;
  // Todo campo no reconocido del JSON queda acá — los componentes pueden
  // mirarlo si conocen la clave. Garantiza tolerancia futura.
  extras: Record<string, unknown>;
}

export interface PlayerInfo {
  id: PlayerId;
  nombre: string;
  equipo: Team;
}

export interface Match {
  schemaVersion: number;
  startedAt: string;
  players: Record<PlayerId, PlayerInfo>;
  shots: Shot[];
  // Información derivada que muchas métricas necesitan
  puntosCerrados: number;
  totalGolpes: number;
}

// ----------------------------------------------------------------------
// Forma cruda del JSON (lo que sale del Tracker). Lo declaramos laxo
// para tolerar campos nuevos / faltantes. El parser hace la validación.
// ----------------------------------------------------------------------
export interface RawShot {
  punto_id?: number;
  golpe_id?: number;
  jugador?: string;
  tipo_golpe?: string;
  direccion?: string;
  resultado?: string;
  equipo_ganador_punto?: string | null;
  timestamp?: string;
  [key: string]: unknown;
}

export interface RawMatch {
  schema_version?: number;
  started_at?: string;
  players?: Record<string, string>;
  shots?: RawShot[];
  [key: string]: unknown;
}
