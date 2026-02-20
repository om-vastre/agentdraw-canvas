/**
 * AnimationRegistry — extensible animation engine with centre-origin fix.
 *
 * Register custom animations:
 *   services.animations.register('myAnim', (shape, state, layer) => {
 *     return new Konva.Animation(frame => {
 *       shape.rotation(state.origRot + frame.time / 10);
 *     }, layer);
 *   })
 *
 * The factory receives:
 *   shape  — the Konva node
 *   state  — { origX, origY, origRot, origScaleX, origScaleY, origOpacity, origFill, ... }
 *   layer  — the Konva layer (for Konva.Animation constructor)
 *
 * Emits:
 *   'animation:start' — { shapeId, type }
 *   'animation:stop'  — { shapeId, type }
 */
export function createAnimationRegistry(services) {
  const { events } = services;
  /** @type {Map<string, { factory: Function, meta: object }>} */
  const _registry = new Map();
  /** @type {Map<number, { anim: Konva.Animation, state: object, type: string }>} */
  const _running  = new Map();

  const PANEL_ORDER = [
    'pulse','spin','float','rainbow','shake','bounce',
    'jello','flash','heartbeat','rubberband','swing','wobble',
    'twinkle','orbit','wave','spiral','pop','glitch','pendulum','throb',
  ];

  function register(type, factory, meta = {}) {
    _registry.set(type, { factory, meta });
  }

  // ── Centre-origin shift ───────────────────────────────────────
  function _shiftToCenter(shape) {
    const r  = shape.getSelfRect();
    const cx = r.x + r.width  / 2;
    const cy = r.y + r.height / 2;
    const dx = cx - shape.offsetX();
    const dy = cy - shape.offsetY();
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return { dx: 0, dy: 0 };
    shape.offsetX(cx); shape.offsetY(cy);
    shape.x(shape.x() + dx); shape.y(shape.y() + dy);
    return { dx, dy };
  }

  function stopForShape(shapeId) {
    const entry = _running.get(shapeId);
    if (!entry) return;

    entry.anim.stop();
    const s = entry.state;
    const shape = s.shape;
    const alive = shape && shape.getLayer?.();

    if (alive) {
      // Instant restore — no async tween (avoids animation conflicts)
      shape.offsetX(s.origOffsetX);
      shape.offsetY(s.origOffsetY);
      shape.x(s.origX - s.dx);
      shape.y(s.origY - s.dy);
      shape.rotation(s.origRot);
      shape.scaleX(s.origScaleX);
      shape.scaleY(s.origScaleY);
      shape.opacity(s.origOpacity);
      if (shape.shadowBlur)            shape.shadowBlur(s.origShadowBlur);
      if (shape.shadowColor)           shape.shadowColor(s.origShadowColor);
      if (s.origFill && shape.fill)    shape.fill(s.origFill);
    }

    _running.delete(shapeId);
    const btn = document.getElementById(`cs-anim-${entry.type}`);
    if (btn) btn.classList.remove('running');
    services.core.layer.draw();
    events.emit('animation:stop', { shapeId, type: entry.type });
  }

  function apply(type) {
    const shape = services.interaction.selected();
    if (!shape) return services.ui.toast('Select a shape first');

    const entry = _registry.get(type);
    if (!entry) return console.warn(`[AnimationRegistry] Unknown: "${type}"`);

    const shapeId = shape._id;

    // Toggle off if same type; stop old if different
    if (_running.has(shapeId)) {
      const prev = _running.get(shapeId).type;
      stopForShape(shapeId);
      if (prev === type) return;
    }

    const { dx, dy } = _shiftToCenter(shape);

    const state = {
      shape, dx, dy,
      origX:          shape.x(),
      origY:          shape.y(),
      origRot:        shape.rotation(),
      origScaleX:     shape.scaleX(),
      origScaleY:     shape.scaleY(),
      origOpacity:    shape.opacity(),
      origFill:       shape.fill ? shape.fill() : null,
      origShadowBlur: shape.shadowBlur ? shape.shadowBlur() : 0,
      origShadowColor:shape.shadowColor ? shape.shadowColor() : 'black',
      origOffsetX:    shape.offsetX() - dx,
      origOffsetY:    shape.offsetY() - dy,
    };

    const anim = entry.factory(shape, state, services.core.layer);
    if (!anim) return;

    _running.set(shapeId, { anim, state, type });
    anim.start();

    const btn = document.getElementById(`cs-anim-${type}`);
    if (btn) btn.classList.add('running');
    events.emit('animation:start', { shapeId, type });
  }

  function stopAll(silent = false) {
    [..._running.keys()].forEach(stopForShape);
    if (!silent) services.ui.toast('All animations stopped');
  }

  function animateAll() {
    const types  = PANEL_ORDER;
    const shapes = services.core.layer
      .getChildren()
      .filter(s => s !== services.core.tr && s.draggable?.() && s.name() !== 'watermark');

    shapes.forEach((shape, i) => {
      services.interaction.select(shape);
      apply(types[i % types.length]);
    });
    services.ui.toast(`Animating ${shapes.length} shapes ✦`);
  }

  function initPanel(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    PANEL_ORDER.forEach(type => {
      const entry = _registry.get(type);
      if (!entry) return;
      const { icon = '✦', label = type } = entry.meta;
      const btn = document.createElement('button');
      btn.className = 'cs-anim-btn';
      btn.id = `cs-anim-${type}`;
      btn.textContent = `${icon} ${label}`;
      btn.onclick = () => apply(type);
      grid.appendChild(btn);
    });
  }

  return { register, apply, stopForShape, stopAll, animateAll, initPanel };
}
