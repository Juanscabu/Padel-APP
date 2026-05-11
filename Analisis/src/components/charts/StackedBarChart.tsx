// Barras apiladas/agrupadas. Útil para "winners vs errores vs en juego
// por tipo de golpe".

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
}

const AXIS_STYLE = { fill: "#888888", fontSize: 12 };

export function StackedBarChart({
  data,
  xKey,
  series,
  height = 280,
  stacked = true,
}: Props) {
  if (data.length === 0) {
    return <div className="empty">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} stroke="#3c3c3c" />
        <YAxis tick={AXIS_STYLE} stroke="#3c3c3c" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "#252526",
            border: "1px solid #3c3c3c",
            color: "#e0e0e0",
            fontFamily: "Consolas, monospace",
          }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Legend wrapperStyle={{ color: "#e0e0e0", fontSize: 12 }} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            stackId={stacked ? "stack" : undefined}
            isAnimationActive
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
