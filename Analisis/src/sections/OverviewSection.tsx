// Sección 1 — Resumen del partido. Solo KPIs.

import { computeOverview } from "../metrics/overview";
import { Match } from "../parser/types";
import { KpiCard } from "../components/KpiCard";
import { Section } from "../components/Section";
import { PLAYER_COLORS } from "../utils/colors";

interface Props {
  match: Match;
}

export function OverviewSection({ match }: Props) {
  const stats = computeOverview(match);
  return (
    <Section id="overview" title="Resumen del partido" subtitle="Visión general de números clave">
      <div className="kpi-grid">
        <KpiCard icon="🎾" label="Puntos jugados" value={stats.totalPuntos} />
        <KpiCard icon="🥎" label="Golpes registrados" value={stats.totalGolpes} />
        <KpiCard
          icon="⚔️"
          label="Puntos por equipo"
          versus={{
            a: stats.puntosEquipoA,
            b: stats.puntosEquipoB,
            labelA: "Eq. A",
            labelB: "Eq. B",
          }}
        />
        <KpiCard icon="🏆" label="Total winners" value={stats.totalWinners} accent="#73c990" />
        <KpiCard icon="💥" label="Total errores" value={stats.totalErrores} accent="#f48771" />
        {stats.jugadorMasGolpes && (
          <KpiCard
            icon="🏃"
            label="Más golpes"
            value={stats.jugadorMasGolpes.nombre}
            sublabel={`${stats.jugadorMasGolpes.count} golpes`}
            accent={PLAYER_COLORS[stats.jugadorMasGolpes.id]}
          />
        )}
        {stats.jugadorMasWinners && (
          <KpiCard
            icon="🎯"
            label="Más winners"
            value={stats.jugadorMasWinners.nombre}
            sublabel={`${stats.jugadorMasWinners.count} winners`}
            accent={PLAYER_COLORS[stats.jugadorMasWinners.id]}
          />
        )}
        {stats.jugadorMasErrores && (
          <KpiCard
            icon="⚠️"
            label="Más errores"
            value={stats.jugadorMasErrores.nombre}
            sublabel={`${stats.jugadorMasErrores.count} errores`}
            accent={PLAYER_COLORS[stats.jugadorMasErrores.id]}
          />
        )}
      </div>
    </Section>
  );
}
