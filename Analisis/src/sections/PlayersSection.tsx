// Sección 2 — Stats por jugador. Tabs en la parte superior.

import { Fragment, useState } from "react";
import { computeAllPlayerStats, PlayerStats } from "../metrics/perPlayer";
import { Match, PlayerId } from "../parser/types";
import { DonutChart, DonutItem } from "../components/charts/DonutChart";
import { StackedBarChart } from "../components/charts/StackedBarChart";
import { Section } from "../components/Section";
import { PLAYER_COLORS, RESULT_COLORS, colorForKey } from "../utils/colors";
import { directionLabel, shotTypeLabel, resultLabel, sideLabel } from "../utils/labels";

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
  // Los gráficos excluyen el saque: tácticamente no es comparable con
  // golpes de rally y, por volumen, distorsiona las distribuciones. La
  // tabla de detalle sí lo incluye para que las stats globales del saque
  // queden visibles.
  const tipos: DonutItem[] = Object.entries(stats.golpesPorTipo)
    .filter(([id]) => id !== "saque")
    .map(([id, value]) => ({
      label: shotTypeLabel(id),
      value,
      color: colorForKey(id),
    }))
    .sort((a, b) => b.value - a.value);

  // Recomputar direcciones sin saques: agregamos desde los breakdowns
  // por tipo, omitiendo el bucket "saque".
  const direccionesSinSaque: Record<string, number> = {};
  for (const b of stats.breakdownPorTipo) {
    if (b.tipo === "saque") continue;
    for (const [d, n] of Object.entries(b.porDireccion)) {
      direccionesSinSaque[d] = (direccionesSinSaque[d] ?? 0) + n;
    }
  }
  const direcciones: DonutItem[] = Object.entries(direccionesSinSaque)
    .map(([id, value]) => ({
      label: directionLabel(id),
      value,
      color: colorForKey("dir:" + id),
    }))
    .sort((a, b) => b.value - a.value);

  const breakdownData = stats.breakdownPorTipo
    .filter((b) => b.tipo !== "saque")
    .map((b) => ({
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
        <div className="total-pill total-pill--errors">
          <span className="total-pill__value">{stats.erroresForzados}</span>
          <span className="total-pill__label">Errores forzados</span>
        </div>
        <div className="total-pill total-pill--errors">
          <span className="total-pill__value">{stats.erroresNoForzados}</span>
          <span className="total-pill__label">Errores no forzados</span>
        </div>
        <div className="total-pill total-pill--winners">
          <span className="total-pill__value">{stats.erroresGenerados}</span>
          <span className="total-pill__label">Errores generados</span>
        </div>
        <div className="total-pill total-pill--winners">
          <span className="total-pill__value">{stats.pctEficienciaOfensiva}%</span>
          <span className="total-pill__label">
            Eficiencia ofensiva ({stats.winnersOfensivos + stats.erroresGeneradosOfensivos}/
            {stats.winnersOfensivos +
              stats.erroresGeneradosOfensivos +
              stats.erroresNoForzadosOfensivosCometidos})
          </span>
        </div>
        <div className="total-pill total-pill--neutral">
          <span className="total-pill__value">{stats.pctPuntosGanadosPrimerSaque}%</span>
          <span className="total-pill__label">
            Puntos ganados con 1º saque ({stats.puntosGanadosPrimerSaque}/
            {stats.puntosServidosPrimerSaque})
          </span>
        </div>
        <div className="total-pill total-pill--neutral">
          <span className="total-pill__value">{stats.pctPuntosGanadosSegundoSaque}%</span>
          <span className="total-pill__label">
            Puntos ganados con 2º saque ({stats.puntosGanadosSegundoSaque}/
            {stats.puntosServidosSegundoSaque})
          </span>
        </div>
        <div className="total-pill total-pill--errors">
          <span className="total-pill__value">{stats.pctRestoError}%</span>
          <span className="total-pill__label">
            Restos error ({stats.restosError}/{stats.totalRestos})
          </span>
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
        <p className="breakdown-table__hint">Click en una fila para ver direcciones y en-juego</p>
        <BreakdownTable rows={stats.breakdownPorTipo} />
      </div>
    </div>
  );
}

function BreakdownTable({
  rows,
}: {
  rows: PlayerStats["breakdownPorTipo"];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (tipo: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  };
  const colCount = 6;
  return (
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Total</th>
          <th>Winners</th>
          <th>Errores generados</th>
          <th>Errores forzados</th>
          <th>Errores no forzados</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => {
          const open = expanded.has(b.tipo);
          const dirEntries = Object.entries(b.porDireccion).filter(([, n]) => n > 0);
          return (
            <Fragment key={b.tipo}>
              <tr
                onClick={() => toggle(b.tipo)}
                className="breakdown-row"
                style={{ cursor: "pointer" }}
              >
                <td>
                  <span style={{ display: "inline-block", width: "1em", color: "#888" }}>
                    {open ? "▾" : "▸"}
                  </span>
                  {shotTypeLabel(b.tipo)}
                </td>
                <td>{b.total}</td>
                <td className="cell--ok">{b.winners || ""}</td>
                <td className="cell--ok">{b.erroresGenerados || ""}</td>
                <td className="cell--err">{b.erroresForzadosCometidos || ""}</td>
                <td className="cell--err">{b.erroresNoForzadosCometidos || ""}</td>
              </tr>
              {open && (
                <tr className="breakdown-row__detail">
                  <td colSpan={colCount}>
                    <div className="breakdown-detail">
                      <span>
                        <strong>En juego:</strong> {b.enJuego}
                      </span>
                      {dirEntries.length > 0 && (
                        <span className="breakdown-detail__sep">·</span>
                      )}
                      {dirEntries.map(([d, n], i) => (
                        <Fragment key={d}>
                          {i > 0 && <span className="breakdown-detail__sep">·</span>}
                          <span>
                            <strong>{directionLabel(d)}:</strong> {n}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                    {Object.keys(b.porLado).length > 0 && (
                      <table className="breakdown-side-table">
                        <thead>
                          <tr>
                            <th>Lado</th>
                            <th>Total</th>
                            <th>Winners</th>
                            <th>Errores generados</th>
                            <th>Errores forzados</th>
                            <th>Errores no forzados</th>
                            <th>En juego</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(b.porLado).map(([lado, sb]) => (
                            <tr key={lado}>
                              <td>{sideLabel(lado)}</td>
                              <td>{sb.total}</td>
                              <td className="cell--ok">{sb.winners || ""}</td>
                              <td className="cell--ok">{sb.erroresGenerados || ""}</td>
                              <td className="cell--err">{sb.erroresForzados || ""}</td>
                              <td className="cell--err">{sb.erroresNoForzados || ""}</td>
                              <td>{sb.enJuego || ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
