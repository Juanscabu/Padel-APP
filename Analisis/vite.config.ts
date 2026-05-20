import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Subruta donde la app queda servida en GitHub Pages
  // (https://juanscabu.github.io/Padel-APP/). En dev (npm run dev) Vite
  // ignora `base`, así que esto no afecta el flujo local.
  base: "/Padel-APP/",
  plugins: [react()],
});
