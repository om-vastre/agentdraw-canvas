# Extending AgentDraw canvas — Plugin Guide

AgentDraw canvas is designed to be extended without modifying core files.
Everything is registered at runtime, making plugins trivially composable.

---

## Custom Shapes

Register a factory function that receives a merged config object and returns a `Konva.Node`.

```js
// Simple shape
studio.Shapes.register('rounded-rect', cfg =>
  new Konva.Rect({ ...cfg, cornerRadius: 20 })
);

// Complex composite shape (Group)
studio.Shapes.register('cloud', cfg => {
  const group = new Konva.Group({ x: cfg.x, y: cfg.y, draggable: true });
  [
    { x: 0,  y: 0,  r: 30 },
    { x: 40, y:-10, r: 35 },
    { x: 75, y: 0,  r: 30 },
    { x: 20, y: 15, r: 25 },
  ].forEach(b =>
    group.add(new Konva.Circle({ x: b.x, y: b.y, radius: b.r, fill: cfg.fill }))
  );
  return group;
});

studio.Shapes.quickAdd('cloud');
```

The `cfg` object contains:
- All properties from the base config (fill, stroke, shadowBlur, opacity, draggable, …)
- Any custom properties you passed to `create(type, config)`

---

## Custom Animations

Register a factory that receives `(shape, state, layer)` and returns a `Konva.Animation`.

```js
studio.Animations.register(
  'disco',                           // unique type key
  (shape, state, layer) =>
    new Konva.Animation(frame => {
      // state contains all original values — use them as baselines
      shape.rotation(state.origRot + frame.time / 500 * 360);
      if (shape.fill) shape.fill(`hsl(${frame.time / 5 % 360}, 80%, 60%)`);
    }, layer),
  { icon: '🪩', label: 'Disco' }    // panel button metadata
);
```

### `state` object

| Key | Description |
|-----|-------------|
| `origX`, `origY` | Position at animation start |
| `origRot` | Rotation at animation start |
| `origScaleX`, `origScaleY` | Scale at animation start |
| `origOpacity` | Opacity at animation start |
| `origFill` | Fill colour at animation start |
| `origShadowBlur` | Shadow blur at animation start |

> ⚠️ The AnimationRegistry automatically shifts `offsetX/Y` to the shape's visual
> centre before calling your factory, so rotations/scales look correct. Do not
> manually set `offsetX/Y` inside the animation.

Return `null` from your factory to silently skip shapes that aren't compatible
(e.g. skip rainbow on shapes without a fill).

---

## Custom Tools

Register a tool config object. The tool lifecycle is:

```
onActivate → [ onMousedown → onMousemove → onMouseup ] × N → onDeactivate
```

```js
studio.Tools.register('stamp', {
  label:    'Stamp',           // shown in header + toolbar tooltip
  icon:     '🔖',             // toolbar button emoji/text
  shortcut: 'Q',              // keyboard shortcut
  cursor:   'crosshair',      // CSS cursor (use 'none' for custom cursors)

  onActivate(services) {
    services.ui.toast('Stamp tool active — click to stamp!');
  },

  onMousedown(e, services) {
    if (e.target !== services.core.stage) return;
    const pos = services.core.pointer();
    services.color.set('#ffd166', null);
    services.shapes.create('star', { x: pos.x, y: pos.y, radius: 40 });
  },

  onDeactivate(services) {
    // cleanup if needed
  },
});

// Activate it
studio.Tools.set('stamp');
```

### `services` reference

The `services` object passed to tool handlers contains all modules:

```js
services.core        // CoreModule  (stage, layer, tr, pointer)
services.events      // EventBus
services.ui          // UIModule    (toast, onPropChange)
services.color       // ColorModule (current, set)
services.interaction // InteractionModule (select, deselect, selected, makeInteractive)
services.drawing     // DrawingModule (startPencil, movePencil, endPencil, startDrag…)
services.shapes      // ShapeRegistry (create, quickAdd, erase…)
services.tools       // ToolRegistry (setActive, active)
services.animations  // AnimationRegistry (apply, stopAll…)
services.text        // TextModule (placeAt, startEdit, commitEdit)
services.panzoom     // PanZoomModule (zoom, resetZoom, fitScreen)
services.history     // HistoryModule (save, undo, redo)
services.theme       // ThemeModule (toggle, mode)
```

---

## Listening to Events

```js
studio.Events.on('selection:change', shape => {
  if (shape) console.log('Selected type:', shape.getClassName());
});

// Unsubscribe
const unsub = studio.Events.on('zoom:change', ({ percent }) => {
  document.title = `AgentDraw canvas — ${percent}`;
});
unsub(); // removes listener
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-plugin`
3. Add your files to `src/shapes/`, `src/animations/`, or `src/tools/`
4. Register in `src/CanvasStudio.js` under "Register built-ins"
5. Add docs and an example in `examples/`
6. Open a pull request
