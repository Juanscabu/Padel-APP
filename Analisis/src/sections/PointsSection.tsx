// Sección 3 — Análisis de puntos.

import { computePoints } from "../metrics/points";
import { computePressurePoints } from "../metrics/pressurePoints";
import { computeMatchFlow } from "../metrics/matchFlow";
import { computeWinningSequences } from "../metrics/winningSequences";
import { Match, PlayerId } from "../parser/types";
import { shotTypeLabel } from "../utils/labels";
import { DonutChart, DonutItem } from "../components/charts/DonutChart";
import { HorizontalBarChart, HBarItem } from "../components/charts/HorizontalBarChart";
import { LineChart } from "../components/charts/LineChart";
import { MultiLineChart } from "../components/charts/MultiLineChart";
import { KpiCard } from "../components/KpiCard";
import { Section } from "../components/Section";
import { PLAYER_COLORS, RESULT_COLORS, TEAM_COLORS } from "../utils/colors";

interface Props {
  match: Match;
}

export function PointsSection({ match }: Props) {
  const stats = computePoints(match);
  const pressure = computePressurePoints(match);
  const flow = computeMatchFlow(match);
  const sequences = computeWinningSequences(match);
  const topA = sequences.porEquipo.A.slice(0, 5);
  const topB = sequences.porEquipo.B.slice(0, 5);
  const nombresA = `${match.players.J1.nombre} · ${match.players.J2.nombre}`;
  const nombresB = `${match.players.J3.nombre} · ${match.players.J4.nombre}`;

  const bpA = pressure.bpChances.A;
  const bpB = pressure.bpChances.B;
  const bpConvA = pressure.bpConvertidos.A;
  const bpConvB = pressure.bpConvertidos.B;
  const pctA = bpA === 0 ? 0 : Math.round((bpConvA / bpA) * 100);
  const pctB = bpB === 0 ? 0 : Math.round((bpConvB / bpB) * 100);

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
        <KpiCard
          icon="🎯"
          label="Break points · Eq. A"
          value={`${bpConvA} / ${bpA}`}
          sublabel={`${pctA}% convertidos`}
          accent={TEAM_COLORS.A}
        />
        <KpiCard
          icon="🎯"
          label="Break points · Eq. B"
          value={`${bpConvB} / ${bpB}`}
          sublabel={`${pctB}% convertidos`}
          accent={TEAM_COLORS.B}
        />
        <KpiCard
          icon="🥇"
          label="Puntos de oro"
          value={`${pressure.goldenJugados}`}
          sublabel={`A: ${pressure.goldenGanados.A} · B: ${pressure.goldenGanados.B}`}
        />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card__title">Cierre de puntos</h3>
          <DonutChart data={distribucion} />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Winners directos por jugador</h3>
          <HorizontalBarChart data={winnersData} valueLabel="Winners" />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Errores decisivos por jugador</h3>
          <HorizontalBarChart data={erroresData} valueLabel="Errores" />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Duración de los puntos</h3>
          <LineChart data={stats.histogramaLongitud} />
        </div>
        <div className="chart-card chart-card--wide">
          <h3 className="chart-card__title">Match flow — games acumulados</h3>
          <MultiLineChart
            data={flow}
            xKey="game"
            xLabel="Game del partido"
            series={[
              { key: "A", label: "Equipo A", color: TEAM_COLORS.A },
              { key: "B", label: "Equipo B", color: TEAM_COLORS.B },
            ]}
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">
            Secuencias ganadoras · Equipo A
            <span className="chart-card__subtitle"> {nombresA}</span>
          </h3>
          <SequenceTable top={topA} accent={TEAM_COLORS.A} />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">
            Secuencias ganadoras · Equipo B
            <span className="chart-card__subtitle"> {nombresB}</span>
          </h3>
          <SequenceTable top={topB} accent={TEAM_COLORS.B} />
        </div>
      </div>
    </Section>
  );
}

function SequenceTable({
  top,
  accent,
}: {
  top: Array<{ sequence: [string, string, string]; count: number }>;
  accent: string;
}) {
  if (top.length === 0) {
    return <div className="empty">Sin secuencias ganadoras registradas</div>;
  }
  return (
    <table className="sequence-table">
      <thead>
        <tr>
          <th>Secuencia</th>
          <th style={{ textAlign: "right" }}>Puntos</th>
        </tr>
      </thead>
      <tbody>
        {top.map((row, i) => (
          <tr key={i}>
            <td>
              {shotTypeLabel(row.sequence[0])}
              {" → "}
              <span style={{ color: "#888" }}>{shotTypeLabel(row.sequence[1])}</span>
              {" → "}
              <strong style={{ color: accent }}>{shotTypeLabel(row.sequence[2])}</strong>
            </td>
            <td style={{ textAlign: "right", fontWeight: 600 }}>{row.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
