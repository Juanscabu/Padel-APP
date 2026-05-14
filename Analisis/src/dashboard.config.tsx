// 📦 NUEVA SECCIÓN: para agregar una sección al dashboard:
//   1. Creá tu componente en src/sections/MiSeccion.tsx que reciba `match: Match`.
//   2. Importalo acá.
//   3. Sumá una entrada al array DASHBOARD_SECTIONS.
// El layout en App.tsx itera este array — no hay nada hardcodeado.

import { ComponentType } from "react";
import { Match } from "./parser/types";
import { OverviewSection } from "./sections/OverviewSection";
import { PlayersSection } from "./sections/PlayersSection";
import { PointsSection } from "./sections/PointsSection";
import { DirectionsSection } from "./sections/DirectionsSection";

export interface DashboardSection {
  id: string;
  navLabel: string;
  component: ComponentType<{ match: Match }>;
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  { id: "overview", navLabel: "Resumen", component: OverviewSection },
  { id: "players", navLabel: "Por jugador", component: PlayersSection },
  { id: "points", navLabel: "Puntos", component: PointsSection },
  { id: "directions", navLabel: "Direcciones", component: DirectionsSection },
];
