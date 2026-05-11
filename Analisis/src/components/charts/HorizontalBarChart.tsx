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
}

export function HorizontalBarChart({ data, height = 260 }: Props) {
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
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="3 3" />
        <XAxis type="number" tick={AXIS_STYLE} stroke="#3c3c3c" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_STYLE}
          stroke="#3c3c3c"
          width={120}
        />
        <Tooltip
          contentStyle={{
            background: "#252526",
            border: "1px solid #3c3c3c",
            color: "#e0e0e0",
          }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="value" isAnimationActive>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
