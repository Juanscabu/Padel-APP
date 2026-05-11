// Sección 3 — Análisis de puntos.

import { computePoints } from "../metrics/points";
import { Match, PlayerId } from "../parser/types";
import { DonutChart, DonutItem } from "../components/charts/DonutChart";
import { HorizontalBarChart, HBarItem } from "../components/charts/HorizontalBarChart";
import { Histogram } from "../components/charts/Histogram";
import { KpiCard } from "../components/KpiCard";
import { Section } from "../components/Section";
import { PLAYER_COLORS, RESULT_COLORS } from "../utils/colors";

interface Props {
  match: Match;
}

export function PointsSection({ match }: Props) {
  const stats = computePoints(match);

  const distribucion: DonutItem[] = [
    {
      label: "Por winner",
      value: stats.totalWinnersComoCierre,
      color: RESULT_COLORS.winner,
    },
    {
      label: "Por error",
      value: stats.totalErroresComoCierre,
      color: RESULT_COLORS.error,
    },
  ].filter((d) => d.value > 0);

  const ids: PlayerId[] = ["J1", "J2", "J3", "J4"];
  const winnersData: HBarItem[] = ids.map((id) => ({
    label: `${id} · ${match.players[id].nombre}`,
    value: stats.winnersPorJugador[id],
    color: PLAYER_COLORS[id],
  }));
  const erroresData: HBarItem[] = ids.map((id) => ({
    label: `${id} · ${match.players[id].nombre}`,
    value: stats.erroresPorJugador[id],
    color: PLAYER_COLORS[id],
  }));

  return (
    <Section
      id="points"
      title="Análisis de puntos"
      subtitle="Cómo se cerraron los puntos y qué tan largos fueron"
    >
      <div className="kpi-grid">
        <KpiCard label="Longitud promedio" value={`${stats.longitudPromedio}`} sublabel="golpes / punto" />
        <KpiCard label="Puntos por winner" value={stats.totalWinnersComoCierre} accent={RESULT_COLORS.winner} />
        <KpiCard label="Puntos por error" value={stats.totalErroresComoCierre} accent={RESULT_COLORS.error} />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card__title">Cierre de puntos</h3>
          <DonutChart data={distribucion} />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Winners directos por jugador</h3>
          <HorizontalBarChart data={winnersData} />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Errores decisivos por jugador</h3>
          <HorizontalBarChart data={erroresData} />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Duración de los puntos</h3>
          <Histogram data={stats.histogramaLongitud} />
        </div>
      </div>
    </Section>
  );
}
