// Gráfico de líneas para distribuciones con X discreta (ej: cantidad de
// puntos por longitud de rally). Forma de datos idéntica al Histogram
// para que el swap sea directo.

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS_STYLE = { fill: "#888888", fontSize: 12 };

interface Props {
  data: Array<{ longitud: number; cantidad: number }>;
  color?: string;
  height?: number;
}

export function LineChart({ data, color = "#4ec9b0", height = 240 }: Props) {
  if (data.length === 0) {
    return <div className="empty">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#2a2f3e" strokeDasharray="3 3" />
        <XAxis
          dataKey="longitud"
          tick={AXIS_STYLE}
          stroke="#2a2f3e"
          label={{ value: "Golpes por punto", position: "insideBottom", offset: -2, fill: "#888" }}
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
          formatter={(value: number) => [value, "Puntos"]}
          labelFormatter={(label) => `${label} golpes`}
        />
        <Line
          type="monotone"
          dataKey="cantidad"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
          isAnimationActive
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
