/**
 * Color — manages the active drawing colour and renders the colour palette.
 *
 * Emits:
 *   'color:change' — { color: '#hex' }
 */

export const DEFAULT_PALETTE = [
  '#6c63ff','#9d70ff','#ff63b8','#ff6b6b',
  '#ffd166','#06d6a0','#118ab2','#073b4c',
  '#f72585','#b5179e','#7209b7','#480ca8',
  '#4895ef','#4cc9f0','#fb8500','#ffb703',
  '#2ec4b6','#cbf3f0','#ef233c','#8d99ae',
  '#495057','#212529','#ffffff','#adb5bd',
];

export function createColor(services, { palette = DEFAULT_PALETTE } = {}) {
  const { events } = services;
  let _color = palette[0];

  function set(color, swatchEl) {
    _color = color;
    document.querySelectorAll('.cs-swatch').forEach(s => s.classList.remove('active'));
    if (swatchEl) swatchEl.classList.add('active');
    events.emit('color:change', { color });

    // Live-update selected shape
    const shape = services.interaction?.selected();
    if (!shape) return;
    const cls = shape.getClassName();
    if      (cls === 'Line' || cls === 'Arrow') shape.stroke(color);
    else if (cls === 'Text')                    shape.fill(color);
    else                                         shape.fill(color);
    services.core.layer.batchDraw();
    services.history.save();
  }

  function initPalette(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    palette.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cs-swatch';
      sw.style.background = c;
      if (c === _color) sw.classList.add('active');
      sw.onclick = () => set(c, sw);
      grid.appendChild(sw);
    });

    const custom = document.getElementById('custom-color');
    if (custom) custom.addEventListener('input', e => set(e.target.value, null));
  }

  return {
    current:     () => _color,
    set,
    initPalette,
  };
}
