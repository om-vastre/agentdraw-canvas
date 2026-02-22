# Agents & Modules Guide for `agentdraw-canvas`

## 1. Purpose of This Document

This document explains how to conceptually model and implement “agents” within the `agentdraw-canvas` system.

While the repository does not currently define explicit `Agent` classes in code, its architecture (modules, registries, tools, and events) maps naturally to an agent-based design. This guide defines that model so that:

- **AI agents** (LLMs, automation scripts) can reason about the system consistently.
- **Humans** can design and extend behavior in a structured way.
- **Future code** can adopt explicit agent abstractions without breaking the current mental model.

Throughout this document, the term **agent** refers to a self-contained, purpose-specific module that:

- Has a clear **responsibility** (e.g., handling input, transforming a scene, rendering output).
- Interacts with the rest of the system via **events**, **registries**, and **well-defined APIs**.
- Can be **replaced, extended, or composed** with other agents.

---

## 2. High-Level Architecture

`agentdraw-canvas` is organized around a central orchestration layer and a set of pluggable modules:

- **CanvasStudio (`src/CanvasStudio.js`)**  
  The central orchestrator and runtime environment. It:
  - Initializes the drawing environment and tools.
  - Connects UI, tools, shapes, and modules.
  - Coordinates updates, rendering, and event handling.

- **EventBus (`src/EventBus.js`)**  
  An event-driven communication channel. It:
  - Publishes and subscribes to events across modules.
  - Enables loose coupling: modules do not talk to each other directly; they communicate via events.

- **Core / Modules / Shapes / Tools (`src/core`, `src/modules`, `src/shapes`, `src/tools`)**  
  These directories contain the building blocks that can be treated as *agents*:
  - **Core**: foundational abstractions (e.g., base canvas logic, scene management).
  - **Modules**: higher-level functionality (e.g., history, selection, snapping, collaboration).
  - **Shapes**: visual primitives and their behavior.
  - **Tools**: interaction logic (e.g., selection tool, drawing tool, transform tools).

- **UI (`src/ui`)**  
  User interface components that interact with agents through events and the CanvasStudio API.

- **Registries (`src/registry`)**  
  Central places where agents, tools, or shapes can be discovered and managed (e.g., registering available tools or modules).

This architecture is **agent-friendly** because:

- Each module can be treated as an **agent** with a specific role.
- The **EventBus** acts as a **message-passing system**.
- Registries act as **directories of agents**, enabling dynamic lookups and configuration.

---

## 3. Agent Model

### 3.1. Conceptual Agent Definition

A **Module Agent** in `agentdraw-canvas` is:

> A self-contained module with a well-defined responsibility that integrates into the CanvasStudio ecosystem via events, registries, and public methods.

An agent typically:

- Encapsulates **state** (e.g., selection state, active tool, history stack).
- Exposes **methods** (e.g., `activate`, `deactivate`, `handleEvent`, `apply`, `serialize`).
- Subscribes to and/or emits **events** via the EventBus.
- Is **registered** with a registry or attached to CanvasStudio for lifecycle management.

### 3.2. Common Roles (Agent Types)

When designing agents, it is useful to classify them into common roles:

1. **Input Agents**
   - Purpose: Collect and normalize input from UI or external systems.
   - Examples:
     - A “PointerInputAgent” that listens for pointer events (`pointerdown`, `pointermove`, `pointerup`) and normalizes them.
     - A “KeyboardInputAgent” that maps keybindings to high-level commands (`undo`, `redo`, `delete`, etc.).
   - Integration:
     - Subscribes to DOM or UI events.
     - Publishes high-level events to the EventBus (e.g., `pointer.drag.start`, `tool.command.invoke`).

2. **Processing Agents**
   - Purpose: Perform the core logic and transformations on the drawing state.
   - Examples:
     - A “ShapeTransformAgent” that applies translation, rotation, and scaling.
     - A “HistoryAgent” that manages undo/redo stacks.
     - A “LayoutAgent” that auto-aligns shapes or snaps them to a grid.
   - Integration:
     - Subscribes to high-level events (e.g., `shape.add`, `shape.transform`, `scene.change`).
     - Reads and modifies canvas state exposed by CanvasStudio or core modules.
     - Publishes results (e.g., `scene.updated`, `history.pushed`).

3. **Output Agents**
   - Purpose: Present or export the state in a specific form.
   - Examples:
     - A “RenderAgent” that updates the HTML canvas or SVG.
     - An “ExportAgent” that exports the scene as JSON, PNG, or SVG.
   - Integration:
     - Subscribes to state-change events (`scene.updated`, `selection.changed`).
     - Produces visual or serialized results.

These roles are conceptual. One concrete module can fulfill multiple roles, but for clarity and maintainability, you should aim for single responsibility where possible.

---

## 4. Registries

### 4.1. What Is a Registry?

A **registry** is a centralized collection that keeps track of available modules/agents by name or type. In `agentdraw-canvas`, registries are often used to:

- Register **tools**, **shapes**, **modules**, or **plugins**.
- Provide dynamic lookup: given an identifier, you can retrieve the corresponding implementation.
- Support extension: external code can register new agents without modifying core files.

Conceptually, an Agent Registry looks like this:

```js
class AgentRegistry {
  constructor() {
    this._agents = new Map(); // key: id or name, value: agent instance or class
  }

  register(id, agent) {
    if (this._agents.has(id)) {
      throw new Error(`Agent with id "${id}" is already registered.`);
    }
    this._agents.set(id, agent);
  }

  deregister(id) {
    this._agents.delete(id);
  }

  get(id) {
    return this._agents.get(id) || null;
  }

  list() {
    return Array.from(this._agents.keys());
  }
}
```

### 4.2. Typical Usage Pattern

A common pattern for using registries in this project:

1. **Create** a registry instance (or use an existing one from `src/registry`).
2. **Register** agents during initialization or plugin loading.
3. **Lookup** agents by ID when handling events or user commands.

Example:

```js
// Pseudocode / conceptual example
import { AgentRegistry } from './src/registry/AgentRegistry.js';
import { HistoryAgent } from './src/modules/HistoryAgent.js';
import { SelectionAgent } from './src/modules/SelectionAgent.js';

const agentRegistry = new AgentRegistry();

agentRegistry.register('history', new HistoryAgent());
agentRegistry.register('selection', new SelectionAgent());

// Later in orchestration code:
const historyAgent = agentRegistry.get('history');
historyAgent.pushState(currentScene);
```

---

## 5. Orchestration

### 5.1. Orchestration via CanvasStudio and EventBus

**CanvasStudio** and **EventBus** together form the orchestration layer:

- **CanvasStudio**:
  - Owns core state and references to tools, modules, and UI components.
  - Provides public APIs for interacting with the canvas and scene.
  - May directly coordinate some modules (e.g., instructing tools to activate/deactivate).

- **EventBus**:
  - Broadcasts events to subscribed agents.
  - Allows agents to respond to user actions or state changes without tight coupling.

Basic EventBus pattern from `src/EventBus.js` (conceptual):

```js
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => this.listeners.get(eventType).delete(callback);
  }

  emit(eventType, payload) {
    const listeners = this.listeners.get(eventType);
    if (!listeners) return;
    for (const handler of listeners) {
      handler(payload);
    }
  }
}
```

### 5.2. Example: Orchestrating Agents

Conceptual orchestration flow:

```js
async function runShapeCreationFlow({ pointerEvent, shapeType, initialProps }) {
  // 1. An input agent normalizes pointer input and emits a "shape.create" event
  eventBus.emit('shape.create.request', { shapeType, initialProps });

  // 2. A processing agent listens and creates the shape in the scene
  eventBus.on('shape.create.request', ({ shapeType, initialProps }) => {
    const shape = shapeFactory.create(shapeType, initialProps);
    scene.add(shape);
    eventBus.emit('scene.updated', { reason: 'shape.create', shape });
  });

  // 3. An output agent (renderer) subscribes to "scene.updated" and redraws
  eventBus.on('scene.updated', ({ shape, reason }) => {
    renderer.render(scene);
  });
}
```

Key points:

- Orchestration is expressed as **event flows**, not direct method calls between agents.
- Each agent has a **clear responsibility** within the flow.
- Adding or removing agents requires only changing event subscriptions, not core logic.

---

## 6. Plugins and Extensibility

### 6.1. Plugin as Agent Extension

A **plugin** is a packaged addition of one or more agents (or agent-like modules) that can be registered into the system at runtime.

A plugin might:

- Add **new tools** (e.g., a custom shape tool).
- Add **new processing agents** (e.g., an auto-layout agent).
- Register **event listeners** on the EventBus.
- Optionally expose configuration UI elements.

### 6.2. Conceptual Plugin Structure

```js
class MyCustomPlugin {
  constructor({ canvasStudio, eventBus, agentRegistry }) {
    this.canvasStudio = canvasStudio;
    this.eventBus = eventBus;
    this.agentRegistry = agentRegistry;
  }

  install() {
    // 1. Create and register a new agent
    const myProcessingAgent = new MyProcessingAgent({ eventBus: this.eventBus });
    this.agentRegistry.register('my-processing-agent', myProcessingAgent);

    // 2. Register event handlers
    this.eventBus.on('scene.updated', (payload) => {
      myProcessingAgent.onSceneUpdated(payload);
    });

    // 3. Optionally expose commands/tools via CanvasStudio
    this.canvasStudio.registerCommand('my/custom/command', (context) => {
      myProcessingAgent.run(context);
    });
  }

  uninstall() {
    // Clean up registry and event listeners if needed
  }
}
```

This pattern ensures:

- Plugins remain **modular** and **isolated**.
- They integrate via **public APIs** (CanvasStudio, EventBus, AgentRegistry).
- AI agents can “reason” about a plugin as: *a bundle of new agents + event handlers + commands*.

---

## 7. Code Patterns & Snippets

Below are patterns that AI agents can follow when generating or modifying code in this repository.

### 7.1. Creating a New Processing Agent

**Goal**: Implement a module that automatically centers all selected shapes.

```js
// src/modules/AutoCenterAgent.js
export class AutoCenterAgent {
  constructor({ eventBus, canvasStudio }) {
    this.eventBus = eventBus;
    this.canvasStudio = canvasStudio;
  }

  initialize() {
    // Subscribe to a custom command event
    this.eventBus.on('command.auto-center-selection', () => {
      this.autoCenterSelection();
    });
  }

  autoCenterSelection() {
    const selection = this.canvasStudio.getSelection();
    if (!selection || selection.length === 0) return;

    const sceneBounds = this.canvasStudio.getSceneBounds();
    const selectionBounds = this.canvasStudio.getSelectionBounds(selection);

    const offsetX =
      sceneBounds.centerX - selectionBounds.centerX;
    const offsetY =
      sceneBounds.centerY - selectionBounds.centerY;

    selection.forEach((shape) => {
      this.canvasStudio.transformShape(shape, {
        dx: offsetX,
        dy: offsetY,
      });
    });

    this.eventBus.emit('scene.updated', { reason: 'auto-center' });
  }
}
```

**Registration example:**

```js
// src/modules/index.js (or a dedicated registry bootstrap file)
import { AutoCenterAgent } from './AutoCenterAgent.js';
import { agentRegistry } from '../registry/agents.js';
import { eventBus } from '../EventBus.js';
import { canvasStudio } from '../CanvasStudio.js';

const autoCenterAgent = new AutoCenterAgent({ eventBus, canvasStudio });
autoCenterAgent.initialize();

agentRegistry.register('auto-center', autoCenterAgent);
```

### 7.2. Basic Agent Lifecycle Hooks

When designing agents, consider these lifecycle methods:

- `initialize()`: subscribe to events, set initial state.
- `dispose()`: unsubscribe from events, release references.
- `activate()` / `deactivate()`: enable or disable behavior (useful for tools or mode-based agents).
- `serialize()` / `deserialize()`: save and restore state if needed.

Example:

```js
class ExampleAgent {
  constructor({ eventBus }) {
    this.eventBus = eventBus;
    this._off = [];
  }

  initialize() {
    // Track unsubscribe functions
    this._off.push(
      this.eventBus.on('scene.updated', this.handleSceneUpdated.bind(this))
    );
  }

  handleSceneUpdated(payload) {
    // Implement reaction to scene updates
  }

  dispose() {
    for (const off of this._off) off();
    this._off = [];
  }
}
```

---

## 8. Design Guidelines for AI Agents

When an AI system generates or edits code in this repository, it should adhere to the following guidelines:

1. **Respect the Event-Driven Architecture**
   - Prefer emitting and handling events over direct cross-module calls.
   - Avoid creating new global state; use CanvasStudio, EventBus, and registries.

2. **Single Responsibility per Agent**
   - Each agent should do one thing well (selection, layout, history, snapping, etc.).
   - If a module starts doing too many unrelated tasks, split it into multiple agents.

3. **Use Registries for Discoverability**
   - New tools, shapes, or processing agents should be registered with appropriate registries.
   - Use meaningful IDs (`'auto-center'`, `'grid-snap'`, `'export-json'`) to make them easy to reference.

4. **Document Public APIs**
   - For each agent, document:
     - Its purpose.
     - Events it listens to.
     - Events it emits.
     - Any public methods intended for external use.

5. **Keep Agents Framework-Agnostic Where Possible**
   - Agents should avoid hard dependencies on specific UI frameworks.
   - Interactions with the UI should be via events or well-defined CanvasStudio APIs.

---

## 9. Extension Workflow

When adding new behavior using the agent model, follow this workflow:

1. **Define the Agent’s Role**
   - Decide whether it is primarily an Input, Processing, or Output agent (or a combination).
   - Write a brief description of its responsibility.

2. **Design Events and APIs**
   - Decide which events the agent will listen to.
   - Decide which events it will emit.
   - If it needs to be directly invoked, define public methods and/or CanvasStudio commands.

3. **Implement the Agent**
   - Create a new file under `src/modules`, `src/tools`, or `src/shapes` as appropriate.
   - Implement lifecycle methods (`initialize`, `dispose`, etc.).
   - Wire up event subscriptions through the EventBus.

4. **Register the Agent**
   - Add it to the appropriate registry (e.g., `src/registry/...`).
   - Optionally, expose configuration or commands through CanvasStudio.

5. **Test and Iterate**
   - Manually verify behavior in the UI.
   - Add automated tests if the project includes a test harness.
   - Adjust events, responsibilities, and boundaries as needed.

---

## 10. References

- **Repository**: <https://github.com/om-vastre/agentdraw-canvas>  
- **API / Core Docs**: See `docs/API.md`  
- **Extensibility Docs**: See `docs/EXTENDING.md`  

---