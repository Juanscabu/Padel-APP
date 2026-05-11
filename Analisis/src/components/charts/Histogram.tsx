// Histograma simple — barras verticales, X discreta.

import {
  Bar,
  BarChart,
  CartesianGrid,
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

export function Histogram({ data, color = "#4ec9b0", height = 240 }: Props) {
  if (data.length === 0) {
    return <div className="empty">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="3 3" />
        <XAxis
          dataKey="longitud"
          tick={AXIS_STYLE}
          stroke="#3c3c3c"
          label={{ value: "Golpes por punto", position: "insideBottom", offset: -2, fill: "#888" }}
        />
        <YAxis tick={AXIS_STYLE} stroke="#3c3c3c" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "#252526",
            border: "1px solid #3c3c3c",
            color: "#e0e0e0",
          }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          formatter={(value: number) => [value, "Puntos"]}
          labelFormatter={(label) => `${label} golpes`}
        />
        <Bar dataKey="cantidad" fill={color} isAnimationActive />
      </BarChart>
    </ResponsiveContainer>
  );
}
