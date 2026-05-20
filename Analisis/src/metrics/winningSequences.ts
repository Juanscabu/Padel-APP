// Secuencias de 3 golpes consecutivos (equipo X → rival → equipo X) que
// terminan en punto a favor del equipo X. El tercer golpe puede ser:
//   - winner directo, o
//   - en_juego, seguido por error forzado del rival en el golpe siguiente.
// Los dos golpes del equipo X pueden ser del mismo jugador o de los dos
// de la pareja (cualquier combinación cuenta).

import { Match, Team, isForzado } from "../parser/types";
import { shotsGroupedByPoint } from "./_shared";

export interface Sequence3Stat {
  team: Team;
  sequence: [string, string, string]; // tipos del golpe en orden
  count: number;
}

export interface WinningSequencesStats {
  porEquipo: Record<Team, Sequence3Stat[]>; // ordenadas por count desc
}

export function computeWinningSequences(match: Match): WinningSequencesStats {
  // key = "A|tipo1|tipo2|tipo3" → count
  const counts: Record<string, number> = {};

  for (const { shots } of shotsGroupedByPoint(match.shots)) {
    for (let i = 0; i + 2 < shots.length; i++) {
      const a = shots[i];
      const b = shots[i + 1];
      const c = shots[i + 2];
      // Patrón equipo → rival → mismo equipo
      if (a.equipo !== c.equipo) continue;
      if (b.equipo === a.equipo) continue;

      let exitosa = false;
      if (c.resultado === "winner") {
        exitosa = true;
      } else if (c.resultado === "en_juego") {
        const next = shots[i + 3];
        if (next && next.equipo !== c.equipo && isForzado(next.resultado)) {
          exitosa = true;
        }
      }
      if (!exitosa) continue;

      const key = `${a.equipo}|${a.tipoGolpe}|${b.tipoGolpe}|${c.tipoGolpe}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  const porEquipo: Record<Team, Sequence3Stat[]> = { A: [], B: [] };
  for (const [key, count] of Object.entries(counts)) {
    const [team, t1, t2, t3] = key.split("|") as [Team, string, string, string];
    porEquipo[team].push({ team, sequence: [t1, t2, t3], count });
  }
  porEquipo.A.sort((x, y) => y.count - x.count);
  porEquipo.B.sort((x, y) => y.count - x.count);
  return { porEquipo };
}
