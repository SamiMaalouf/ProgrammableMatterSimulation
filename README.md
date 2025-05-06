# Programmable Matter Simulation

A simulation of programmable matter agents navigating a 2D grid to form target shapes. This project implements a state-space search problem where agents need to move to specific positions to form predefined shapes.

## Features

- Dynamic grid size configuration (5x5 to 20x20)
- Place agents, targets, and walls dynamically on the grid
- Multiple topology options (Von Neumann, Moore)
- Multiple decision-making approaches (Centralized, Distributed)
- Multiple movement types (Sequential, Parallel, Asynchronous)
- Multiple pathfinding algorithms (BFS, A*, Greedy)
- Multiple agent-target assignment strategies (Hungarian, Greedy, Auction)
- Deadlock prevention to avoid infinite loops and collisions
- Predefined shapes (Square, Diamond, Triangle, Line)
- Interactive UI with real-time simulation

## Requirements

- Python 3.7+
- Pygame
- NumPy

## Installation

1. Clone this repository
2. Install the required packages:

```bash
pip install -r requirements.txt
```

## Running the Simulation

Run the main script:

```bash
python main.py
```

## How to Use

1. **Grid Configuration**:
   - Use the "Grid Size" slider to adjust the grid dimensions
   - Choose a topology (Von Neumann for 4-connectivity, Moore for 8-connectivity)

2. **Place Elements**:
   - Select a tool (Agent, Target, Wall, Empty) and click on the grid to place elements
   - Use the shape buttons to place predefined target shapes on the grid

3. **Configure Simulation**:
   - Select a pathfinding algorithm (BFS, A*, Greedy)
   - Select an agent-target assignment strategy (Hungarian, Greedy, Auction)
   - Select a decision-making approach (Centralized, Distributed)
   - Select a movement type (Sequential, Parallel, Asynchronous)
   - Adjust simulation speed using the slider

4. **Run Simulation**:
   - Click "Start Simulation" to begin the simulation
   - Click "Stop Simulation" to pause
   - Click "Reset" to clear paths and restart

## Project Details

This project simulates programmable matter agents moving through a grid to form specific shapes. It includes:

- Pathfinding algorithms for movement planning
- Agent-target assignment strategies
- Deadlock detection and prevention
- Multiple movement coordination strategies

The project follows the specifications described in the course project, implementing both the basic state-space search (Project 1) and the extended multi-agent system with various decision-making and movement strategies (Project 2). 