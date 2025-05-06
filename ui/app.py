"""Main application for the programmable matter simulation."""
import pygame
import sys
import numpy as np
from ui.config import *
from ui.grid import Grid
from ui.algorithms import PathPlanner, AssignmentStrategy
from ui.widgets import Button, Slider, DropDown, Label


class App:
    """Main application class for the programmable matter simulation."""
    
    def __init__(self):
        """Initialize the application."""
        pygame.init()
        pygame.font.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Programmable Matter Simulation")
        self.clock = pygame.time.Clock()
        self.running = True
        
        # Create grid and components
        self.grid = Grid(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE)
        self.path_planner = PathPlanner(self.grid)
        
        # UI state
        self.selected_tool = CELL_EMPTY
        self.selected_algorithm = ALGORITHM_ASTAR
        self.selected_assignment = ASSIGNMENT_HUNGARIAN
        self.is_simulation_running = False
        self.simulation_speed = 5  # Frames per step
        self.frame_counter = 0
        self.current_step = 0
        
        # Current simulation paths
        self.paths = {}
        
        # UI setup
        self.setup_ui()
    
    def setup_ui(self):
        """Setup UI components."""
        self.ui_components = []
        
        # Grid size controls
        y_offset = 30
        self.ui_components.append(Label("Grid Size", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        self.grid_size_slider = Slider(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset, 
            SIDEBAR_WIDTH - 40, 30, 
            MIN_GRID_SIZE, MAX_GRID_SIZE, DEFAULT_GRID_SIZE,
            lambda val: self.resize_grid(int(val))
        )
        self.ui_components.append(self.grid_size_slider)
        
        # Tools section
        y_offset += 60
        self.ui_components.append(Label("Tools", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        tool_buttons = [
            ("Empty", CELL_EMPTY),
            ("Agent", CELL_AGENT),
            ("Target", CELL_TARGET),
            ("Wall", CELL_WALL)
        ]
        
        for i, (name, tool_type) in enumerate(tool_buttons):
            button = Button(
                SCREEN_WIDTH - SIDEBAR_WIDTH + 20 + (i * (SIDEBAR_WIDTH - 40) // len(tool_buttons)),
                y_offset,
                (SIDEBAR_WIDTH - 40) // len(tool_buttons) - 5,
                30,
                name,
                lambda t=tool_type: self.set_tool(t)
            )
            self.ui_components.append(button)
        
        # Shapes section
        y_offset += 60
        self.ui_components.append(Label("Shapes", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        shape_buttons = []
        for i, shape_name in enumerate(PREDEFINED_SHAPES.keys()):
            button = Button(
                SCREEN_WIDTH - SIDEBAR_WIDTH + 20 + (i * (SIDEBAR_WIDTH - 40) // len(PREDEFINED_SHAPES)),
                y_offset,
                (SIDEBAR_WIDTH - 40) // len(PREDEFINED_SHAPES) - 5,
                30,
                shape_name,
                lambda name=shape_name: self.place_predefined_shape(name)
            )
            self.ui_components.append(button)
        
        # Topology controls
        y_offset += 60
        self.ui_components.append(Label("Topology", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        topology_options = [TOPOLOGY_VON_NEUMANN, TOPOLOGY_MOORE]
        self.topology_dropdown = DropDown(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset, 
            SIDEBAR_WIDTH - 40, 30,
            topology_options,
            lambda val: self.set_topology(val)
        )
        self.ui_components.append(self.topology_dropdown)
        
        # Decision making controls
        y_offset += 60
        self.ui_components.append(Label("Decision Making", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        decision_options = [DECISION_CENTRALIZED, DECISION_DISTRIBUTED]
        self.decision_dropdown = DropDown(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset, 
            SIDEBAR_WIDTH - 40, 30,
            decision_options,
            lambda val: self.set_decision_making(val)
        )
        self.ui_components.append(self.decision_dropdown)
        
        # Movement controls
        y_offset += 60
        self.ui_components.append(Label("Movement", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        movement_options = [MOVEMENT_SEQUENTIAL, MOVEMENT_PARALLEL, MOVEMENT_ASYNC]
        self.movement_dropdown = DropDown(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset, 
            SIDEBAR_WIDTH - 40, 30,
            movement_options,
            lambda val: self.set_movement(val)
        )
        self.ui_components.append(self.movement_dropdown)
        
        # Algorithm controls
        y_offset += 60
        self.ui_components.append(Label("Algorithm", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        algorithm_options = [ALGORITHM_BFS, ALGORITHM_ASTAR, ALGORITHM_GREEDY]
        self.algorithm_dropdown = DropDown(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset, 
            SIDEBAR_WIDTH - 40, 30,
            algorithm_options,
            lambda val: self.set_algorithm(val)
        )
        self.ui_components.append(self.algorithm_dropdown)
        
        # Assignment strategy controls
        y_offset += 60
        self.ui_components.append(Label("Assignment Strategy", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        assignment_options = [ASSIGNMENT_HUNGARIAN, ASSIGNMENT_GREEDY, ASSIGNMENT_AUCTION]
        self.assignment_dropdown = DropDown(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset, 
            SIDEBAR_WIDTH - 40, 30,
            assignment_options,
            lambda val: self.set_assignment_strategy(val)
        )
        self.ui_components.append(self.assignment_dropdown)
        
        # Simulation controls
        y_offset += 60
        self.simulation_button = Button(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset,
            SIDEBAR_WIDTH - 40, 40,
            "Start Simulation",
            self.toggle_simulation
        )
        self.ui_components.append(self.simulation_button)
        
        y_offset += 50
        self.ui_components.append(Label("Simulation Speed", SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset))
        
        y_offset += 30
        self.speed_slider = Slider(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset, 
            SIDEBAR_WIDTH - 40, 30, 
            1, 10, self.simulation_speed,
            lambda val: self.set_simulation_speed(int(val))
        )
        self.ui_components.append(self.speed_slider)
        
        # Reset button
        y_offset += 60
        self.reset_button = Button(
            SCREEN_WIDTH - SIDEBAR_WIDTH + 20, y_offset,
            SIDEBAR_WIDTH - 40, 40,
            "Reset",
            self.reset_simulation
        )
        self.ui_components.append(self.reset_button)
    
    def resize_grid(self, size):
        """Resize the grid."""
        self.grid.resize(size, size)
        
    def set_tool(self, tool_type):
        """Set the selected tool."""
        self.selected_tool = tool_type
        
    def place_predefined_shape(self, shape_name):
        """Place a predefined shape on the grid."""
        shape = PREDEFINED_SHAPES.get(shape_name)
        if shape:
            # Place in the center of the grid
            start_row = self.grid.n // 2 - len(shape) // 2
            start_col = self.grid.m // 2 - len(shape[0]) // 2
            self.grid.place_shape(shape, start_row, start_col, CELL_TARGET)
    
    def set_topology(self, topology):
        """Set the grid topology."""
        self.grid.topology = topology
        
    def set_decision_making(self, decision):
        """Set the decision making approach."""
        self.grid.decision = decision
        
    def set_movement(self, movement):
        """Set the movement type."""
        self.grid.movement = movement
        
    def set_algorithm(self, algorithm):
        """Set the pathfinding algorithm."""
        self.selected_algorithm = algorithm
        
    def set_assignment_strategy(self, strategy):
        """Set the agent-target assignment strategy."""
        self.selected_assignment = strategy
        
    def set_simulation_speed(self, speed):
        """Set the simulation speed."""
        self.simulation_speed = speed
    
    def toggle_simulation(self):
        """Toggle the simulation state."""
        if self.is_simulation_running:
            self.is_simulation_running = False
            self.simulation_button.text = "Start Simulation"
        else:
            self.prepare_simulation()
            self.is_simulation_running = True
            self.simulation_button.text = "Stop Simulation"
    
    def reset_simulation(self):
        """Reset the simulation state."""
        self.is_simulation_running = False
        self.simulation_button.text = "Start Simulation"
        self.current_step = 0
        self.paths = {}
        self.grid.clear_paths()
    
    def prepare_simulation(self):
        """Prepare for simulation by computing paths."""
        # Reset simulation state
        self.current_step = 0
        self.grid.clear_paths()
        
        # Assign agents to targets based on the selected strategy
        assignments = []
        if self.selected_assignment == ASSIGNMENT_HUNGARIAN:
            assignments = AssignmentStrategy.hungarian(self.grid, self.grid.agents, self.grid.targets)
        elif self.selected_assignment == ASSIGNMENT_GREEDY:
            assignments = AssignmentStrategy.greedy(self.grid, self.grid.agents, self.grid.targets)
        elif self.selected_assignment == ASSIGNMENT_AUCTION:
            assignments = AssignmentStrategy.auction(self.grid, self.grid.agents, self.grid.targets)
        
        # Plan paths based on assignments
        self.paths = self.path_planner.plan_paths(
            self.selected_algorithm, 
            self.grid.agents, 
            self.grid.targets, 
            assignments
        )
        
        # Detect and resolve deadlocks
        self.paths = self.path_planner.detect_deadlocks(self.paths)
    
    def update_simulation(self):
        """Update the simulation state."""
        if not self.is_simulation_running:
            return
        
        self.frame_counter += 1
        if self.frame_counter < self.simulation_speed:
            return
            
        self.frame_counter = 0
        
        # Check if we're done
        if not any(p and self.current_step < len(p) for p in self.paths.values()):
            self.is_simulation_running = False
            self.simulation_button.text = "Start Simulation"
            return
        
        # Move agents based on their paths
        if self.grid.movement == MOVEMENT_SEQUENTIAL:
            # Move one agent at a time
            for agent_idx, path in self.paths.items():
                if path and self.current_step < len(path):
                    # Find current agent position
                    if agent_idx < len(self.grid.agents):
                        r, c = self.grid.agents[agent_idx]
                        # Clear current position
                        self.grid.cells[r, c] = CELL_EMPTY
                        # Move to new position
                        new_r, new_c = path[self.current_step]
                        self.grid.agents[agent_idx] = (new_r, new_c)
                        self.grid.cells[new_r, new_c] = CELL_AGENT
                    break  # Only move one agent per step for sequential
            
        elif self.grid.movement == MOVEMENT_PARALLEL:
            # Move all agents simultaneously
            new_positions = {}
            
            # First, compute the new positions for all agents
            for agent_idx, path in self.paths.items():
                if path and self.current_step < len(path):
                    new_positions[agent_idx] = path[self.current_step]
            
            # Then, apply the movements (to avoid overwriting positions)
            for agent_idx, (new_r, new_c) in new_positions.items():
                if agent_idx < len(self.grid.agents):
                    r, c = self.grid.agents[agent_idx]
                    # Clear current position
                    self.grid.cells[r, c] = CELL_EMPTY
                    # Move to new position
                    self.grid.agents[agent_idx] = (new_r, new_c)
                    self.grid.cells[new_r, new_c] = CELL_AGENT
        
        else:  # MOVEMENT_ASYNC
            # Move agents at their own pace
            for agent_idx, path in self.paths.items():
                if path and agent_idx * self.current_step % 3 < len(path):
                    step = min(self.current_step // (agent_idx + 1), len(path) - 1)
                    # Find current agent position
                    if agent_idx < len(self.grid.agents):
                        r, c = self.grid.agents[agent_idx]
                        # Clear current position
                        self.grid.cells[r, c] = CELL_EMPTY
                        # Move to new position
                        new_r, new_c = path[step]
                        self.grid.agents[agent_idx] = (new_r, new_c)
                        self.grid.cells[new_r, new_c] = CELL_AGENT
        
        self.current_step += 1
    
    def handle_mouse_events(self):
        """Handle mouse events for grid interaction."""
        mouse_pos = pygame.mouse.get_pos()
        mouse_pressed = pygame.mouse.get_pressed()
        
        # Check if mouse is over the grid
        grid_width = self.grid.m * CELL_SIZE
        grid_height = self.grid.n * CELL_SIZE
        
        if (GRID_OFFSET_X <= mouse_pos[0] < GRID_OFFSET_X + grid_width and
            GRID_OFFSET_Y <= mouse_pos[1] < GRID_OFFSET_Y + grid_height and
            mouse_pressed[0]):
            
            # Calculate grid coordinates
            col = (mouse_pos[0] - GRID_OFFSET_X) // CELL_SIZE
            row = (mouse_pos[1] - GRID_OFFSET_Y) // CELL_SIZE
            
            # Set the cell type based on the selected tool
            self.grid.set_cell(row, col, self.selected_tool)
    
    def handle_events(self):
        """Handle all events."""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            
            # Handle UI component events
            for component in self.ui_components:
                component.handle_event(event)
    
    def run(self):
        """Main application loop."""
        while self.running:
            self.handle_events()
            self.handle_mouse_events()
            self.update_simulation()
            
            # Render the application
            self.screen.fill(DARK_GRAY)
            
            # Draw the grid
            self.grid.draw(self.screen, GRID_OFFSET_X, GRID_OFFSET_Y, CELL_SIZE)
            
            # Draw the UI components
            for component in self.ui_components:
                component.draw(self.screen)
            
            pygame.display.flip()
            self.clock.tick(FPS)
        
        pygame.quit()
        sys.exit() 