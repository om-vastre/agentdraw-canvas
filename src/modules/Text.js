/**
 * Text — click-to-place Konva Text nodes with full inline textarea editing.
 * Double-click an existing text shape to re-edit.
 */
export function createText(services) {
  const area     = document.getElementById('canvas-area');
  const textarea = document.getElementById('text-editor');
  let _editing   = null;

  function placeAt(pos) {
    const shape = services.shapes.create('text', {
      x: pos.x, y: pos.y,
      fontSize: services.drawing.fontSize,
      text: 'Type here...',
    });
    if (!shape) return;
    services.core.layer.batchDraw();
    setTimeout(() => startEdit(shape), 60);
  }

  function startEdit(node) {
    _editing = node;
    services.core.tr.nodes([]);

    const absPos   = node.getAbsolutePosition();
    const stageScale = services.core.stage.scaleX();

    textarea.style.display    = 'block';
    textarea.style.left       = absPos.x + 'px';
    textarea.style.top        = absPos.y + 'px';
    textarea.style.fontSize   = (node.fontSize() * stageScale) + 'px';
    textarea.style.fontFamily = node.fontFamily();
    textarea.style.color      = node.fill();
    textarea.style.lineHeight = '1.25';
    textarea.style.width      = Math.max(200, node.width() + 40) + 'px';
    textarea.style.minHeight  = node.fontSize() * 1.4 + 'px';
    textarea.style.transform  = `rotate(${node.rotation()}deg)`;
    textarea.value = node.text() === 'Type here...' ? '' : node.text();

    node.visible(false);
    services.core.layer.batchDraw();
    textarea.focus();
  }

  function commitEdit() {
    if (!_editing) return;
    _editing.text(textarea.value.trim() || 'Text');
    _editing.visible(true);
    textarea.style.display = 'none';
    _editing = null;
    services.core.layer.batchDraw();
    services.history.save();
  }

  textarea.addEventListener('blur',   commitEdit);
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Escape')                    commitEdit();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
  });

  return { placeAt, startEdit, commitEdit, isEditing: () => !!_editing };
}
