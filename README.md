# ATRIUM: 3D commercial space planner

![ATRIUM mark](src/assets/hero.png)

ATRIUM is a browser-based planning workbench for cafés, offices, clinics, and retail fit-outs. Place a catalog fixture once and see the same room update in a CAD-style 2D plan and an interactive 3D view. The planner keeps a live capex rollup beside early egress and ADA-oriented checks so spatial decisions stay legible.

**Live demo:** [rishvaiyer.github.io/atrium-space-planner](https://rishvaiyer.github.io/atrium-space-planner/)

## Why this project

The interesting part is the shared model between views: a room is data first, not a screenshot. The same `ProjectFile` drives plan rendering, the Three.js scene, cost totals, and exports that another world-building system could validate before placing anything.

## Photo to 3D

The Library panel has a **Photo → 3D** tab. Drop in a photo of a chair, table, lamp, sofa, or anything else (or paste an image URL), and ATRIUM turns it into a placeable model:

1. The subject is separated from its background by flooding inwards from the border, or by the alpha channel if the image is already a cutout.
2. The silhouette is measured into proportions: where it meets the floor, how far up the wide part reaches, how many legs, how much of the bbox it fills.
3. Those proportions pick a furniture type, which you can override, and set real-world dimensions in metres.
4. **Solid furniture** mode fits a parametric piece (seat, back, arms, legs, apron, shade) so it reads from every angle. **Photo cutout** mode extrudes the traced outline, keeping gaps between legs as real holes. Both take their colours, and where it helps their surface texture, from the photo.
5. The result is exported to GLB, stored in IndexedDB, and registered as a catalog item, so it places, rotates, costs, and exports like any other fixture. Photo chairs and sofas count as seats.

It runs entirely in the browser. No image is uploaded and no generative model is involved.

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
- Photo to 3D produces a planning stand-in matched to the shape and colours of a photo, not a scan of the real object. Its type guess is a set of proportion rules, not a trained model, so it is always shown and always overridable.
- One photo cannot show depth, so the depth of a generated model is a typed default you can correct. Width and height follow the photo.
- Background removal works from the image border, so a region of background fully enclosed by the subject (the bays of a bookcase, for example) stays part of the solid. The photo texture still shows the detail.
- Image URLs only work when the host allows cross-origin reads. If it does not, save the image and upload it.
- This repository does not yet include an automated test suite.

## License

No open-source license has been selected yet. Until one is added, reuse and redistribution are not granted by default.
