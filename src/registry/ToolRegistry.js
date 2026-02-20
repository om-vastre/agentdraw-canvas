/**
 * ToolRegistry — manages the active drawing tool and wires stage events.
 * Emits: 'tool:change' — { name, label, color }
 */
export function createToolRegistry(services) {
  const _registry = new Map();
  let _active = 'select';

  const TOOL_COLORS = {
    select:'#6c63ff', hand:'#f59e0b',
    rect:'#22c55e', circle:'#22c55e', triangle:'#22c55e', star:'#f59e0b',
    pentagon:'#22c55e', hexagon:'#22c55e', diamond:'#22c55e',
    heart:'#ef4444',
    arrow:'#ef4444', line:'#ef4444',
    text:'#9d70ff', pencil:'#06d6a0', eraser:'#ef4444',
    sticky:'#fbbf24', image:'#f59e0b',
  };

  const TOOL_ICONS = {
    select: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-7 1-4 7L5 3z"/></svg>`,
    hand:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V8a2 2 0 0 0-4 0m0 3V6a2 2 0 0 0-4 0v2m0 3V8a2 2 0 0 0-4 0v8a7 7 0 0 0 14 0v-3a2 2 0 0 0-4 0"/></svg>`,
    pencil: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
    eraser: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
    arrow:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    text:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
    sticky: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><polyline points="15 3 15 9 21 9"/></svg>`,
    image:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  };

  const SHAPE_PICKER_ITEMS = [
    { type:'rect',          svg:'<rect x="3" y="3" width="18" height="18" rx="2"/>' },
    { type:'circle',        svg:'<circle cx="12" cy="12" r="9"/>' },
    { type:'triangle',      svg:'<polygon points="12,3 22,21 2,21"/>' },
    { type:'diamond',       svg:'<polygon points="12,2 22,12 12,22 2,12"/>' },
    { type:'hexagon',       svg:'<polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7"/>' },
    { type:'pentagon',      svg:'<polygon points="12,2 21,9 17.5,20 6.5,20 3,9"/>' },
    { type:'star',          svg:'<polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3"/>' },
    { type:'heart',         svg:'<path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>' },
    { type:'line',          svg:'<line x1="5" y1="19" x2="19" y2="5"/>' },
    { type:'arrow',         svg:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/>' },
  ];

  function register(name, config) {
    _registry.set(name, config);
  }

  function setActive(name) {
    if (!_registry.has(name)) {
      console.warn(`[ToolRegistry] Unknown tool: "${name}"`);
      return;
    }
    const oldTool = _registry.get(_active);
    if (oldTool?.onDeactivate) oldTool.onDeactivate(services);
    services.text?.commitEdit();
    if (_active !== name) services.interaction?.deselect();

    _active = name;
    const tool = _registry.get(name);

    document.querySelectorAll('.cs-tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tool="${name}"]`)?.classList.add('active');

    const cursor = name === 'pencil' ? 'none' : (tool.cursor || 'default');
    services.core.stage.container().style.cursor = cursor;

    services.events.emit('tool:change', {
      name,
      label: tool.label || name,
      color: TOOL_COLORS[name] || '#6c63ff',
    });

    if (tool.onActivate) tool.onActivate(services);
  }

  function active() { return _active; }

  // Wire stage events to active tool
  services.core.stage.on('mousedown touchstart', e => {
    const tool = _registry.get(_active);
    if (tool?.onMousedown) tool.onMousedown(e, services);
  });
  services.core.stage.on('mousemove touchmove', e => {
    const tool = _registry.get(_active);
    if (tool?.onMousemove) tool.onMousemove(e, services);
  });
  services.core.stage.on('mouseup touchend', e => {
    const tool = _registry.get(_active);
    if (tool?.onMouseup) tool.onMouseup(e, services);
  });

  function initToolbar(toolOrder) {
    const bar = document.getElementById('toolbar');
    if (!bar) return;
    bar.innerHTML = '';
    _createShapePicker();

    toolOrder.forEach(item => {
      if (item === '---') {
        const sep = document.createElement('div');
        sep.className = 'cs-tool-sep';
        bar.appendChild(sep);
        return;
      }

      if (item === 'shapes') {
        const btn = document.createElement('button');
        btn.className = 'cs-tool-btn';
        btn.id = 'shapes-picker-btn';
        btn.dataset.tool = 'shapes';
        btn.title = 'Shapes';
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <circle cx="17.5" cy="6.5" r="3.5"/>
            <polygon points="12,22 3.5,22 7.75,14.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span class="cs-tool-tip">Shapes</span>
          <span class="cs-tool-caret">&#9650;</span>
        `;
        btn.onclick = e => { e.stopPropagation(); _toggleShapePicker(btn); };
        bar.appendChild(btn);
        return;
      }

      const tool = _registry.get(item);
      if (!tool) return;
      const btn = document.createElement('button');
      btn.className = 'cs-tool-btn' + (item === _active ? ' active' : '');
      btn.dataset.tool = item;
      btn.title = `${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`;
      const icon = TOOL_ICONS[item] || tool.icon || item[0].toUpperCase();
      btn.innerHTML = `${icon}<span class="cs-tool-tip">${tool.label}${tool.shortcut ? ` <kbd>${tool.shortcut}</kbd>` : ''}</span>`;
      btn.onclick = () => setActive(item);
      bar.appendChild(btn);
    });

    document.addEventListener('click', () => _hideShapePicker());
  }

  function _createShapePicker() {
    document.getElementById('shape-picker')?.remove();
    const popup = document.createElement('div');
    popup.id = 'shape-picker';
    popup.className = 'cs-shape-picker';
    popup.innerHTML = `<div class="cs-picker-grid">${
      SHAPE_PICKER_ITEMS.map(s => `
        <button class="cs-picker-btn" data-shape="${s.type}" title="${s.type}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
            ${s.svg}
          </svg>
        </button>`).join('')
    }</div>`;
    popup.querySelectorAll('.cs-picker-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        _hideShapePicker();
        setActive(btn.dataset.shape);
        document.getElementById('shapes-picker-btn')?.classList.add('active');
      };
    });
    document.body.appendChild(popup);
  }

  function _toggleShapePicker(btn) {
    const popup = document.getElementById('shape-picker');
    if (!popup) return;
    const isOpen = popup.classList.contains('open');
    _hideShapePicker();
    if (!isOpen) {
      const r = btn.getBoundingClientRect();
      popup.style.left   = Math.max(8, r.left + r.width / 2 - 112) + 'px';
      popup.style.bottom = (window.innerHeight - r.top + 10) + 'px';
      popup.classList.add('open');
    }
  }

  function _hideShapePicker() {
    document.getElementById('shape-picker')?.classList.remove('open');
  }

  return { register, setActive, active, initToolbar };
}
