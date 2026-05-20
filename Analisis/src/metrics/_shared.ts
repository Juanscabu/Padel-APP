// Helpers internos del módulo de métricas. Lo importan los otros archivos
// de `src/metrics/`.

import { Shot } from "../parser/types";

// Agrupa todos los shots por puntoId y devuelve los grupos ordenados por
// puntoId asc. Cada grupo ya viene con sus shots ordenados por golpeId.
export function shotsGroupedByPoint(
  shots: Shot[],
): Array<{ puntoId: number; shots: Shot[] }> {
  const groups: Record<number, Shot[]> = {};
  for (const s of shots) {
    (groups[s.puntoId] ??= []).push(s);
  }
  return Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)
    .map((puntoId) => ({
      puntoId,
      shots: [...groups[puntoId]].sort((a, b) => a.golpeId - b.golpeId),
    }));
}
