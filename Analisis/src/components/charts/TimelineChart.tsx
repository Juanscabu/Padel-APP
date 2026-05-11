// Línea de tiempo con la diferencia A-B acumulada punto a punto.
// Los puntos son clickeables para mostrar el detalle del rally.

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TEAM_COLORS } from "../../utils/colors";
import { TimelinePoint } from "../../metrics/timeline";

interface Props {
  serie: TimelinePoint[];
  onPointClick?: (puntoId: number) => void;
}

const AXIS_STYLE = { fill: "#888888", fontSize: 12 };

export function TimelineChart({ serie, onPointClick }: Props) {
  if (serie.length === 0) {
    return <div className="empty">Sin puntos cerrados todavía</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={serie}
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        onClick={(state) => {
          // Recharts payload shape — defensivo
          const payload = (state as { activePayload?: Array<{ payload: TimelinePoint }> })
            .activePayload?.[0]?.payload;
          if (payload && onPointClick) onPointClick(payload.puntoId);
        }}
      >
        <defs>
          <linearGradient id="grad-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TEAM_COLORS.A} stopOpacity={0.6} />
            <stop offset="100%" stopColor={TEAM_COLORS.A} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-b" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={TEAM_COLORS.B} stopOpacity={0.6} />
            <stop offset="100%" stopColor={TEAM_COLORS.B} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="3 3" />
        <XAxis
          dataKey="puntoId"
          tick={AXIS_STYLE}
          stroke="#3c3c3c"
          label={{
            value: "Punto",
            position: "insideBottom",
            offset: -2,
            fill: "#888",
          }}
        />
        <YAxis tick={AXIS_STYLE} stroke="#3c3c3c" allowDecimals={false} />
        <ReferenceLine y={0} stroke="#888" strokeDasharray="2 2" />
        <Tooltip
          contentStyle={{
            background: "#252526",
            border: "1px solid #3c3c3c",
            color: "#e0e0e0",
          }}
          formatter={(value: number) => {
            if (value > 0) return [`+${value}`, "Diferencia (A-B)"];
            return [value, "Diferencia (A-B)"];
          }}
          labelFormatter={(label) => `Punto ${label}`}
        />
        <Area
          type="monotone"
          dataKey="diferencia"
          stroke={TEAM_COLORS.A}
          strokeWidth={2}
          fill="url(#grad-a)"
          isAnimationActive
          activeDot={{ r: 5, cursor: "pointer" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
