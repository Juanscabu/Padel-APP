// Card de KPI: ícono + número grande + label. Si se le pasan dos
// valores `a` y `b`, se renderiza también una barra de progreso comparativa.

import { ReactNode } from "react";
import { TEAM_COLORS } from "../utils/colors";

interface Props {
  icon?: ReactNode;
  label: string;
  value?: string | number;
  sublabel?: string;
  versus?: {
    a: number;
    b: number;
    labelA?: string;
    labelB?: string;
  };
  accent?: string;
}

export function KpiCard({ icon, label, value, sublabel, versus, accent }: Props) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__row">
        {icon && <div className="kpi-card__icon">{icon}</div>}
        <div className="kpi-card__body">
          <div className="kpi-card__label">{label}</div>
          {value !== undefined && value !== "" && (
            <div className="kpi-card__value" style={accent ? { color: accent } : undefined}>
              {value}
            </div>
          )}
          {sublabel && <div className="kpi-card__sublabel">{sublabel}</div>}
        </div>
      </div>
      {versus && <ProgressBar {...versus} />}
    </div>
  );
}

function ProgressBar({
  a,
  b,
  labelA = "A",
  labelB = "B",
}: {
  a: number;
  b: number;
  labelA?: string;
  labelB?: string;
}) {
  const total = a + b;
  const pctA = total === 0 ? 50 : (a / total) * 100;
  return (
    <div className="kpi-card__progress">
      <div className="kpi-card__progress-labels">
        <span style={{ color: TEAM_COLORS.A }}>
          {labelA} {a}
        </span>
        <span style={{ color: TEAM_COLORS.B }}>
          {b} {labelB}
        </span>
      </div>
      <div className="kpi-card__progress-bar">
        <div
          className="kpi-card__progress-fill"
          style={{ width: `${pctA}%`, background: TEAM_COLORS.A }}
        />
        <div
          className="kpi-card__progress-fill"
          style={{ width: `${100 - pctA}%`, background: TEAM_COLORS.B }}
        />
      </div>
    </div>
  );
}
