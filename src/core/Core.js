/**
 * Core — initialises Konva stage, main layer, and transformer.
 * All other modules access Konva primitives through services.core.
 *
 * Emits:
 *   'core:resize' — when the stage resizes
 */
export function createCore(services) {
  const { events } = services;
  const container  = document.getElementById('konva-container');
  const area       = document.getElementById('canvas-area');

  const stage = new Konva.Stage({
    container: 'konva-container',
    width:  area.offsetWidth,
    height: area.offsetHeight,
  });

  const layer = new Konva.Layer();
  stage.add(layer);

  // AgentDraw Canvas watermark (like tldraw)
  const watermark = new Konva.Text({
    x: 0,
    y: 0,
    text: 'AgentDraw Canvas',
    fontSize: 14,
    fontFamily: 'Kalam, cursive',
    fill: 'rgba(128, 128, 128, 0.3)',
    listening: false,  // Non-interactive
    draggable: false,  // Prevent dragging
    name: 'watermark',
  });
  
  // Position in bottom-right corner
  const updateWatermarkPosition = () => {
    watermark.x(stage.width() - watermark.width() - 16);
    watermark.y(stage.height() - watermark.height() - 12);
  };
  updateWatermarkPosition();
  layer.add(watermark);
  watermark.moveToTop();  // Keep it on top of stack

  const tr = new Konva.Transformer({
    rotateEnabled: true,
    borderStroke: 'var(--accent)',
    borderStrokeWidth: 1.5,
    borderDash: [5, 3],
    anchorStroke: 'var(--accent)',
    anchorFill: '#ffffff',
    anchorSize: 9,
    anchorCornerRadius: 4,
    padding: 4,
    enabledAnchors: [
      'top-left','top-center','top-right',
      'middle-left','middle-right',
      'bottom-left','bottom-center','bottom-right',
    ],
  });
  layer.add(tr);

  window.addEventListener('resize', () => {
    stage.width(area.offsetWidth);
    stage.height(area.offsetHeight);
    updateWatermarkPosition();  // Reposition watermark on resize
    layer.batchDraw();
    events.emit('core:resize');
  });

  return {
    stage,
    layer,
    tr,
    watermark,  // Expose for modules to keep at bottom
    /** @returns {Konva.Vector2d|null} */
    pointer: () => stage.getRelativePointerPosition(),
    width:   () => stage.width(),
    height:  () => stage.height(),
  };
}
