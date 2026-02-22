# Agent Architecture in `agentdraw-canvas`

This document describes the agent/service pattern used in the repository, focusing on extensibility, modular orchestration, and cross-module communication. Key agents include `EventBus`, `CanvasStudio`, and internal registries/controllers for shapes, tools, and animations.

---

## EventBus

**Purpose:**  
The `EventBus` is a lightweight publish/subscribe class for decoupled cross-module communication. It allows modules to emit, listen for, and unsubscribe from events without direct dependencies—enabling flexible extension.

**Features:**
- `on(event, handler)`: Listen for an event, returns an unsubscribe function.
- `emit(event, ...args)`: Fire an event, triggering all registered handlers.
- `off(event, handler)`: Remove a listener for an event.
- `once(event, handler)`: Listen for an event just once, auto-unsubscribes after the first call.
- `clear(event?)`: Remove all listeners for an event (or all events).

**Typical Usage:**
```js
const bus = new EventBus();
bus.on('shapeAdded', handler);
bus.emit('shapeAdded', shape);
bus.off('shapeAdded', handler);
bus.once('ready', handler); // Auto-unsubscribe
```

**Role:**  
`EventBus` powers communication between agents (modules/services) so new features can be plugged in without tightly coupling to core logic.

---

## CanvasStudio

**Purpose:**  
The public API orchestrator: bootstraps all core modules in dependency order and exposes a clean interface for consumers to register, customize, or interact with shapes, tools, and animations.

**Construction Flow:**
1. **EventBus**: Foundation for module messaging.
2. **Theme**: Manages color palettes and visual styling.
3. **Core**: Sets up the Konva drawing surface.
4. **UI**: Handles visual overlays, stats, notifications.
5. **Color**: Provides palette and color utilities.
6. **Interaction**: Manages hover, select, and drag logic.
7. **Drawing**: Handles pencil/brush and drag-draw features.
8. **ShapeRegistry**: Dynamic plugin-ready registry for shapes.
9. **ToolRegistry**: Dynamic plugin-ready registry for tools.
10. **AnimationRegistry**: Dynamic plugin-ready registry for animations.
11. **Text**: Text module for sticky notes, labels, etc.

You can extend the Studio with custom plugins:
```js
studio.Shapes.register('cloud', cloudFactory);
studio.Animations.register('spin', animFactory);
studio.Tools.register('stamp', { config });
```

**Role:**  
`CanvasStudio` abstracts dependency management, allowing extension agents (plugins) to register themselves by name, plug into the event bus, and interact with the drawing domain.

---

## Agent-Oriented Extensibility

**Registries (Shapes, Tools, Animations):**
- Support dynamic `register()` and `unregister()`.
- Factories encapsulate shape, tool, or animation logic; plugins can add new drawing features or tools without altering core files.
- Built-in shapes/tools/animations are registered at boot, but new plugins can be injected at runtime.

---

## Typical Extension Workflow

1. **Implement Plugin**: Write a shape/tool/animation factory function.
2. **Register**: Use the exposed registry on `CanvasStudio` to plug in your logic.
3. **Listen and Emit**: If needed, use the EventBus for cross-module events.
4. **Interact with Core**: Plugins access drawing/context, UI, theme, etc., via the shared services object.

---

## Design Principles

- **Loose coupling:** Agents communicate via EventBus; plugin architecture prevents direct imports, avoids circular dependencies.
- **Extensibility:** All core APIs expose registry interfaces for pluggable custom behavior.
- **Isolation:** Each agent/module encapsulates its own state and exposes minimal interfaces.
- **Declarative registration:** You describe what you want to add—Studio handles orchestration.

---

## References

- [EventBus.js](../src/EventBus.js)
- [CanvasStudio.js](../src/CanvasStudio.js)

You can see more implementation details by browsing the [`src/`](https://github.com/om-vastre/agentdraw-canvas/tree/main/src) directory.

---
**Note:** This summary only covers the discovered agent/service architecture. For deeper implementation details or other agent-related files, view the full `src/` folder in the [GitHub UI](https://github.com/om-vastre/agentdraw-canvas/tree/main/src).