/**
 * ImageUpload — adds image files to the canvas as draggable Konva.Image nodes.
 * Supports PNG, JPG, GIF, WebP, SVG.
 * Also supports drag-and-drop onto the canvas area.
 */
export function createImageUpload(services) {
  // Hidden file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) _loadFile(file);
    input.value = '';
    // Switch back to select after upload
    services.tools.setActive('select');
  });

  function trigger() {
    input.click();
  }

  function _loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => _placeImage(e.target.result);
    reader.readAsDataURL(file);
  }

  function _placeImage(src) {
    const img = new window.Image();
    img.onload = () => {
      const stage   = services.core.stage;
      const maxW    = stage.width()  * 0.55;
      const maxH    = stage.height() * 0.55;
      const ratio   = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width  * ratio;
      const h = img.height * ratio;

      const kImg = new Konva.Image({
        image:    img,
        x:        stage.width()  / 2 - w / 2,
        y:        stage.height() / 2 - h / 2,
        width:    w,
        height:   h,
        draggable: true,
        opacity:  0,
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowBlur: 12,
        shadowOffset: { x: 3, y: 3 },
        shadowOpacity: 0.2,
      });

      services.core.layer.add(kImg);
      services.drawing.shiftToCenter(kImg);
      services.interaction.makeInteractive(kImg);
      
      // Keep watermark on top
      if (services.core.watermark) services.core.watermark.moveToTop();
      
      kImg.to({ opacity: 1, duration: 0.35, easing: Konva.Easings.EaseOut });

      services.events.emit('stats:update');
      services.history.save();
      services.ui.toast('Image added ✓');
    };
    img.src = src;
  }

  // ── Drag-and-drop onto canvas area ──────────────────────────────
  const area = document.getElementById('canvas-area');
  if (area) {
    area.addEventListener('dragover', e => { e.preventDefault(); area.style.outline = '3px dashed var(--accent)'; });
    area.addEventListener('dragleave', () => { area.style.outline = ''; });
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.style.outline = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) _loadFile(file);
    });
  }

  return { trigger };
}
