/**
 * History — undo / redo using JSON snapshots of the Konva layer.
 * Max stack depth is configurable (default 60).
 *
 * Emits:
 *   'history:change' — { canUndo, canRedo } 
 *    <!-- Made with ❤️ by Mehul Ligade -->
 */

export function createHistory(services, { maxSteps = 60 } = {}) {
  const { events } = services;
  let stack  = [];
  let cursor = -1;
  let _batching = false;  // When true, suppress intermediate saves
  let _uuidStack = [];  // Parallel stack for UUID mappings

  function _notify() {
    events.emit('history:change', { canUndo: cursor > 0, canRedo: cursor < stack.length - 1 });
  }

  function _snapshot() {
    const { core, animations, shapes } = services;
    // Hide transformer and watermark while snapshotting to get clean JSON
    const nodes = core.tr.nodes();
    core.tr.nodes([]);
    const watermarkVisible = core.watermark ? core.watermark.visible() : true;
    if (core.watermark) core.watermark.visible(false);
    const json = core.layer.toJSON();
    core.tr.nodes(nodes);
    if (core.watermark) core.watermark.visible(watermarkVisible);
    
    // Save UUID to Konva _id mapping
    const uuidMap = {};
    if (shapes && shapes.shapeMap) {
      shapes.shapeMap.forEach((shape, uuid) => {
        uuidMap[uuid] = shape._id;  // Map UUID to Konva's internal _id
      });
    }
    
    return { json, uuidMap };
  }

  function _restore(snapshot) {
    const { core, interaction, animations, shapes } = services;
    animations.stopAll(true);  // Silent - don't show toast during undo/redo
    
    // Clear the shape map before restoring
    if (shapes && shapes.shapeMap) {
      shapes.shapeMap.clear();
    }
    
    // Disable listening during restoration to prevent premature draw calls
    core.layer.listening(false);
    
    const parsed = Konva.Node.create(snapshot.json);
    core.layer.destroyChildren();
    
    // Add children without triggering interactions yet
    parsed.getChildren().forEach(child => {
      core.layer.add(child);
      
      // Restore UUID mapping using the saved UUID map
      if (snapshot.uuidMap && shapes && shapes.shapeMap) {
        for (const [uuid, konvaId] of Object.entries(snapshot.uuidMap)) {
          if (child._id === konvaId) {
            child._publicId = uuid;
            shapes.shapeMap.set(uuid, child);
            break;
          }
        }
      }
    });
    
    // Re-add watermark and transformer
    if (core.watermark) core.layer.add(core.watermark);
    core.layer.add(core.tr);
    core.tr.nodes([]);
    interaction.deselect();
    
    // Now make all shapes interactive after they're properly added to layer
    core.layer.getChildren().forEach(child => {
      if (child !== core.tr && child.name() !== 'watermark' && child.draggable?.()) {
        interaction.makeInteractive(child);
      }
    });
    
    // Keep watermark on top
    if (core.watermark) core.watermark.moveToTop();
    
    // Re-enable listening and draw
    core.layer.listening(true);
    core.layer.batchDraw();
    events.emit('stats:update');
  }

  return {
    save() {
      // Skip intermediate saves during batch operations
      if (_batching) return;
      
      stack = stack.slice(0, cursor + 1);
      stack.push(_snapshot());
      if (stack.length > maxSteps) stack.shift(); else cursor++;
      _notify();
    },

    undo() {
      if (cursor <= 0) return services.ui.toast('Nothing to undo');
      cursor--;
      _restore(stack[cursor]);
      _notify();
    },

    redo() {
      if (cursor >= stack.length - 1) return services.ui.toast('Nothing to redo');
      cursor++;
      _restore(stack[cursor]);
      _notify();
    },

    canUndo: () => cursor > 0,
    canRedo: () => cursor < stack.length - 1,

    // ── Agent-ready API ──────────────────────────────────────────────────
    batch(fn) {
      _batching = true;
      try {
        fn();
      } finally {
        _batching = false;
        this.save();  // Single save after all operations
      }
    },
  };
}
