// Gráfico de dona genérico: recibe una lista de items con label/value/color.
// La capa de visualización no calcula nada — solo recibe datos prontos.

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutItem[];
  height?: number;
}

export function DonutChart({ data, height = 260 }: Props) {
  if (data.length === 0) {
    return <div className="empty">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          isAnimationActive
        >
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} stroke="#1e1e1e" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#252526",
            border: "1px solid #3c3c3c",
            color: "#e0e0e0",
            fontFamily: "Consolas, monospace",
          }}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend
          wrapperStyle={{
            color: "#e0e0e0",
            fontFamily: "Consolas, monospace",
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
