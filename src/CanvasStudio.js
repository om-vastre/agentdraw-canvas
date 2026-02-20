/**
 * CanvasStudio — public API orchestrator.
 *
 * Bootstraps every module in dependency order,
 * then exposes a clean public surface for consumers.
 *
 * Quick start:
 *   import { CanvasStudio } from './src/CanvasStudio.js';
 *   const studio = new CanvasStudio();
 *
 * Extend:
 *   studio.Shapes.register('cloud', factory)
 *   studio.Animations.register('disco', factory)
 *   studio.Tools.register('stamp', config)
 */

import { EventBus }               from './EventBus.js';
import { createCore }             from './core/Core.js';
import { createHistory }          from './core/History.js';
import { createTheme }            from './ui/Theme.js';
import { createUI }               from './ui/UI.js';
import { createColor }            from './modules/Color.js';
import { createInteraction }      from './modules/Interaction.js';
import { createDrawing }          from './modules/Drawing.js';
import { createText }             from './modules/Text.js';
import { createPanZoom }          from './modules/PanZoom.js';
import { createExport }           from './modules/Export.js';
import { createStickyNote }       from './modules/StickyNote.js';
import { createImageUpload }      from './modules/ImageUpload.js';
import { createShapeRegistry }    from './registry/ShapeRegistry.js';
import { createToolRegistry }     from './registry/ToolRegistry.js';
import { createAnimationRegistry } from './registry/AnimationRegistry.js';
import { registerBuiltinShapes }  from './shapes/builtins.js';
import { registerBuiltinAnimations } from './animations/builtins.js';
import { registerBuiltinTools, TOOLBAR_ORDER } from './tools/definitions.js';

export class CanvasStudio {
  constructor() {
    /**
     * Shared services object — all modules write here and read from each
     * other lazily (inside methods), avoiding circular import issues.
     * @type {Record<string, any>}
     */
    const svc = {};

    // ── 1. Event bus (no deps) ───────────────────────────────────
    svc.events = new EventBus();

    // ── 2. Theme (no deps) ──────────────────────────────────────
    svc.theme = createTheme(svc);

    // ── 3. Core — Konva stage/layer/transformer ──────────────────
    svc.core = createCore(svc);

    // ── 4. UI — stats, toast, cursors (reads other modules lazily)
    svc.ui = createUI(svc);

    // ── 5. Color palette ────────────────────────────────────────
    svc.color = createColor(svc);

    // ── 6. Interaction — hover/select/drag ──────────────────────
    svc.interaction = createInteraction(svc);

    // ── 7. Drawing — pencil + drag-draw ─────────────────────────
    svc.drawing = createDrawing(svc);

    // ── 8. Shape Registry ───────────────────────────────────────
    svc.shapes = createShapeRegistry(svc);

    // ── 9. Tool Registry ────────────────────────────────────────
    svc.tools = createToolRegistry(svc);

    // ── 10. Animation Registry ──────────────────────────────────
    svc.animations = createAnimationRegistry(svc);

    // ── 11. Text module ─────────────────────────────────────────
    svc.text = createText(svc);

    // ── 12. Sticky notes ────────────────────────────────────────
    svc.sticky = createStickyNote(svc);

    // ── 13. Image upload ────────────────────────────────────────
    svc.imageUpload = createImageUpload(svc);

    // ── 14. Pan / Zoom ──────────────────────────────────────────
    svc.panzoom = createPanZoom(svc);

    // ── 15. Export ──────────────────────────────────────────────
    svc.export = createExport(svc);

    // ── 16. History (depends on all others being ready) ─────────
    svc.history = createHistory(svc);

    // ── Register built-ins ──────────────────────────────────────
    registerBuiltinShapes(svc);
    registerBuiltinAnimations(svc);
    registerBuiltinTools(svc);

    // ── Build toolbar from registry ─────────────────────────────
    svc.tools.initToolbar(TOOLBAR_ORDER);

    // ── Build panel UI ──────────────────────────────────────────
    svc.color.initPalette('color-grid');
    svc.shapes.initQuickPanel('shape-grid');
    svc.animations.initPanel('anim-grid');

    // ── Keyboard shortcuts ──────────────────────────────────────
    this._initKeyboard(svc);

    // ── Initial state snapshot ──────────────────────────────────
    svc.history.save();
    svc.events.emit('stats:update');

    this._svc = svc;

    console.group('🎨 AgentDraw canvas v1.0.0');
    console.log('Public API:  studio.{ Shapes, Tools, Animations, Colors, History, PanZoom, Export, Theme, Events }');
    console.log('Add shape:   studio.Shapes.create("rect", { x:200, y:150, width:120, height:80 })');
    console.log('Custom anim: studio.Animations.register("disco", factory)');
    console.log('Custom tool: studio.Tools.register("stamp", config)');
    console.log('Docs:        ./docs/API.md');
    console.log('%cMade with ❤️ by Mehul Ligade', 'color: #ff6b6b; font-weight: bold;');
    console.log('%cGithub: github.com/mehulcode12', 'color: #33f2e5; font-weight: bold;');
    console.groupEnd();

    svc.ui.toast('AgentDraw canvas ready ✦', 2500);
  }

  _initKeyboard(svc) {
    document.addEventListener('keydown', e => {
      if (e.target.matches('textarea,input')) return;
      const cmd = e.ctrlKey || e.metaKey;

      if (cmd && e.key === 'z' && !e.shiftKey) { e.preventDefault(); svc.history.undo(); return; }
      if (cmd && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); svc.history.redo(); return; }
      if (cmd && e.key === 'd') { e.preventDefault(); svc.shapes.duplicate(); return; }
      if (cmd && e.key === '0') { e.preventDefault(); svc.panzoom.resetZoom(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && svc.interaction.selected()) {
        e.preventDefault(); svc.shapes.deleteSelected(); return;
      }
      if (!cmd && (e.key === '=' || e.key === '+')) { svc.panzoom.zoom(0.15); return; }
      if (!cmd && (e.key === '-' || e.key === '_')) { svc.panzoom.zoom(-0.15); return; }
      if (e.key === 'Escape') svc.interaction.deselect();

      if (!cmd) {
        const MAP = {
          v:'select', h:'hand', r:'rect', c:'circle', t:'triangle',
          s:'star', a:'arrow', l:'line', x:'text', d:'pencil', e:'eraser',
          n:'sticky', i:'image',
        };
        const tool = MAP[e.key.toLowerCase()];
        if (tool) svc.tools.setActive(tool);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC API 
  // ══════════════════════════════════════════════════════════════

  /** Direct Konva access (stage, layer, tr) */
  get Core()       { return this._svc.core; }

  /** Shape factory + operations */
  get Shapes() {
    const s = this._svc.shapes;
    return {
      create:         s.create.bind(s),
      quickAdd:       s.quickAdd.bind(s),
      register:       s.register.bind(s),
      duplicate:      s.duplicate.bind(s),
      deleteSelected: s.deleteSelected.bind(s),
      clearAll:       s.clearAll.bind(s),
      alignCenter:    s.alignCenter.bind(s),
      toFront:        s.toFront.bind(s),
      toBack:         s.toBack.bind(s),
      flipH:          s.flipH.bind(s),
      createRandom:   s.createRandom.bind(s),
      
      getById:        s.getById.bind(s),
      selectById:     s.selectById.bind(s),
      updateById:     s.updateById.bind(s),
      listIds:        s.listIds.bind(s),
    };
  }

  /** Tool system */
  get Tools() {
    const t = this._svc.tools;
    return {
      set:      t.setActive.bind(t),
      current:  t.active.bind(t),
      register: t.register.bind(t),
    };
  }

  /** Animation engine */
  get Animations() {
    const a = this._svc.animations;
    return {
      apply:       a.apply.bind(a),
      stopAll:     a.stopAll.bind(a),
      animateAll:  a.animateAll.bind(a),
      stopFor:     a.stopForShape.bind(a),
      register:    a.register.bind(a),
    };
  }

  /** Color palette */
  get Colors() {
    const c = this._svc.color;
    return { current: c.current.bind(c), set: c.set.bind(c) };
  }

  /** Undo / redo */
  get History() {
    const h = this._svc.history;
    return { 
      undo: h.undo.bind(h), 
      redo: h.redo.bind(h), 
      save: h.save.bind(h),
      batch: h.batch.bind(h),  // Agent-ready API
    };
  }

  /** Pan / zoom */
  get PanZoom() {
    const p = this._svc.panzoom;
    return { zoom: p.zoom.bind(p), reset: p.resetZoom.bind(p), fit: p.fitScreen.bind(p) };
  }

  /** Export */
  get Export() {
    const e = this._svc.export;
    return { 
      asPNG: e.asPNG.bind(e), 
      asSVG: e.asSVG.bind(e),
      asJSON: e.asJSON.bind(e),
      
      getState: e.getState.bind(e),
      loadState: e.loadState.bind(e),
    };
  }

  /** Theme */
  get Theme() {
    const t = this._svc.theme;
    return { toggle: t.toggle.bind(t), mode: t.mode.bind(t) };
  }

  /** UI utilities */
  get UI() {
    const u = this._svc.ui;
    return { toast: u.toast.bind(u), onPropChange: u.onPropChange.bind(u) };
  }

  /** Raw EventBus for custom integrations */
  get Events() { return this._svc.events; }
}
