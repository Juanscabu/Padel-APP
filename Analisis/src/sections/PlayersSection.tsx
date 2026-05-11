// Sección 2 — Stats por jugador. Tabs en la parte superior.

import { useState } from "react";
import { computeAllPlayerStats, PlayerStats } from "../metrics/perPlayer";
import { Match, PlayerId } from "../parser/types";
import { DonutChart, DonutItem } from "../components/charts/DonutChart";
import { StackedBarChart } from "../components/charts/StackedBarChart";
import { Section } from "../components/Section";
import { PLAYER_COLORS, RESULT_COLORS, colorForKey } from "../utils/colors";
import { directionLabel, shotTypeLabel, resultLabel } from "../utils/labels";

interface Props {
  match: Match;
}

export function PlayersSection({ match }: Props) {
  const allStats = computeAllPlayerStats(match);
  const [selected, setSelected] = useState<PlayerId>("J1");
  const stats = allStats.find((s) => s.id === selected)!;

  return (
    <Section
      id="players"
      title="Estadísticas por jugador"
      subtitle="Volumen, efectividad y detalle por golpe"
    >
      <div className="tabs">
        {allStats.map((s) => (
          <button
            key={s.id}
            className={`tab ${s.id === selected ? "tab--active" : ""}`}
            style={
              s.id === selected
                ? { borderColor: PLAYER_COLORS[s.id], color: PLAYER_COLORS[s.id] }
                : undefined
            }
            onClick={() => setSelected(s.id)}
          >
            <span className="tab__id">{s.id}</span>
            <span className="tab__name">{s.nombre}</span>
          </button>
        ))}
      </div>

      <PlayerView stats={stats} />
    </Section>
  );
}

function PlayerView({ stats }: { stats: PlayerStats }) {
  const tipos: DonutItem[] = Object.entries(stats.golpesPorTipo)
    .map(([id, value]) => ({
      label: shotTypeLabel(id),
      value,
      color: colorForKey(id),
    }))
    .sort((a, b) => b.value - a.value);

  const direcciones: DonutItem[] = Object.entries(stats.golpesPorDireccion)
    .map(([id, value]) => ({
      label: directionLabel(id),
      value,
      color: colorForKey("dir:" + id),
    }))
    .sort((a, b) => b.value - a.value);

  const breakdownData = stats.breakdownPorTipo.map((b) => ({
    tipo: shotTypeLabel(b.tipo),
    winners: b.winners,
    errores: b.errores,
    enJuego: b.enJuego,
  }));

  return (
    <div className="player-view">
      <div className="player-view__totals">
        <div className="total-pill total-pill--winners">
          <span className="total-pill__value">{stats.pctWinners}%</span>
          <span className="total-pill__label">{resultLabel("winner")}s ({stats.winners})</span>
        </div>
        <div className="total-pill total-pill--errors">
          <span className="total-pill__value">{stats.pctErrores}%</span>
          <span className="total-pill__label">{resultLabel("error")}s ({stats.errores})</span>
        </div>
        <div className="total-pill total-pill--neutral">
          <span className="total-pill__value">{stats.pctEnJuego}%</span>
          <span className="total-pill__label">En juego ({stats.enJuego})</span>
        </div>
        <div className="total-pill total-pill--total">
          <span className="total-pill__value">{stats.totalGolpes}</span>
          <span className="total-pill__label">Golpes totales</span>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-card__title">Golpes por tipo</h3>
          <DonutChart data={tipos} />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Golpes por dirección</h3>
          <DonutChart data={direcciones} />
        </div>
        <div className="chart-card chart-card--wide">
          <h3 className="chart-card__title">Resultado por tipo de golpe</h3>
          <StackedBarChart
            data={breakdownData}
            xKey="tipo"
            series={[
              { key: "winners", label: "Winners", color: RESULT_COLORS.winner },
              { key: "errores", label: "Errores", color: RESULT_COLORS.error },
              { key: "enJuego", label: "En juego", color: RESULT_COLORS.en_juego },
            ]}
          />
        </div>
      </div>

      <div className="breakdown-table">
        <h3 className="chart-card__title">Detalle por golpe</h3>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Total</th>
              <th>Winners</th>
              <th>Errores</th>
              <th>En juego</th>
            </tr>
          </thead>
          <tbody>
            {stats.breakdownPorTipo.map((b) => (
              <tr key={b.tipo}>
                <td>{shotTypeLabel(b.tipo)}</td>
                <td>{b.total}</td>
                <td className="cell--ok">{b.winners}</td>
                <td className="cell--err">{b.errores}</td>
                <td>{b.enJuego}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
