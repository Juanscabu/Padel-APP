// Sección 4 — Línea de tiempo. Punto clickeable abre el detalle del rally.

import { useState } from "react";
import { computeTimeline } from "../metrics/timeline";
import { Match } from "../parser/types";
import { Section } from "../components/Section";
import { TimelineChart } from "../components/charts/TimelineChart";
import { PLAYER_COLORS, RESULT_COLORS, colorForKey } from "../utils/colors";
import { directionLabel, resultLabel, shotTypeLabel } from "../utils/labels";

interface Props {
  match: Match;
}

export function TimelineSection({ match }: Props) {
  const { serie, puntos } = computeTimeline(match);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedPunto = puntos.find((p) => p.puntoId === selected) ?? null;

  return (
    <Section
      id="timeline"
      title="Momentum del partido"
      subtitle="Diferencia acumulada A - B. Hacé click en el gráfico para ver el rally."
    >
      <TimelineChart serie={serie} onPointClick={setSelected} />

      {selectedPunto && (
        <div className="rally-detail">
          <div className="rally-detail__header">
            <h3>Punto #{selectedPunto.puntoId}</h3>
            <button className="btn" onClick={() => setSelected(null)}>
              Cerrar
            </button>
          </div>
          <div className="rally-detail__meta">
            Ganó el equipo <strong>{selectedPunto.ganador}</strong> · Cerrado por{" "}
            <strong style={{ color: PLAYER_COLORS[selectedPunto.cerradoPor] }}>
              {selectedPunto.cerradoPor} {match.players[selectedPunto.cerradoPor].nombre}
            </strong>{" "}
            ({resultLabel(selectedPunto.resultadoCierre)})
          </div>
          <table className="rally-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Tipo</th>
                <th>Dirección</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {selectedPunto.shots.map((s) => (
                <tr key={s.golpeId}>
                  <td>{s.golpeId}</td>
                  <td style={{ color: PLAYER_COLORS[s.jugador] }}>
                    {s.jugador} {match.players[s.jugador].nombre}
                  </td>
                  <td>{shotTypeLabel(s.tipoGolpe)}</td>
                  <td>{directionLabel(s.direccion)}</td>
                  <td
                    style={{
                      color:
                        RESULT_COLORS[s.resultado] ?? colorForKey(s.resultado),
                    }}
                  >
                    {resultLabel(s.resultado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
