# Programmable Matter Simulation

This project simulates programmable matter using a state-space search agent modeling a two-dimensional programmable matter board. The simulation demonstrates how autonomous agents can collaborate to form predetermined target shapes.

## Features

- **Von Neumann Topology**: 4-directional movement (up, down, left, right)
- **A* Pathfinding**: Optimal pathfinding for agents to reach target positions
- **Hungarian Algorithm**: Optimal assignment of agents to target positions
- **Deadlock Detection and Resolution**: Detection and handling of deadlocks when agents block each other
- **Interactive UI**: Configurable grid size and target shapes
- **Dynamic Placement**: Manually place agents, targets, and walls for custom scenarios

## Getting Started

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Configure the grid size (5-30) and click "Apply Size"
4. Choose between manual placement or auto-generation
5. Place agents and targets on the grid manually or select a predefined shape
6. Click "Initialize Grid" to set up the simulation
7. Click "Start Simulation" to begin

## Usage

### Grid Setup
- **Grid Size**: Set the grid dimensions (5-30) and click "Apply Size"
- **Mode Selection**: Choose between Wall, Agent, or Target placement mode
- **Generation Mode**: Choose between Manual Placement or Auto-Generate
- **Target Shape**: Select Diamond, Triangle, Square, or Custom shape

### Interaction Modes
- **Wall Mode**: Click on cells to place or remove walls
- **Agent Mode**: Click on cells to place or remove agents
- **Target Mode**: Click on cells to place or remove target positions

### Controls
- **Initialize Grid**: Sets up the grid with the specified size and configuration
- **Start/Pause**: Toggle simulation execution
- **Reset**: Reset the simulation to its initial state
- **Clear Agents/Targets/Walls**: Remove all objects of the specified type
- **Clear Log**: Clear the simulation log

## Advanced Features
- **Custom Scenarios**: Create complex scenarios by manually placing agents and targets
- **Multiple Pathfinding Approaches**: The system uses various fallback strategies when paths are blocked
- **Deadlock Resolution**: Multiple techniques are used to resolve deadlocks, including:
  - Alternative path finding
  - Temporary retreats
  - Agent position swapping
  - Random moves as a last resort

## How It Works

1. Agents are placed manually or at predefined positions
2. Target positions form a shape (diamond, triangle, square) or are placed manually
3. The Hungarian algorithm determines the optimal agent-to-target assignments
4. A* pathfinding calculates the optimal path for each agent to reach its target
5. Agents move one step at a time along their paths
6. The deadlock handler detects and resolves situations where agents block each other

## Implementation Details

- **Centralized Decision Making**: A central controller assigns targets and calculates paths
- **Sequential Movements**: Agents move one by one to avoid collisions
- **Deadlock Prevention**: The simulation includes mechanisms to detect and resolve deadlocks
- **Performance Tracking**: The UI displays the total number of moves and deadlocks resolved 