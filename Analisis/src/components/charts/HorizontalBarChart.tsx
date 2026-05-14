// Barras horizontales — usada para el mapa de direcciones global.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS_STYLE = { fill: "#888888", fontSize: 12 };

export interface HBarItem {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: HBarItem[];
  height?: number;
  valueLabel?: string; // texto que aparece en el tooltip junto al valor
}

export function HorizontalBarChart({
  data,
  height = 260,
  valueLabel = "Cantidad",
}: Props) {
  if (data.length === 0) {
    return <div className="empty">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid stroke="#2a2f3e" strokeDasharray="3 3" />
        <XAxis type="number" tick={AXIS_STYLE} stroke="#2a2f3e" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_STYLE}
          stroke="#2a2f3e"
          width={120}
        />
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
          cursor={{ fill: "rgba(78, 201, 176, 0.08)" }}
        />
        <Bar dataKey="value" name={valueLabel} isAnimationActive>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
