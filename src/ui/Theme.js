/**
 * Theme — dark / light mode via CSS custom properties on <html>.
 * All colours live in styles/theme.css; this module only toggles classes.
 *
 * Emits:
 *   'theme:change' — { mode: 'dark' | 'light' }
 */
export function createTheme(services) {
  const { events } = services;
  const root  = document.documentElement;
  const KEY   = 'cs-theme';
  let _mode   = localStorage.getItem(KEY) || 'dark';

  function _apply(mode) {
    _mode = mode;
    root.setAttribute('data-theme', mode);
    localStorage.setItem(KEY, mode);
    // Update toggle button icon
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = mode === 'dark' ? '☀️' : '🌙';
    events.emit('theme:change', { mode });
  }

  function toggle() {
    _apply(_mode === 'dark' ? 'light' : 'dark');
  }

  // Apply saved preference on boot
  _apply(_mode);

  return {
    toggle,
    mode:    () => _mode,
    isDark:  () => _mode === 'dark',
    isLight: () => _mode === 'light',
  };
}
