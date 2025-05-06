"""Grid module for the programmable matter simulation."""
import numpy as np
import pygame
from ui.config import *

class Grid:
    """Represents the programmable matter grid."""
    
    def __init__(self, n=DEFAULT_GRID_SIZE, m=DEFAULT_GRID_SIZE):
        """Initialize a grid of size n x m."""
        self.n = n
        self.m = m
        self.cells = np.zeros((n, m), dtype=int)
        self.agents = []  # List of (row, col) tuples for agent positions
        self.targets = []  # List of (row, col) tuples for target positions
        self.walls = []   # List of (row, col) tuples for wall positions
        self.paths = {}   # Dictionary mapping agent index to path
        self.topology = TOPOLOGY_VON_NEUMANN
        self.movement = MOVEMENT_SEQUENTIAL
        self.decision = DECISION_CENTRALIZED
        
    def resize(self, n, m):
        """Resize the grid to n x m."""
        old_cells = self.cells
        self.n = n
        self.m = m
        self.cells = np.zeros((n, m), dtype=int)
        
        # Copy over the old values where they fit
        n_copy = min(old_cells.shape[0], n)
        m_copy = min(old_cells.shape[1], m)
        self.cells[:n_copy, :m_copy] = old_cells[:n_copy, :m_copy]
        
        # Update agent, target, and wall positions
        self.agents = [(r, c) for r, c in self.agents if r < n and c < m]
        self.targets = [(r, c) for r, c in self.targets if r < n and c < m]
        self.walls = [(r, c) for r, c in self.walls if r < n and c < m]
        self.clear_paths()
        
    def clear(self):
        """Clear the grid of all elements."""
        self.cells = np.zeros((self.n, self.m), dtype=int)
        self.agents = []
        self.targets = []
        self.walls = []
        self.clear_paths()
        
    def clear_paths(self):
        """Clear the calculated paths."""
        self.paths = {}
        for r, c in self.agents:
            self.cells[r, c] = CELL_AGENT
        
    def get_cell_type(self, row, col):
        """Get the type of cell at the given position."""
        if 0 <= row < self.n and 0 <= col < self.m:
            return self.cells[row, col]
        return None
    
    def set_cell(self, row, col, cell_type):
        """Set the cell at the given position to the given type."""
        if 0 <= row < self.n and 0 <= col < self.m:
            old_type = self.cells[row, col]
            
            # Remove from the appropriate list if it was already a special cell
            if old_type == CELL_AGENT and (row, col) in self.agents:
                self.agents.remove((row, col))
            elif old_type == CELL_TARGET and (row, col) in self.targets:
                self.targets.remove((row, col))
            elif old_type == CELL_WALL and (row, col) in self.walls:
                self.walls.remove((row, col))
            
            # Add to the appropriate list
            if cell_type == CELL_AGENT and (row, col) not in self.agents:
                self.agents.append((row, col))
            elif cell_type == CELL_TARGET and (row, col) not in self.targets:
                self.targets.append((row, col))
            elif cell_type == CELL_WALL and (row, col) not in self.walls:
                self.walls.append((row, col))
            
            self.cells[row, col] = cell_type
            return True
        return False
    
    def place_shape(self, shape, start_row, start_col, cell_type=CELL_TARGET):
        """Place a predefined shape on the grid."""
        shape_height = len(shape)
        shape_width = len(shape[0])
        
        for r in range(shape_height):
            for c in range(shape_width):
                if shape[r][c] == 1:
                    grid_r = start_row + r
                    grid_c = start_col + c
                    if 0 <= grid_r < self.n and 0 <= grid_c < self.m:
                        self.set_cell(grid_r, grid_c, cell_type)
    
    def get_neighbors(self, row, col):
        """Get the valid neighboring positions based on the topology."""
        neighbors = []
        
        # Von Neumann neighborhood (4-connectivity)
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
        
        # Add diagonals for Moore neighborhood (8-connectivity)
        if self.topology == TOPOLOGY_MOORE:
            directions.extend([(1, 1), (1, -1), (-1, -1), (-1, 1)])
        
        for dr, dc in directions:
            nr, nc = row + dr, col + dc
            if 0 <= nr < self.n and 0 <= nc < self.m and self.cells[nr, nc] != CELL_WALL:
                neighbors.append((nr, nc))
                
        return neighbors
    
    def draw(self, surface, offset_x, offset_y, cell_size):
        """Draw the grid on the given surface."""
        # Draw the grid background
        pygame.draw.rect(surface, WHITE, 
                         (offset_x - 1, offset_y - 1, 
                          self.m * cell_size + 2, 
                          self.n * cell_size + 2))
        
        # Draw the grid cells
        for r in range(self.n):
            for c in range(self.m):
                cell_type = self.cells[r, c]
                cell_color = CELL_COLORS[cell_type]
                
                rect = pygame.Rect(
                    offset_x + c * cell_size,
                    offset_y + r * cell_size,
                    cell_size, cell_size
                )
                
                pygame.draw.rect(surface, cell_color, rect)
                pygame.draw.rect(surface, GRAY, rect, GRID_LINE_WIDTH)
                
                # Draw cell contents (numbers for agents, etc.)
                if cell_type == CELL_AGENT:
                    agent_idx = self.agents.index((r, c))
                    font = pygame.font.Font(None, 24)
                    text = font.render(str(agent_idx + 1), True, WHITE)
                    text_rect = text.get_rect(center=rect.center)
                    surface.blit(text, text_rect) 