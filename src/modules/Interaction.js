/**
 * Interaction — wires hover, click-selection, and drag events onto every shape.
 * Call makeInteractive(shape) after adding a shape to the layer.
 *
 * Emits:
 *   'selection:change' — shape | null 
 * <!-- Made with ❤️ by Mehul Ligade -->
 * <!-- https://github.com/mehulcode12/agentdraw-canvas.git -->
 */
export function createInteraction(services) {
  const { events } = services;
  let _selected = null;

  // Stage background click → deselect
  services.core.stage.on('click tap', e => {
    if (e.target === services.core.stage) deselect();
  });

  function selected()  { return _selected; }

  function select(shape) {
    if (_selected && _selected !== shape) {
      _selected.to({ shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)', duration: 0.1 });
    }
    _selected = shape;
    services.core.tr.nodes(shape ? [shape] : []);
    services.core.tr.moveToTop();
    // Keep watermark on top
    if (services.core.watermark) services.core.watermark.moveToTop();
    services.core.layer.batchDraw();
    events.emit('selection:change', shape);
  }

  function deselect() {
    if (_selected) {
      _selected.to({ shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)', duration: 0.1 });
    }
    _selected = null;
    services.core.tr.nodes([]);
    services.core.layer.batchDraw();
    events.emit('selection:change', null);
  }

  function makeInteractive(shape) {
    shape.on('mouseenter', function () {
      const tool = services.tools?.active();
      if (tool === 'eraser') {
        this._preEraseOpacity = this.opacity();
        this.opacity(this.opacity() * 0.45);
        this.getLayer()?.batchDraw();
        services.core.stage.container().style.cursor = 'none';
        return;
      }
      if (tool === 'select') {
        services.core.stage.container().style.cursor = 'move';
        if (this !== _selected)
          this.to({ shadowBlur: 24, shadowColor: 'rgba(108,99,255,0.5)', duration: 0.15 });
      }
    });

    shape.on('mouseleave', function () {
      const tool = services.tools?.active();
      if (tool === 'eraser') {
        if (this._preEraseOpacity !== undefined) this.opacity(this._preEraseOpacity);
        this.getLayer()?.batchDraw();
        return;
      }
      if (tool === 'select')
        services.core.stage.container().style.cursor = 'default';
      if (this !== _selected)
        this.to({ shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)', duration: 0.12 });
    });

    shape.on('click tap', function (e) {
      e.cancelBubble = true;
      const tool = services.tools?.active();
      if (tool === 'eraser') {
        services.shapes?.erase(this);
        return;
      }
      if (tool !== 'select') return;
      select(this);
    });

    shape.on('dblclick', function () {
      if (this.getClassName() === 'Text') services.text?.startEdit(this);
    });

    shape.on('dragstart', function () {
      services.core.stage.container().style.cursor = 'grabbing';
      this.to({ shadowBlur: 32, shadowOpacity: 0.45, duration: 0.1 });
      this.moveToTop();
      services.core.tr.moveToTop();
      
      if (services.core.watermark) services.core.watermark.moveToTop();
    });

    shape.on('dragend', function () {
      const tool = services.tools?.active();
      services.core.stage.container().style.cursor =
        tool === 'select' ? 'default' : 'crosshair';
      this.to({ shadowBlur: 8, shadowOpacity: 0.2, duration: 0.2 });
      services.history.save();
    });

    return shape;
  }

  return { selected, select, deselect, makeInteractive };
}
