# Programmable Matter Simulation

This project simulates programmable matter using a state-space search agent modeling a two-dimensional programmable matter board. The simulation demonstrates how autonomous agents can collaborate to form predetermined target shapes.

## Features

- **Multiple Pathfinding Algorithms**:
  - **A* Algorithm**: Optimal pathfinding using heuristics
  - **BFS Algorithm**: Breadth-first search pathfinding
  - **Minimax Algorithm**: Game theory-based pathfinding with adversarial search
  - **Expectimax Algorithm**: Probabilistic extension of Minimax for uncertain environments
- **Multiple Movement Topologies**:
  - **Von Neumann Topology**: 4-directional movement (up, down, left, right)
  - **Moore Topology**: 8-directional movement (including diagonals)
- **Movement Modes**:
  - **Parallel Mode**: All agents move simultaneously
  - **Sequential Mode**: Agents move one at a time
- **Decision Modes**:
  - **Centralized**: Global knowledge for all agents
  - **Distributed**: Limited visibility and local decision making
- **Hungarian Algorithm**: Optimal assignment of agents to target positions
- **Deadlock Detection and Resolution**: Detection and handling of deadlocks when agents block each other
- **Interactive UI**: Configurable grid size and target shapes
- **Dynamic Placement**: Manually place agents, targets, and walls for custom scenarios

## Getting Started

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Configure the grid size (5-50) and click "Apply Size"
4. Choose between manual placement or auto-generation
5. Select pathfinding algorithm, topology, and movement mode
6. Place agents and targets on the grid manually or select a predefined shape
7. Click "Initialize Grid" to set up the simulation
8. Click "Start Simulation" to begin

## Usage

### Grid Setup
- **Grid Size**: Set the grid dimensions (5-50) and click "Apply Size"
- **Mode Selection**: Choose between Wall, Agent, or Target placement mode
- **Generation Mode**: Choose between Manual Placement or Auto-Generate
- **Target Shape**: Select Diamond, Triangle, Square, or Custom shape

### Algorithm Options
- **Pathfinding**: Choose between A*, BFS, Minimax, or Expectimax algorithms
- **Topology**: Select Von Neumann (4-way) or Moore (8-way) movement
- **Movement Mode**: Select Parallel (all agents move simultaneously) or Sequential (one agent at a time)
- **Decision Mode**: Choose Centralized (global knowledge) or Distributed (limited visibility)

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

## Algorithm Details

### A* Algorithm
- Uses a combination of actual cost and heuristic estimated cost
- Optimal for finding shortest paths in most scenarios
- Balanced between speed and path quality

### BFS Algorithm
- Explores all neighbors at the present depth before moving to nodes at the next depth
- Guaranteed to find the shortest path in unweighted graphs
- Works well in maze-like environments

### Minimax Algorithm
- Applies game theory concepts to pathfinding
- Views obstacles as adversaries that try to block optimal paths
- Uses alpha-beta pruning for performance optimization
- Good for finding robust paths in complex environments

### Expectimax Algorithm
- Extension of Minimax that accounts for probabilistic outcomes
- Models uncertainty in the environment
- Considers the expected utility of each possible move
- Well-suited for scenarios with unpredictable obstacles

## How It Works

1. Agents are placed manually or at predefined positions
2. Target positions form a shape (diamond, triangle, square) or are placed manually
3. The Hungarian algorithm determines the optimal agent-to-target assignments
4. The selected pathfinding algorithm calculates paths for each agent to reach its target
5. Agents move according to the selected movement mode (parallel or sequential)
6. The deadlock handler detects and resolves situations where agents block each other

## Implementation Details

- **Decision Modes**: Choose between centralized (global knowledge) or distributed (limited visibility)
- **Movement Topologies**: Von Neumann (4-way) or Moore (8-way) movement
- **Performance Tracking**: The UI displays the total number of moves and other statistics 