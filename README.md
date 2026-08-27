# ATRIUM: 3D commercial space planner

![ATRIUM mark](src/assets/hero.png)

ATRIUM is a browser-based planning workbench for cafés, offices, clinics, and retail fit-outs. Place a catalog fixture once and see the same room update in a CAD-style 2D plan and an interactive 3D view. The planner keeps a live capex rollup beside early egress and ADA-oriented checks so spatial decisions stay legible.

**Live demo:** [rishvaiyer.github.io/atrium-space-planner](https://rishvaiyer.github.io/atrium-space-planner/)

## Why this project

The interesting part is the shared model between views: a room is data first, not a screenshot. The same `ProjectFile` drives plan rendering, the Three.js scene, cost totals, and exports that another world-building system could validate before placing anything.

## Photo to 3D

The Library panel has a **Photo → 3D** tab. Drop in a photo of a chair, table, lamp, apple, or anything else (or paste an image URL), and ATRIUM turns it into a placeable model:

1. The subject is separated from its background by flooding inwards from the border, or by the alpha channel if the image is already a cutout.
2. The silhouette is measured: where it meets the floor, how far up the wide part reaches, how many legs, and how much of it is symmetric about its own axis.
3. Those proportions pick a type, which you can override, and set real-world dimensions in metres.
4. The model is built, exported to GLB, stored in IndexedDB, and registered as a catalog item, so it places, rotates, costs, and exports like any other fixture. Photo chairs and sofas count as seats.

### Reading the camera angle

Furniture is almost never photographed as a flat front elevation. A table shot from standing height shows its top as a squashed ellipse, and read naively that ellipse looks like a tall wide panel, so the piece comes back as a chair.

When a wide top sits over a much narrower body, ATRIUM treats it as a surface seen from above. How squashed the ellipse is gives the camera tilt, and stretching the top back out recovers the real plan outline: a round table comes back round, a racetrack comes back a racetrack. That outline is the footprint, which is the part a space planner actually needs. Height then comes from the standard for the type rather than from the photo, because perspective makes a single image an unreliable ruler; the height field is right there to correct it.

### Three ways to build

- **Revolved** for anything radially symmetric: apples, vases, bowls, urns, drum bases. This is the highest fidelity path in the generator, because a symmetric object really does show its whole shape in one photo. The outline is measured against the object's own axis, so a leaf on a stem or a handle on one side drops out instead of being swept all the way round.
- **Solid** for recognised furniture: chair, stool, sofa, table, desk, poker table, bed, shelving, cabinet, lamp, rug, plant. Parts are fitted to the measured proportions so the piece reads from every angle.
- **Photo cutout** for anything unrecognised: the traced outline is extruded, keeping gaps between legs as real holes.

### Surfaces

By default surfaces are **rebuilt, not pasted**. ATRIUM reads the colour ramp, saturation, contrast, and highlights out of the photo, decides what the thing is made of (polished, fabric, wood, metal), and draws a clean 512px material with the right roughness, a real colour ramp, and procedural grain: flecks for fruit and stone, streaks for wood, a fine weave for fabric. An apple comes out as a glossy speckled apple rather than a stretched JPEG.

**Photo texture** is available as an option where printed detail matters more than resolution, such as a patterned rug, and is the default for rugs.

It all runs in the browser. No image is uploaded and no generative model is involved.

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
- One photo cannot measure depth through perspective, so the depth of a generated model is a typed default you can correct.
- For a top seen from above, height is the standard for the type rather than a measurement. Set it if you know it.
- Colours are lifted from the photo and lightly saturated back up, since averaging a photo flattens colour toward grey. They are a close match, not a colour-managed one.
- Background removal works from the image border, so a region of background fully enclosed by the subject (the bays of a bookcase, for example) stays part of the solid. The photo texture still shows the detail.
- Image URLs only work when the host allows cross-origin reads. If it does not, save the image and upload it.
- This repository does not yet include an automated test suite.

## License

No open-source license has been selected yet. Until one is added, reuse and redistribution are not granted by default.
