// Sección 5 — Mapa de direcciones. Barras horizontales + matriz por jugador.

import { computeDirections } from "../metrics/directions";
import { Match, PlayerId } from "../parser/types";
import { HorizontalBarChart, HBarItem } from "../components/charts/HorizontalBarChart";
import { Section } from "../components/Section";
import { PLAYER_COLORS, colorForKey } from "../utils/colors";
import { directionLabel } from "../utils/labels";

interface Props {
  match: Match;
}

export function DirectionsSection({ match }: Props) {
  const stats = computeDirections(match);
  const ids: PlayerId[] = ["J1", "J2", "J3", "J4"];

  const globalData: HBarItem[] = stats.global.map((d) => ({
    label: directionLabel(d.direccion),
    value: d.total,
    color: colorForKey("dir:" + d.direccion),
  }));

  return (
    <Section
      id="directions"
      title="Mapa de direcciones"
      subtitle="A dónde fueron los golpes — globalmente y por jugador"
    >
      <div className="chart-grid">
        <div className="chart-card chart-card--wide">
          <h3 className="chart-card__title">Distribución global</h3>
          <HorizontalBarChart data={globalData} valueLabel="Golpes" />
        </div>
      </div>

      <div className="direction-matrix">
        <h3 className="chart-card__title">Detalle por jugador</h3>
        <table>
          <thead>
            <tr>
              <th>Dirección</th>
              {ids.map((id) => (
                <th key={id} style={{ color: PLAYER_COLORS[id] }}>
                  {id} {match.players[id].nombre}
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {stats.detalle.map((row) => (
              <tr key={row.direccion}>
                <td>{directionLabel(row.direccion)}</td>
                {ids.map((id) => (
                  <td key={id}>{row.porJugador[id]}</td>
                ))}
                <td className="cell--total">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
