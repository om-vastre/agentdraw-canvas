/**
 * ShapeRegistry — extensible shape factory.
 *
 * Register custom shapes:
 *   services.shapes.register('cloud', (cfg) => new Konva.Group(cfg))
 *
 * Create shapes programmatically:
 *   services.shapes.create('rect', { x: 200, y: 150, width: 120, height: 80 })
 */
export function createShapeRegistry(services) {
  /** @type {Map<string, (cfg: object) => Konva.Node>} */
  const _registry = new Map();
  
  /** @type {Map<string, Konva.Node>} UUID → shape mapping for agent targeting */
  const _shapeMap = new Map();

  // ── Quick-add panel metadata ────────────────────────────────
  const QUICK_SHAPES = [
    { type:'rect',     icon:'⬜', label:'Rect' },
    { type:'circle',   icon:'⭕', label:'Circle' },
    { type:'triangle', icon:'▲',  label:'Triangle' },
    { type:'star',     icon:'⭐', label:'Star' },
    { type:'pentagon', icon:'⬠', label:'Pentagon' },
    { type:'hexagon',  icon:'⬡', label:'Hexagon' },
    { type:'arrow',    icon:'➤', label:'Arrow' },
    { type:'diamond',  icon:'◆', label:'Diamond' },
    { type:'heart',    icon:'♥',  label:'Heart' },
    { type:'text',     icon:'T',  label:'Text' },
  ];

  function register(type, factory) {
    _registry.set(type, factory);
  }

  function create(type, config = {}) {
    const factory = _registry.get(type);
    if (!factory) {
      console.warn(`[ShapeRegistry] Unknown type: "${type}"`);
      return null;
    }

    const base = {
      fill:          services.color.current(),
      stroke:        'rgba(0,0,0,0.25)',
      strokeWidth:   2,
      shadowColor:   'rgba(0,0,0,0.3)',
      shadowBlur:    8,
      shadowOffset:  { x: 2, y: 2 },
      shadowOpacity: 0.2,
      opacity:       0,
      draggable:     true,
    };

    const shape = factory({ ...base, ...config });
    if (!shape) return null;

    services.core.layer.add(shape);
    services.drawing.shiftToCenter(shape);
    services.interaction.makeInteractive(shape);

    // Keep watermark on top
    if (services.core.watermark) services.core.watermark.moveToTop();

    // Assign stable UUID for agent targeting
    const publicId = crypto.randomUUID();
    shape._publicId = publicId;
    _shapeMap.set(publicId, shape);

    // Entrance animation: scale up from tiny + fade in
    shape.scaleX(0.05); shape.scaleY(0.05);
    shape.to({
      opacity: 1, scaleX: 1, scaleY: 1,
      duration: 0.38,
      easing: Konva.Easings.ElasticEaseOut,
    });

    services.events.emit('stats:update');
    services.history.save();
    return shape;
  }

  function quickAdd(type) {
    const w  = services.core.width();
    const h  = services.core.height();
    const cx = w / 2 + (Math.random() * 120 - 60);
    const cy = h / 2 + (Math.random() * 80  - 40);

    const cfg = { x: cx, y: cy };
    if      (['rect','diamond'].includes(type))                              { cfg.width = 140; cfg.height = 100; }
    else if (['circle','triangle','pentagon','hexagon','star'].includes(type)) cfg.radius = 60;
    else if (type === 'arrow' || type === 'line')                             { cfg.points = [cx-80,cy,cx+80,cy]; cfg.x=0; cfg.y=0; }
    else if (type === 'text')                                                 { cfg.fontSize = services.drawing.fontSize; }
    return create(type, cfg);
  }

  function erase(shape) {
    services.animations.stopForShape(shape._id);
    shape.to({
      opacity: 0, scaleX: 0.35, scaleY: 0.35,
      duration: 0.2, easing: Konva.Easings.EaseIn,
      onFinish: () => {
        if (services.interaction.selected() === shape) services.interaction.deselect();
        // Clean up UUID mapping
        if (shape._publicId) _shapeMap.delete(shape._publicId);
        shape.destroy();
        services.events.emit('stats:update');
        services.history.save();
        services.core.layer.draw();
      },
    });
  }

  function duplicate() {
    const s = services.interaction.selected();
    if (!s) return services.ui.toast('Select a shape first');
    const clone = s.clone({ x: s.x() + 28, y: s.y() + 28 });
    services.interaction.makeInteractive(clone);
    services.core.layer.add(clone);
    
    if (services.core.watermark) services.core.watermark.moveToTop();
    clone.opacity(0);
    clone.to({ opacity: 1, duration: 0.28, easing: Konva.Easings.EaseOut });
    services.interaction.select(clone);
    services.events.emit('stats:update');
    services.history.save();
  }

  function deleteSelected() {
    const s = services.interaction.selected();
    if (!s) return services.ui.toast('Select a shape first');
    erase(s);
  }

  function clearAll() {
    if (!confirm('Clear all shapes?')) return;
    services.animations.stopAll();
    const shapes = services.core.layer.getChildren().filter(n => 
      n !== services.core.tr && n.name() !== 'watermark'
    );
    shapes.forEach((s, i) => s.to({
      opacity: 0, scaleX: 0, scaleY: 0,
      duration: 0.28, delay: i * 0.02,
      onFinish: () => s.destroy(),
    }));
    setTimeout(() => {
      services.interaction.deselect();
      services.events.emit('stats:update');
      services.history.save();
      services.core.layer.draw();
    }, shapes.length * 20 + 380);
  }

  function alignCenter() {
    const s = services.interaction.selected();
    if (!s) return services.ui.toast('Select a shape first');
    s.to({ x: services.core.width() / 2, y: services.core.height() / 2,
           duration: 0.35, easing: Konva.Easings.EaseInOut });
    services.history.save();
  }

  function toFront() {
    const s = services.interaction.selected();
    if (!s) return;
    s.moveToTop(); services.core.tr.moveToTop();
    // Keep watermark on top
    if (services.core.watermark) services.core.watermark.moveToTop();
    services.core.layer.draw(); services.history.save();
  }

  function toBack() {
    const s = services.interaction.selected();
    if (!s) return;
    s.moveToBottom();
    
    if (services.core.watermark) services.core.watermark.moveToTop();
    services.core.layer.draw(); services.history.save();
  }

  function flipH() {
    const s = services.interaction.selected();
    if (!s) return;
    s.scaleX(s.scaleX() * -1);
    services.core.layer.draw(); services.history.save();
  }

  function createRandom(n = 10) {
    const types   = ['rect','circle','triangle','star','pentagon','hexagon','diamond'];
    const palette = ['#6c63ff','#ff63b8','#06d6a0','#ffd166','#f72585','#4cc9f0','#fb8500','#ef233c'];
    const saved   = services.color.current();
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        services.color.set(palette[i % palette.length], null);
        quickAdd(types[i % types.length]);
      }, i * 70);
    }
    setTimeout(() => services.color.set(saved, null), n * 70 + 80);
  }

  function initQuickPanel(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    QUICK_SHAPES.forEach(({ type, icon, label }) => {
      const btn = document.createElement('button');
      btn.className = 'cs-shape-btn';
      btn.innerHTML = `${icon}<span>${label}</span>`;
      btn.onclick = () => quickAdd(type);
      grid.appendChild(btn);
    });
  }

  function getById(id) {
    return _shapeMap.get(id) || null;
  }

  function selectById(id) {
    const shape = _shapeMap.get(id);
    if (!shape) return false;
    services.interaction.select(shape);
    return true;
  }

  function updateById(id, props) {
    const shape = _shapeMap.get(id);
    if (!shape) return false;
    shape.setAttrs(props);
    services.core.layer.draw();
    services.history.save();
    return true;
  }

  function listIds() {
    return Array.from(_shapeMap.keys());
  }

  return {
    register, create, quickAdd, erase,
    duplicate, deleteSelected, clearAll,
    alignCenter, toFront, toBack, flipH, createRandom,
    initQuickPanel,
    
    getById, selectById, updateById, listIds,
    shapeMap: _shapeMap,  // Expose for loadState()
  };
}
