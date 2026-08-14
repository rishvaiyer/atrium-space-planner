# ATRIUM — 3D commercial space planner

Dual-view interior planner for cafés, offices, and retail fit-outs. Layout furniture in a CAD-style 2D plan and see it live in 3D, with capex rollups and egress / ADA checks.

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL (default `http://localhost:5173`).

## Controls

- Click a catalog item, then click the 2D plan or 3D floor to place it
- Drag fixtures on the plan; use the RGB gizmo in 3D
- `R` rotate 90° · `Delete` remove · `⌘/Ctrl+Z` undo · `Shift+click` multi-select
- Alt-drag or right-drag to pan the plan; scroll to zoom
- Measure tool: two clicks on the plan

Toggles on the bottom bar show walls, fixtures, electrical, egress paths, dimensions, and the 100 mm snap grid.
