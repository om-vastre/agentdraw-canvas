/**
 * StickyNote — places draggable sticky note cards on the canvas.
 * Each sticky is a Konva.Group containing a Rect + Text.
 * Double-click the text to inline-edit it.
 */

const STICKY_COLORS = ['#fef08a','#86efac','#93c5fd','#f9a8d4','#fdba74','#c4b5fd'];
let _nextColor = 0;

export function createStickyNote(services) {

  function place(pos) {
    const color = STICKY_COLORS[_nextColor % STICKY_COLORS.length];
    _nextColor++;

    const W = 180, H = 160;

    const group = new Konva.Group({
      x: pos.x - W / 2,
      y: pos.y - H / 2,
      draggable: true,
      opacity: 0,
    });

    // Shadow card
    const shadow = new Konva.Rect({
      width: W, height: H,
      fill: 'rgba(0,0,0,0.12)',
      cornerRadius: 3,
      x: 4, y: 6,
    });

    // Card body
    const card = new Konva.Rect({
      width: W, height: H,
      fill: color,
      cornerRadius: 3,
      strokeWidth: 0,
    });

    // Fold triangle (bottom-right dog-ear)
    const fold = new Konva.Line({
      points: [W - 28, H, W, H - 28, W, H],
      closed: true,
      fill: 'rgba(0,0,0,0.1)',
      strokeWidth: 0,
    });

    // Text
    const label = new Konva.Text({
      text: 'Double Click to edit…',
      x: 12, y: 12,
      width: W - 24,
      height: H - 24,
      fontSize: 14,
      fontFamily: "'Kalam', cursive",
      fill: '#1a1a2e',
      align: 'left',
      wrap: 'word',
      lineHeight: 1.5,
      ellipsis: true,
    });

    group.add(shadow, card, fold, label);
    services.core.layer.add(group);
    services.drawing.shiftToCenter(group);

    if (services.core.watermark) services.core.watermark.moveToTop();

    // Create scrollable HTML overlay
    const textOverlay = _createTextOverlay(group, label, color);
    
    // Hide the Konva text since we're using HTML overlay
    label.visible(false);

    // Entrance
    group.to({ opacity: 1, duration: 0.28, easing: Konva.Easings.BackEaseOut });

    // Update overlay position on drag/transform
    const updateOverlay = () => _updateOverlayPosition(group, label, textOverlay);
    group.on('dragmove', updateOverlay);
    group.on('transform', updateOverlay);
    services.core.stage.on('scaleChange', updateOverlay);

    // Interaction
    group.on('mouseenter', () => {
      if (services.tools.active() === 'select')
        services.core.stage.container().style.cursor = 'move';
    });
    group.on('mouseleave', () => {
      services.core.stage.container().style.cursor = 'default';
    });
    group.on('click tap', e => {
      e.cancelBubble = true;
      if (services.tools.active() === 'eraser') {
        textOverlay.remove();
        services.shapes.erase(group);
        return;
      }
      services.interaction.select(group);
    });
    group.on('dblclick', () => _startEdit(group, label, color, textOverlay));
    group.on('dragend', () => services.history.save());

    services.events.emit('stats:update');
    services.history.save();
    services.tools.setActive('select');
    return group;
  }

  function _createTextOverlay(group, label, bgColor) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'pointer';
    overlay.style.fontFamily = "'Kalam', cursive";
    overlay.style.fontSize = '14px';
    overlay.style.color = '#1a1a2e';
    overlay.style.lineHeight = '1.5';
    overlay.style.padding = '4px';
    overlay.style.overflowY = 'auto';
    overlay.style.overflowX = 'hidden';
    overlay.style.wordWrap = 'break-word';
    overlay.style.whiteSpace = 'pre-wrap';
    overlay.textContent = label.text();
    
    // Custom scrollbar styling matching the sticky note color
    const scrollbarColor = _darkenColor(bgColor, 0.3);
    const style = document.createElement('style');
    const uniqueId = 'sticky-' + Date.now() + Math.random().toString(36).substr(2, 9);
    overlay.classList.add(uniqueId);
    style.textContent = `
      .${uniqueId}::-webkit-scrollbar { width: 8px; }
      .${uniqueId}::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 4px; }
      .${uniqueId}::-webkit-scrollbar-thumb { background: ${scrollbarColor}; border-radius: 4px; }
      .${uniqueId}::-webkit-scrollbar-thumb:hover { background: ${_darkenColor(bgColor, 0.4)}; }
      .${uniqueId} { scrollbar-color: ${scrollbarColor} rgba(0,0,0,0.05); scrollbar-width: thin; }
    `;
    document.head.appendChild(style);

    overlay.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      _startEdit(group, label, bgColor, overlay);
    });

    document.getElementById('canvas-area').appendChild(overlay);
    _updateOverlayPosition(group, label, overlay);
    
    return overlay;
  }

  function _updateOverlayPosition(group, label, overlay) {
    const absPos = label.getAbsolutePosition();
    const scale = services.core.stage.scaleX();
    overlay.style.left = absPos.x + 'px';
    overlay.style.top = absPos.y + 'px';
    overlay.style.width = (label.width() * scale) + 'px';
    overlay.style.height = (label.height() * scale) + 'px';
    overlay.style.fontSize = (14 * scale) + 'px';
    overlay.textContent = label.text();
  }

  function _darkenColor(hex, amount) {
    // Convert hex to RGB, darken, and return
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const newR = Math.max(0, Math.floor(r * (1 - amount)));
    const newG = Math.max(0, Math.floor(g * (1 - amount)));
    const newB = Math.max(0, Math.floor(b * (1 - amount)));
    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  function _startEdit(group, label, bgColor, textOverlay) {
    const absPos = label.getAbsolutePosition();
    const scale  = services.core.stage.scaleX();
    const area   = document.getElementById('canvas-area');

    // Hide overlay during edit
    textOverlay.style.display = 'none';

    const ta = document.getElementById('text-editor');
    ta.style.display    = 'block';
    ta.style.left       = absPos.x + 'px';
    ta.style.top        = absPos.y + 'px';
    ta.style.width      = (label.width() * scale) + 'px';
    ta.style.height     = (label.height() * scale) + 'px';
    ta.style.fontSize   = (14 * scale) + 'px';
    ta.style.fontFamily = label.fontFamily();
    ta.style.color      = '#1a1a2e';
    ta.style.background = bgColor;
    ta.style.padding    = '4px';
    ta.style.border     = '2px solid rgba(0,0,0,0.2)';
    ta.style.borderRadius = '3px';
    ta.style.lineHeight = '1.5';
    ta.style.resize     = 'none';
    ta.style.overflow   = 'auto';
    ta.style.transform  = '';
    ta.value = label.text() === 'Double Click to edit…' ? '' : label.text();
    label.visible(false);
    services.core.layer.draw();

    ta.focus();

    const commit = () => {
      label.text(ta.value.trim() || 'Double Click to edit…');
      label.visible(false); // Keep label hidden, use overlay
      ta.style.display = 'none';
      ta.style.background = 'transparent';
      ta.style.border = 'none';
      ta.style.padding = '0';
      // Show and update overlay
      textOverlay.textContent = label.text();
      textOverlay.style.display = 'block';
      services.core.layer.draw();
      services.history.save();
    };

    ta.onblur = commit;
    ta.onkeydown = e => {
      if (e.key === 'Escape') commit();
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commit(); }
    };
  }

  return { place, STICKY_COLORS, get _nextColor() { return _nextColor; }, set _nextColor(v) { _nextColor = v; } };
}
