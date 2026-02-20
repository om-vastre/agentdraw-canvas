/**
 * Built-in tool definitions — registers all default tools into the ToolRegistry.
 * Import and call registerBuiltinTools(services) during bootstrap.
 */
export function registerBuiltinTools(services) {
  const { tools } = services;

  // ── STICKY NOTE ───────────────────────────────────────────────
  tools.register('sticky', {
    label: 'Sticky Note', icon: '🗒️', shortcut: 'N', cursor: 'crosshair',
    onMousedown(e, svc) {
      if (e.target !== svc.core.stage) return;
      svc.sticky?.place(svc.core.pointer());
    },
  });

  // ── IMAGE ─────────────────────────────────────────────────────
  tools.register('image', {
    label: 'Image', icon: '🖼️', shortcut: 'I', cursor: 'default',
    onActivate(svc) {
      svc.imageUpload?.trigger();
    },
  });

  // ── SELECT ────────────────────────────────────────────────────
  tools.register('select', {
    label: 'Select', icon: '⌖', shortcut: 'V', cursor: 'default',
    onMousedown(e, svc) {
      if (e.target === svc.core.stage) svc.interaction.deselect();
    },
  });

  // ── HAND (PAN) ────────────────────────────────────────────────
  tools.register('hand', {
    label: 'Pan', icon: '✋', shortcut: 'H', cursor: 'grab',
  });

  // ── DRAW SHAPES — shared drag-draw ────────────────────────────
  const DRAW_TOOLS = {
    rect:          { label: 'Rectangle',    icon: '⬜', shortcut: 'R' },
    circle:        { label: 'Circle',       icon: '⭕', shortcut: 'C' },
    triangle:      { label: 'Triangle',     icon: '▲',  shortcut: 'T' },
    star:          { label: 'Star',         icon: '⭐', shortcut: 'S' },
    pentagon:      { label: 'Pentagon',     icon: '⬠', shortcut: null },
    hexagon:       { label: 'Hexagon',      icon: '⬡', shortcut: null },
    diamond:       { label: 'Diamond',      icon: '◆', shortcut: null },
    heart:         { label: 'Heart',        icon: '♥', shortcut: null },
    arrow:         { label: 'Arrow',        icon: '➤', shortcut: 'A' },
    line:          { label: 'Line',         icon: '╱', shortcut: 'L' },
  };

  Object.entries(DRAW_TOOLS).forEach(([type, meta]) => {
    tools.register(type, {
      ...meta, cursor: 'crosshair',
      onMousedown(e, svc) {
        if (e.target !== svc.core.stage) return;
        svc.drawing.startDrag(type, svc.core.pointer());
      },
      onMousemove(e, svc) { svc.drawing.moveDrag(type, svc.core.pointer()); },
      onMouseup(e, svc)   { svc.drawing.endDrag(type); },
    });
  });

  // ── TEXT ──────────────────────────────────────────────────────
  tools.register('text', {
    label: 'Text', icon: 'T', shortcut: 'X', cursor: 'text',
    onMousedown(e, svc) {
      if (e.target !== svc.core.stage) return;
      svc.text.placeAt(svc.core.pointer());
    },
  });

  // ── PENCIL ────────────────────────────────────────────────────
  tools.register('pencil', {
    label: 'Pencil', icon: '✏️', shortcut: 'D', cursor: 'none',
    onMousedown(e, svc) { svc.drawing.startPencil(svc.core.pointer()); },
    onMousemove(e, svc) { svc.drawing.movePencil(svc.core.pointer()); },
    onMouseup(e, svc)   { svc.drawing.endPencil(); },
  });

  // ── ERASER ────────────────────────────────────────────────────
  tools.register('eraser', {
    label: 'Eraser', icon: '◉', shortcut: 'E', cursor: 'none',
  });
}

/** Bottom toolbar order. '---' = separator, 'shapes' = shape-picker button */
export const TOOLBAR_ORDER = [
  'select', 'hand',
  '---',
  'pencil', 'eraser',
  '---',
  'arrow',
  'text', 'sticky',
  '---',
  'image',
  'shapes',   // opens shape picker popup
];
