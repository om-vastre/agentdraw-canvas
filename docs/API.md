# AgentDraw canvas — API Reference

## `new CanvasStudio()`

Creates and initialises the full studio. Call once after the DOM is ready.

```js
import { CanvasStudio } from './src/CanvasStudio.js';
const studio = new CanvasStudio();
```

---

## `studio.Shapes`

| Method | Description |
|--------|-------------|
| `create(type, config)` | Create a shape by registered type. Returns Konva node. |
| `quickAdd(type)` | Add a shape centred on the canvas with random offset. |
| `register(type, factory)` | Register a custom shape factory `(cfg) => Konva.Node`. |
| `duplicate()` | Clone the selected shape with +28px offset. |
| `deleteSelected()` | Animate-out and destroy selected shape. |
| `clearAll()` | Animate-out and destroy all shapes. |
| `alignCenter()` | Move selected shape to canvas centre. |
| `toFront()` | Move selected shape to top of Z-order. |
| `toBack()` | Move selected shape to bottom of Z-order. |
| `flipH()` | Flip selected shape horizontally. |
| `createRandom(n)` | Create `n` random coloured shapes with staggered delay. |

### Built-in shape types
`rect` · `circle` · `triangle` · `pentagon` · `hexagon` · `diamond`
`star` · `arrow` · `line` · `text`

---

## `studio.Tools`

| Method | Description |
|--------|-------------|
| `set(name)` | Activate a tool by name. |
| `current()` | Returns the active tool name string. |
| `register(name, config)` | Register a custom tool (see EXTENDING.md). |

### Built-in tools
`select` · `hand` · `rect` · `circle` · `triangle` · `star`
`pentagon` · `hexagon` · `diamond` · `arrow` · `line`
`text` · `pencil` · `eraser`

---

## `studio.Animations`

| Method | Description |
|--------|-------------|
| `apply(type)` | Apply animation to selected shape. Toggle off if already running. |
| `stopAll()` | Stop all running animations and restore shape states. |
| `animateAll()` | Apply one animation per shape (cycles through all 20 presets). |
| `stopFor(shapeId)` | Stop animation for a specific shape by its Konva `_id`. |
| `register(type, factory, meta)` | Register a custom animation (see EXTENDING.md). |

### Built-in presets
`pulse` · `spin` · `float` · `rainbow` · `shake` · `bounce`
`jello` · `flash` · `heartbeat` · `rubberband` · `swing` · `wobble`
`twinkle` · `orbit` · `wave` · `spiral` · `pop` · `glitch`
`pendulum` · `throb`

---

## `studio.Colors`

| Method | Description |
|--------|-------------|
| `current()` | Returns the active hex colour string. |
| `set(hex, swatchEl?)` | Set active colour, optionally highlight a swatch DOM element. |

---

## `studio.History`

| Method | Description |
|--------|-------------|
| `undo()` | Undo last action. |
| `redo()` | Redo last undone action. |
| `save()` | Manually push a history snapshot (called automatically on most actions). |
| `batch(fn)` |  — Execute multiple operations as a single undo step. |

### Batch Operations

Group multiple shape operations into a single undo/redo entry:

```js
studio.History.batch(() => {
  studio.Shapes.create('circle', { x: 100, y: 100 });
  studio.Shapes.create('rect', { x: 200, y: 200 });
  studio.Shapes.create('star', { x: 300, y: 300 });
});
// All 3 shapes created in one undo step
```

---

## `studio.PanZoom`

| Method | Description |
|--------|-------------|
| `zoom(delta)` | Zoom in/out. `delta` is a fraction: `0.1` = 10% zoom in. |
| `reset()` | Reset zoom to 100% and position to origin. |
| `fit()` | Fit all shapes on screen with padding. |

---

## `studio.Export`

| Method | Description |
|--------|-------------|
| `asPNG(filename?)` | Export canvas as 2x PNG with watermark. Triggers download. |
| `asSVG(filename?)` | Export canvas as SVG with watermark. Triggers download. |
| `asJSON(filename?)` | Export layer state as JSON. Triggers download. |
| `getState()` | — Returns structured JSON of all shapes (excludes watermark). |
| `loadState(json)` | — Restores canvas state from structured JSON. |

### Agent-Ready State Management

The `getState()` and `loadState()` methods provide a structured API for programmatic canvas manipulation:

```js
// Get current canvas state
const state = studio.Export.getState();
console.log(state);
// {
//   version: '1.0.0',
//   timestamp: '2026-02-20T10:30:00.000Z',
//   shapeCount: 3,
//   shapes: [
//     { id: 'uuid-123', type: 'Circle', x: 100, y: 100, radius: 50, ... },
//     { id: 'uuid-456', type: 'Rect', x: 200, y: 200, width: 100, ... },
//     ...
//   ]
// }

// Restore canvas state
studio.Export.loadState(state);
```

Each shape has a stable UUID (`id`) that persists across state save/load cycles.

### UUID-Based Shape Targeting

Every shape created gets a unique identifier accessible via `_publicId`:

```js
const circle = studio.Shapes.create('circle');
console.log(circle._publicId); // 'a0b1c2d3-...'

// Access shape by UUID later
const shape = studio.Shapes.getById(circle._publicId);
studio.Shapes.updateById(circle._publicId, { fill: '#ff0000' });
```

This enables reliable agent targeting without relying on Konva's internal `_id`.

---

## `studio.Theme`

| Method | Description |
|--------|-------------|
| `toggle()` | Toggle between dark and light mode. |
| `mode()` | Returns `'dark'` or `'light'`. |

---

## `studio.UI`

| Method | Description |
|--------|-------------|
| `toast(msg, duration?)` | Show a dismissing notification toast. |
| `onPropChange(key, value)` | Called by slider inputs — syncs values to the selected shape. |

---

## `studio.Events`

Raw EventBus for custom integrations.

```js
studio.Events.on('selection:change', shape => { });
studio.Events.on('tool:change',      ({ name, label, color }) => { });
studio.Events.on('stats:update',     () => { });
studio.Events.on('zoom:change',      ({ scale, percent }) => { });
studio.Events.on('animation:start',  ({ shapeId, type }) => { });
studio.Events.on('animation:stop',   ({ shapeId, type }) => { });
studio.Events.on('color:change',     ({ color }) => { });
studio.Events.on('theme:change',     ({ mode }) => { });
studio.Events.on('history:change',   ({ canUndo, canRedo }) => { });
studio.Events.on('core:resize',      () => { });
```

---

## `studio.Core`

Direct Konva access (for advanced usage):

```js
studio.Core.stage   // Konva.Stage
studio.Core.layer   // Konva.Layer
studio.Core.tr      // Konva.Transformer
studio.Core.pointer() // → { x, y } of current mouse pos on stage
studio.Core.width()
studio.Core.height()
studio.Core.watermark // Konva.Text — bottom-right attribution (non-interactive)
```

---

## Watermark Behavior

A non-interactive watermark ("AgentDraw Canvas") appears in the bottom-right corner of the canvas:

- **Always on top:** Stays above all shapes at all times
- **Non-draggable:** Cannot be moved or selected
- **Included in exports:** Appears in PNG and SVG exports for attribution
- **Excluded from state:** Not included in `getState()` JSON output
- **Cleared exclusion:** Survives "Clear All" operations
- **Auto-positioned:** Updates position on window resize

The watermark is part of the core layer but isolated from all shape operations.
