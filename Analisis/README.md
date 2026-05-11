# Pádel · Análisis

Dashboard web para explorar las estadísticas de un partido de pádel a partir
de un archivo JSON generado por el [Tracker](../Tracker).

100% estático (no hay backend), tema oscuro, animaciones suaves. El JSON
cargado se persiste en `localStorage` del browser — al volver a abrir la app,
el último partido sigue ahí.

## Stack

- **React 18 + TypeScript** — UI declarativa con tipado.
- **Vite** — dev server con HMR y build estático.
- **Recharts** — gráficos compuestos con primitivas declarativas (encaja
  con el modelo de React, fácil de personalizar visualmente).
- Sin dependencias de CSS pesadas: solo `styles.css` con variables de tema.

## Cómo correrla

Requiere **Node.js 18+** (incluye npm).

```bash
cd Analisis
npm install
npm run dev
```

Abre el navegador en la URL que muestra Vite (suele ser
`http://localhost:5173`). Para una build de producción estática:

```bash
npm run build
npm run preview
```

Los archivos compilados quedan en `dist/` — se pueden servir desde
cualquier hosting estático (GitHub Pages, Netlify, S3, etc).

### JSON de prueba

`public/partido_ejemplo.json` tiene un partido de 32 puntos con todos los
tipos de golpe del Tracker (incluido el flag `con_pared`, segundos saques,
doble falta, etiquetas de "otro" y campos `extra` aplanados). Arrastralo
a la zona de carga para ver el dashboard funcionando de entrada.

## Arquitectura — tres capas

El proyecto está dividido en tres capas estrictas. La regla:
**una capa solo conoce las que están "abajo".**

```
┌─────────────────────────────────────────┐
│  3. Visualización  (sections/, components/)
│     - Componentes React que reciben     │
│       datos pre-calculados.             │
│     - No hacen cálculos. No conocen     │
│       el JSON crudo.                    │
├─────────────────────────────────────────┤
│  2. Métricas  (metrics/)                │
│     - Funciones puras Match → datos.    │
│     - Cada métrica es independiente,    │
│       testeable, sin side effects.      │
├─────────────────────────────────────────┤
│  1. Parser  (parser/)                   │
│     - Convierte el JSON crudo del       │
│       Tracker al modelo `Match` tipado. │
│     - Único lugar que conoce los nombres│
│       de campos en `snake_case`.        │
└─────────────────────────────────────────┘
```

### 1. Parser (`src/parser/`)

- `types.ts` — declara el modelo interno (`Match`, `Shot`, `PlayerInfo`).
- `parseMatch.ts` — toma `unknown` y devuelve un `Match` tipado.

**Tolerancia a cambios del JSON:**

- Los enumerados (`tipoGolpe`, `direccion`, `resultado`) se mantienen
  como `string` (no union estricta). Si el Tracker agrega un tipo nuevo,
  aparece automáticamente en los gráficos.
- Cualquier campo no reconocido del shot termina en `shot.extras` para
  que componentes futuros lo consuman cuando estén listos.
- Campos ausentes caen a valores por defecto sin romper.
- Shots con `jugador` desconocido se descartan silenciosamente.

**Para incorporar un campo nuevo del JSON:** tocá solamente
`parser/types.ts` (agregá la propiedad al `Shot`) y `parser/parseMatch.ts`
(promové el campo desde `extras`). Las capas superiores no se enteran de
si vino del JSON o no — solo ven el campo del modelo.

### 2. Métricas (`src/metrics/`)

Cada archivo es una métrica independiente:

- `overview.ts` — KPIs globales del partido.
- `perPlayer.ts` — stats por jugador.
- `points.ts` — análisis de puntos (cierres, duración, histograma).
- `timeline.ts` — momentum (diferencia acumulada).
- `directions.ts` — distribución de direcciones global + matriz.

Todas las funciones son **puras** (`Match → Stats`). No tocan DOM, no
hacen fetch, no mantienen estado. Esto hace que sean trivialmente
testeables: `expect(computeOverview(match)).toEqual({...})`.

### 3. Visualización (`src/sections/`, `src/components/`)

- `sections/*Section.tsx` — una sección del dashboard. Recibe el `match`,
  llama a la métrica correspondiente y arma los componentes visuales.
- `components/charts/` — charts genéricos (donut, barras, timeline,
  histograma). No conocen el dominio del pádel, solo reciben datos
  visuales (`{ label, value, color }`).
- `components/` — UI reutilizable (`KpiCard`, `Section`, `FileLoader`).

El layout del dashboard NO está hardcodeado en `App.tsx`. Vive en
`dashboard.config.tsx` como un array. `App.tsx` itera ese array.

## Cómo agregar cosas

### 📊 Una métrica nueva en una sección existente

1. Editá el archivo correspondiente en `src/metrics/`. Agregá una función
   pura (o extendé el interface de salida).
2. Editá la sección en `src/sections/` que la consume. Usá un chart
   existente o creá uno nuevo en `src/components/charts/`.

No hay que tocar el parser ni el layout central.

### 📦 Una sección nueva del dashboard

1. Creá `src/sections/MiNuevaSeccion.tsx` que reciba `{ match: Match }`.
   Adentro llamá a tus funciones de `metrics/` y armá la UI con los
   componentes existentes.
2. Si necesita una métrica nueva, agregala en `src/metrics/`.
3. Registrá la sección en `src/dashboard.config.tsx`:
   ```ts
   import { MiNuevaSeccion } from "./sections/MiNuevaSeccion";
   // ...
   { id: "mi-nueva", navLabel: "Mi sección", component: MiNuevaSeccion },
   ```
4. Listo — la sección aparece en el orden definido por el array, con
   nav link automático.

### 🆕 Un campo nuevo del JSON del Tracker

1. Si el campo no se está usando todavía: nada que hacer. Va a quedar
   en `shot.extras` accesible para cualquier componente futuro.
2. Si querés promoverlo a propiedad tipada:
   - Agregá la propiedad al interface `Shot` en `parser/types.ts`.
   - Agregalo a `KNOWN_SHOT_FIELDS` y al return de `parseShot()` en
     `parser/parseMatch.ts`.
3. Usalo desde las métricas o componentes que lo necesiten.

Los archivos JSON anteriores que no tienen el campo siguen funcionando
sin tocar nada — el parser tolera ausencia.

### 🎨 Cambiar la paleta / tema

Variables en `src/styles.css` (CSS custom properties). Colores por equipo
y jugador en `src/utils/colors.ts`. Cambiar un solo lugar se propaga a
todo el dashboard.

## Estructura de archivos

```
Analisis/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   └── partido_ejemplo.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles.css
│   ├── dashboard.config.tsx       # 📦 Registro central de secciones
│   ├── parser/
│   │   ├── types.ts               # Modelo interno
│   │   └── parseMatch.ts          # JSON → Match (único lugar que conoce el JSON crudo)
│   ├── metrics/
│   │   ├── overview.ts            # 📊 KPIs globales
│   │   ├── perPlayer.ts           # 📊 Stats por jugador
│   │   ├── points.ts              # 📊 Análisis de puntos
│   │   ├── timeline.ts            # 📊 Momentum
│   │   └── directions.ts          # 📊 Direcciones
│   ├── components/
│   │   ├── FileLoader.tsx
│   │   ├── KpiCard.tsx
│   │   ├── Section.tsx
│   │   └── charts/                # Gráficos genéricos
│   │       ├── DonutChart.tsx
│   │       ├── StackedBarChart.tsx
│   │       ├── HorizontalBarChart.tsx
│   │       ├── TimelineChart.tsx
│   │       └── Histogram.tsx
│   ├── sections/                  # Una sección por archivo
│   │   ├── OverviewSection.tsx
│   │   ├── PlayersSection.tsx
│   │   ├── PointsSection.tsx
│   │   ├── TimelineSection.tsx
│   │   └── DirectionsSection.tsx
│   └── utils/
│       ├── colors.ts              # Paleta de equipos / jugadores / resultados
│       └── labels.ts              # IDs canónicos → texto amigable
```

Buscá los markers `// 📊 NUEVA MÉTRICA` y `// 📦 NUEVA SECCIÓN` en el
código para encontrar rápido los puntos de extensión.
