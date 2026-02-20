/**
 * UI — all DOM-level feedback: stats bar, toast, tooltip, cursor overlays,
 * property panel sync, and tool-label indicator.
 */
export function createUI(services) {
  const { events } = services;

  // ── Stats bar (removed from UI, keeping event handlers for extension points) ───────────────────────────────────────────────
  events.on('stats:update', () => {
    // Stats overlay removed - extension point for custom UI
  });

  events.on('selection:change', shape => {
    if (shape) _syncPropsFromShape(shape);
  });

  events.on('tool:change', ({ label, color }) => {
    _set('tool-label', label);
    const dot = document.getElementById('tool-dot');
    if (dot) dot.style.background = color || 'var(--accent)';
  });

  // ── FPS counter (removed from UI) ─────────────────────────────────────────────
  // Extension point: implement custom FPS display if needed

  // ── Toast ───────────────────────────────────────────────────
  let _toastTimer;
  function toast(msg, duration = 2200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ── Cursor overlays ─────────────────────────────────────────
  const eraserCursor = document.getElementById('cursor-eraser');
  const pencilCursor = document.getElementById('cursor-pencil');

  document.addEventListener('mousemove', e => {
    const tool = services.tools?.active();
    if (tool === 'eraser' && eraserCursor) {
      eraserCursor.style.display = 'block';
      eraserCursor.style.left = e.clientX + 'px';
      eraserCursor.style.top  = e.clientY + 'px';
    } else if (eraserCursor) {
      eraserCursor.style.display = 'none';
    }

    if (tool === 'pencil' && pencilCursor) {
      pencilCursor.style.display = 'block';
      pencilCursor.style.left = e.clientX + 'px';
      pencilCursor.style.top  = e.clientY + 'px';
      pencilCursor.style.background = services.color?.current() || 'var(--accent)';
      const sz = Math.max(6, Math.min(services.drawing?.pencilSize ?? 4, 28));
      pencilCursor.style.width  = sz + 'px';
      pencilCursor.style.height = sz + 'px';
    } else if (pencilCursor) {
      pencilCursor.style.display = 'none';
    }
  });

  // ── Property panel — sync slider → shape ───────────────────
  function onPropChange(key, rawVal) {
    const val = Number(rawVal);
    const fmts = {
      opacity: v => v + '%', rotation: v => v + '°',
      shadow: v => v, strokeWidth: v => v,
      pencilSize: v => v + 'px', fontSize: v => v + 'px',
    };
    const label = document.getElementById('v-' + key);
    if (label && fmts[key]) label.textContent = fmts[key](val);

    // Non-shape props
    if (key === 'pencilSize') { if (services.drawing) services.drawing.pencilSize = val; return; }
    if (key === 'fontSize')   { if (services.drawing) services.drawing.fontSize   = val; }

    const shape = services.interaction?.selected();
    if (!shape) return;
    if (key === 'opacity')     shape.opacity(val / 100);
    if (key === 'rotation')    shape.rotation(val);
    if (key === 'shadow')      shape.shadowBlur?.(val);
    if (key === 'strokeWidth' && shape.getClassName() !== 'Text') shape.strokeWidth?.(val);
    if (key === 'fontSize' && shape.getClassName() === 'Text') shape.fontSize(val);
    services.core.layer.batchDraw();
    services.history.save();
  }

  function _syncPropsFromShape(shape) {
    _slider('opacity',     Math.round(shape.opacity() * 100), '%');
    _slider('rotation',    Math.round(shape.rotation()),      '°');
    _slider('shadow',      shape.shadowBlur ? Math.round(shape.shadowBlur()) : 0, '');
    _slider('strokeWidth', shape.strokeWidth ? Math.round(shape.strokeWidth()) : 0, '');
  }

  function _slider(key, val, suffix) {
    const el = document.querySelector(`[data-prop="${key}"]`);
    if (el) el.value = val;
    const label = document.getElementById('v-' + key);
    if (label) label.textContent = val + suffix;
  }

  function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { toast, onPropChange };
}
