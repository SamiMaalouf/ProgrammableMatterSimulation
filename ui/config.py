"""Configuration settings for the programmable matter simulation."""

# Screen settings
SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 800
SIDEBAR_WIDTH = 300
GRID_OFFSET_X = 50
GRID_OFFSET_Y = 50
FPS = 60

# Grid defaults
DEFAULT_GRID_SIZE = 10  # Default n=m=10
MIN_GRID_SIZE = 5
MAX_GRID_SIZE = 20
CELL_SIZE = 40
GRID_LINE_WIDTH = 1

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
DARK_GRAY = (100, 100, 100)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)
ORANGE = (255, 165, 0)
PURPLE = (128, 0, 128)
CYAN = (0, 255, 255)
PINK = (255, 192, 203)

# Cell types and colors
CELL_EMPTY = 0
CELL_AGENT = 1
CELL_TARGET = 2
CELL_WALL = 3
CELL_PATH = 4

CELL_COLORS = {
    CELL_EMPTY: WHITE,
    CELL_AGENT: BLUE,
    CELL_TARGET: GREEN,
    CELL_WALL: BLACK,
    CELL_PATH: ORANGE
}

# Shape templates (for target configurations)
SHAPE_SQUARE = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1]
]

SHAPE_DIAMOND = [
    [0, 1, 0],
    [1, 0, 1],
    [0, 1, 0]
]

SHAPE_TRIANGLE = [
    [0, 1, 0],
    [1, 1, 1]
]

SHAPE_LINE = [
    [1, 1, 1, 1, 1]
]

PREDEFINED_SHAPES = {
    "Square": SHAPE_SQUARE,
    "Diamond": SHAPE_DIAMOND,
    "Triangle": SHAPE_TRIANGLE,
    "Line": SHAPE_LINE
}

# Topology types
TOPOLOGY_VON_NEUMANN = "Von Neumann"  # Up, Down, Left, Right
TOPOLOGY_MOORE = "Moore"  # Von Neumann + Diagonals

# Decision making types
DECISION_CENTRALIZED = "Centralized"
DECISION_DISTRIBUTED = "Distributed"

# Movement types
MOVEMENT_SEQUENTIAL = "Sequential"
MOVEMENT_PARALLEL = "Parallel"
MOVEMENT_ASYNC = "Asynchronous"

# Algorithms
ALGORITHM_BFS = "Breadth-First Search"
ALGORITHM_ASTAR = "A* Search"
ALGORITHM_GREEDY = "Greedy Search"
ALGORITHM_MINIMAX = "Minimax"
ALGORITHM_ALPHA_BETA = "Alpha-Beta Pruning"
ALGORITHM_EXPECTIMAX = "Expectimax"
ALGORITHM_CELLULAR_AUTOMATA = "Cellular Automata"
ALGORITHM_GRADIENT = "Gradient-Based"

# Assignment strategies
ASSIGNMENT_HUNGARIAN = "Hungarian Algorithm"
ASSIGNMENT_GREEDY = "Greedy Assignment"
ASSIGNMENT_AUCTION = "Auction-Based" 