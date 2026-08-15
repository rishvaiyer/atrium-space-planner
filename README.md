# ATRIUM — 3D commercial space planner

![ATRIUM mark](src/assets/hero.png)

ATRIUM is a browser-based planning workbench for cafés, offices, clinics, and retail fit-outs. Place a catalog fixture once and see the same room update in a CAD-style 2D plan and an interactive 3D view. The planner keeps a live capex rollup beside early egress and ADA-oriented checks so spatial decisions stay legible.

**Live demo:** [rishvaiyer.github.io/atrium-space-planner](https://rishvaiyer.github.io/atrium-space-planner/)

## Why this project

The interesting part is the shared model between views: a room is data first, not a screenshot. The same `ProjectFile` drives plan rendering, the Three.js scene, cost totals, and exports that another world-building system could validate before placing anything.

## Stack

- React + TypeScript + Vite
- Zustand for local project state and undo/redo
- React Three Fiber + Three.js for the 3D scene
- Pure TypeScript modules for design import, geometry, compliance checks, and place export

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL (default `http://localhost:5173`).

Useful checks:

```bash
npm run lint
npm run build
```

## Controls

- Click a catalog item, then click the 2D plan or 3D floor to place it
- Drag fixtures on the plan; use the RGB gizmo in 3D
- `R` rotate 90° · `Delete` remove · `⌘/Ctrl+Z` undo · `Shift+click` multi-select
- Alt-drag or right-drag to pan the plan; scroll to zoom
- Measure tool: two clicks on the plan

Toggles on the bottom bar show walls, fixtures, electrical, egress paths, dimensions, and the 100 mm snap grid.

## Data flow

```text
AI-readable JSON or a template
            ↓
      compileDesign()
            ↓
       ProjectFile
       ↙       ↘
   2D plan     3D scene
       ↘       ↙
  capex + egress / ADA checks
            ↓
    .atrium.json or atrium-place export
```

- `src/design.ts` compiles a constrained JSON design contract into a project.
- `src/compliance.ts` calculates snap-grid geometry, aisle checks, and an A* egress path.
- `src/placeExport.ts` emits a portable `atrium-place` payload containing room bounds, walls, doors, and props.
- Projects are saved locally in the browser and can be downloaded as JSON; there is no hosted project database.

## Honest boundaries

- Compliance indicators are planning guidance, not stamped architectural, fire, accessibility, or permit review.
- AI import is constrained to the built-in catalog. Unknown fixtures are skipped rather than invented.
- The app is local-first: no accounts, collaboration layer, or server-side persistence are included.
- The export is a room-planning contract, not BIM/CAD interchange, and currently does not carry window geometry.
- The catalog and 3D assets are prototype-scale representations; validate dimensions and finishes before construction.
- This repository does not yet include an automated test suite.

## License

No open-source license has been selected yet. Until one is added, reuse and redistribution are not granted by default.
