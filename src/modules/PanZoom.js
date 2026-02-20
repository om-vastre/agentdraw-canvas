/**
 * PanZoom — smooth wheel-zoom (toward cursor), middle-mouse/space pan,
 * hand-tool drag, keyboard zoom, fit-to-screen, and reset.
 *
 * Emits:
 *   'zoom:change' — { scale, percent }
 */
export function createPanZoom(services) {
  const { events } = services;
  const { stage }  = services.core;

  const MIN = 0.05, MAX = 10;
  let targetScale = 1, targetX = 0, targetY = 0;
  let _rafId = null;
  let _isPanning = false, _panStart = null;
  let _spaceDown = false;
  let _handPanning = false, _handStart = null;

  // ── Smooth lerp ────────────────────────────────────────────────
  function _lerp() {
    const SPEED = 0.15;
    const cs = stage.scaleX();
    const cx = stage.x(), cy = stage.y();

    const ns = cs + (targetScale - cs) * SPEED;
    const nx = cx + (targetX - cx)     * SPEED;
    const ny = cy + (targetY - cy)     * SPEED;

    stage.scale({ x: ns, y: ns });
    stage.position({ x: nx, y: ny });
    stage.batchDraw();
    _updateLabel(ns);

    const moving = Math.abs(ns - targetScale) > 0.0005
                || Math.abs(nx - targetX) > 0.08
                || Math.abs(ny - targetY) > 0.08;

    if (moving) _rafId = requestAnimationFrame(_lerp);
    else {
      stage.scale({ x: targetScale, y: targetScale });
      stage.position({ x: targetX, y: targetY });
      stage.batchDraw();
      _updateLabel(targetScale);
      _rafId = null;
    }
  }

  function _startLerp() {
    if (!_rafId) _rafId = requestAnimationFrame(_lerp);
  }

  function _updateLabel(s) {
    const pct = Math.round(s * 100) + '%';
    const el = document.getElementById('zoom-label');
    if (el) el.textContent = pct;
    events.emit('zoom:change', { scale: s, percent: Math.round(s * 100) });
  }

  function _clampedScale(val) {
    return Math.min(MAX, Math.max(MIN, val));
  }

  // ── Wheel zoom toward cursor ───────────────────────────────────
  stage.on('wheel', e => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer  = stage.getPointerPosition();
    const dir      = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = _clampedScale(oldScale * (1 + dir * 0.1));

    const mpTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    targetScale = newScale;
    targetX = pointer.x - mpTo.x * newScale;
    targetY = pointer.y - mpTo.y * newScale;
    _startLerp();
  });

  // ── Middle-mouse + Space drag pan ──────────────────────────────
  stage.container().addEventListener('mousedown', e => {
    if (e.button === 1 || _spaceDown) {
      _isPanning = true;
      _panStart  = { x: e.clientX - stage.x(), y: e.clientY - stage.y() };
      stage.container().style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', e => {
    if (_isPanning && _panStart) {
      targetX = e.clientX - _panStart.x;
      targetY = e.clientY - _panStart.y;
      stage.position({ x: targetX, y: targetY });
      stage.batchDraw();
      _updateLabel(stage.scaleX());
    }
  });

  document.addEventListener('mouseup', () => {
    if (_isPanning) {
      _isPanning = false; _panStart = null;
      const tool = services.tools?.active();
      stage.container().style.cursor = tool === 'hand' ? 'grab' : 'default';
    }
  });

  // ── Space bar temp pan ─────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.target.matches('textarea,input')) {
      _spaceDown = true;
      stage.container().style.cursor = 'grab';
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      _spaceDown = false;
      const tool = services.tools?.active();
      stage.container().style.cursor = tool === 'hand' ? 'grab' : 'default';
    }
  });

  // ── Hand tool drag ─────────────────────────────────────────────
  events.on('tool:change', ({ name }) => {
    if (name === 'hand') stage.container().style.cursor = 'grab';
  });

  stage.on('mousedown', e => {
    if (services.tools?.active() !== 'hand') return;
    _handPanning = true;
    _handStart   = { x: e.evt.clientX - stage.x(), y: e.evt.clientY - stage.y() };
    stage.container().style.cursor = 'grabbing';
  });
  stage.on('mousemove', e => {
    if (!_handPanning || !_handStart) return;
    targetX = e.evt.clientX - _handStart.x;
    targetY = e.evt.clientY - _handStart.y;
    stage.position({ x: targetX, y: targetY });
    stage.batchDraw();
    _updateLabel(stage.scaleX());
  });
  stage.on('mouseup', () => {
    if (_handPanning) { _handPanning = false; _handStart = null; }
    if (services.tools?.active() === 'hand')
      stage.container().style.cursor = 'grab';
  });

  // ── Public API ─────────────────────────────────────────────────
  function zoom(delta) {
    const os = stage.scaleX();
    const ns = _clampedScale(os + delta * os);
    const cx = stage.width()  / 2;
    const cy = stage.height() / 2;
    const mp = { x: (cx - stage.x()) / os, y: (cy - stage.y()) / os };
    targetScale = ns;
    targetX = cx - mp.x * ns;
    targetY = cy - mp.y * ns;
    _startLerp();
  }

  function resetZoom() {
    targetScale = 1; targetX = 0; targetY = 0; _startLerp();
  }

  function fitScreen() {
    const shapes = services.core.layer
      .getChildren().filter(s => s !== services.core.tr && s.name() !== 'watermark');
    if (shapes.length === 0) return resetZoom();

    const box = services.core.layer.getClientRect({ skipTransform: true });
    if (!box.width || !box.height) return resetZoom();
    const pad = 80;
    const sw  = stage.width()  - pad * 2;
    const sh  = stage.height() - pad * 2;
    const s   = _clampedScale(Math.min(sw / box.width, sh / box.height, 2));
    targetScale = s;
    targetX = (stage.width()  - box.width  * s) / 2 - box.x * s;
    targetY = (stage.height() - box.height * s) / 2 - box.y * s;
    _startLerp();
  }

  return { zoom, resetZoom, fitScreen };
}
