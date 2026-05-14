// Gráfico de líneas con N series sobre el mismo eje X. Cada serie tiene
// su key (en los datos), label (para tooltip/leyenda) y color.

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS_STYLE = { fill: "#888888", fontSize: 12 };

export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Array<Record<string, number>>;
  xKey: string;
  series: LineSeries[];
  xLabel?: string;
  height?: number;
}

export function MultiLineChart({ data, xKey, series, xLabel, height = 260 }: Props) {
  if (data.length === 0) {
    return <div className="empty">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#2a2f3e" strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tick={AXIS_STYLE}
          stroke="#2a2f3e"
          label={
            xLabel
              ? { value: xLabel, position: "insideBottom", offset: -2, fill: "#888" }
              : undefined
          }
        />
        <YAxis tick={AXIS_STYLE} stroke="#2a2f3e" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "#1c2030",
            border: "1px solid #4ec9b0",
            borderRadius: 8,
            color: "#e4e6eb",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          itemStyle={{ color: "#e4e6eb" }}
          labelStyle={{ color: "#8b8f9d", marginBottom: 4 }}
          cursor={{ stroke: "rgba(78, 201, 176, 0.25)" }}
        />
        <Legend wrapperStyle={{ paddingTop: 8 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
