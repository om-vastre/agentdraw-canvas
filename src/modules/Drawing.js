/**
 * Drawing — pencil freehand drawing and drag-to-create shape engine.
 * Tools call these methods from their mousedown/mousemove/mouseup handlers.
 */
export function createDrawing(services) {
  let pencilSize   = 4;
  let fontSize     = 24;
  let _isDrawing   = false;
  let _pencilLine  = null;
  let _isDrag      = false;
  let _dragStart   = null;
  let _tempShape   = null;

  // ── Pencil ────────────────────────────────────────────────────
  function startPencil(pos) {
    _isDrawing = true;
    _pencilLine = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: services.color.current(),
      strokeWidth: pencilSize,
      lineCap: 'round',
      lineJoin: 'round',
      tension: 0.4,
      draggable: true,
    });
    services.core.layer.add(_pencilLine);
  }

  function movePencil(pos) {
    if (!_isDrawing || !_pencilLine) return;
    _pencilLine.points([..._pencilLine.points(), pos.x, pos.y]);
    services.core.layer.batchDraw();
  }

  function endPencil() {
    if (!_isDrawing) return;
    _isDrawing = false;
    if (!_pencilLine) return;
    if (_pencilLine.points().length < 6) {
      _pencilLine.destroy();
    } else {
      services.interaction.makeInteractive(_pencilLine);
      if (services.core.watermark) services.core.watermark.moveToTop();
      services.history.save();
      services.core.layer.draw();
      services.events.emit('stats:update');
    }
    _pencilLine = null;
  }

  // ── Drag-draw (shapes) ────────────────────────────────────────
  function startDrag(type, pos) {
    _isDrag    = true;
    _dragStart = { ...pos };
    const color = services.color.current();

    const common = { fill: color, stroke: '#33333380', strokeWidth: 2, opacity: 0.72, dash: [5,3] };

    if      (type === 'rect')    _tempShape = new Konva.Rect({ ...common, x: pos.x, y: pos.y, width: 0, height: 0 });
    else if (type === 'circle')  _tempShape = new Konva.Circle({ ...common, x: pos.x, y: pos.y, radius: 0 });
    else if (['triangle','pentagon','hexagon','diamond'].includes(type)) {
      const sides = { triangle:3, diamond:4, pentagon:5, hexagon:6 }[type];
      _tempShape = new Konva.RegularPolygon({ ...common, x: pos.x, y: pos.y, sides, radius: 0 });
    }
    else if (type === 'star')   _tempShape = new Konva.Star({ ...common, x: pos.x, y: pos.y, numPoints: 5, innerRadius: 0, outerRadius: 0 });
    else if (type === 'heart')  _tempShape = new Konva.Path({ ...common, x: pos.x, y: pos.y, data: 'M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z', scale: { x: 0, y: 0 } });
    else if (type === 'arrow')  _tempShape = new Konva.Arrow({ points: [pos.x,pos.y,pos.x,pos.y], stroke: color, fill: color, strokeWidth: 4, opacity: 0.72, pointerLength:14, pointerWidth:14 });
    else if (type === 'line')   _tempShape = new Konva.Line({ points: [pos.x,pos.y,pos.x,pos.y], stroke: color, strokeWidth: 4, lineCap:'round', opacity: 0.72 });

    if (_tempShape) services.core.layer.add(_tempShape);
  }

  function moveDrag(type, pos) {
    if (!_isDrag || !_tempShape) return;
    const sp = _dragStart;
    if (type === 'rect') {
      const w = pos.x - sp.x, h = pos.y - sp.y;
      _tempShape.x(w < 0 ? pos.x : sp.x); _tempShape.y(h < 0 ? pos.y : sp.y);
      _tempShape.width(Math.abs(w));       _tempShape.height(Math.abs(h));
    } else if (type === 'circle') {
      _tempShape.radius(Math.hypot(pos.x - sp.x, pos.y - sp.y));
    } else if (['triangle','pentagon','hexagon','diamond'].includes(type)) {
      _tempShape.radius(Math.hypot(pos.x - sp.x, pos.y - sp.y));
    } else if (type === 'star') {
      const r = Math.hypot(pos.x - sp.x, pos.y - sp.y);
      _tempShape.outerRadius(r); _tempShape.innerRadius(r * 0.42);
    } else if (type === 'heart') {
      const scale = Math.hypot(pos.x - sp.x, pos.y - sp.y) / 30;  // Scale from distance
      _tempShape.scale({ x: scale, y: scale });
    } else if (type === 'arrow' || type === 'line') {
      _tempShape.points([sp.x, sp.y, pos.x, pos.y]);
    }
    services.core.layer.batchDraw();
  }

  function endDrag(type) {
    if (!_isDrag) return;
    _isDrag = false;
    if (!_tempShape) return;

    // Min-size guard
    let tooSmall = false;
    const cls = _tempShape.getClassName();
    if (cls === 'Rect')  tooSmall = Math.abs(_tempShape.width()) < 6 || Math.abs(_tempShape.height()) < 6;
    else if (_tempShape.outerRadius) tooSmall = _tempShape.outerRadius() < 6;
    else if (_tempShape.radius)      tooSmall = _tempShape.radius() < 6;
    else if (_tempShape.points) {
      const p = _tempShape.points();
      tooSmall = Math.hypot(p[2]-p[0], p[3]-p[1]) < 10;
    }

    if (tooSmall) {
      _tempShape.destroy();
    } else {
      _tempShape.dash([]);
      _tempShape.opacity(1);
      _tempShape.shadowColor('rgba(0,0,0,0.3)');
      _tempShape.shadowBlur(8);
      _tempShape.shadowOffset({ x: 2, y: 2 });
      _tempShape.draggable(true);
      _shiftToCenter(_tempShape);
      services.interaction.makeInteractive(_tempShape);
      // Keep watermark on top
      if (services.core.watermark) services.core.watermark.moveToTop();
      services.history.save();
      services.events.emit('stats:update');
    }
    _tempShape = null;
    services.core.layer.draw();
  }

  /** Shift offsetX/Y to visual centre so scale/rotation work correctly. */
  function _shiftToCenter(shape) {
    // Groups don't have getSelfRect(), use getClientRect() as fallback
    const r  = shape.getSelfRect ? shape.getSelfRect() : shape.getClientRect();
    const cx = r.x + r.width  / 2;
    const cy = r.y + r.height / 2;
    const dx = cx - shape.offsetX();
    const dy = cy - shape.offsetY();
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    shape.offsetX(cx); shape.offsetY(cy);
    shape.x(shape.x() + dx); shape.y(shape.y() + dy);
  }

  return {
    get pencilSize() { return pencilSize; },
    set pencilSize(v) { pencilSize = v; },
    get fontSize()   { return fontSize; },
    set fontSize(v)  { fontSize = v; },
    startPencil, movePencil, endPencil,
    startDrag, moveDrag, endDrag,
    shiftToCenter: _shiftToCenter,
  };
}
