/**
 * Programmable Matter Simulation
 * - Von Neumann Topology (4-directional movement)
 * - A* Pathfinding
 * - Hungarian Algorithm for target assignment
 * - Deadlock detection and resolution
 */

// Grid cell types
const CELL_EMPTY = 0;
const CELL_WALL = 1;
const CELL_AGENT = 2;
const CELL_TARGET = 3;

// Interaction modes
const MODE_WALL = 'wall';
const MODE_AGENT = 'agent';
const MODE_TARGET = 'target';

// Generation modes
const GEN_MANUAL = 'manual';
const GEN_AUTO = 'auto';

// Shape definitions for target formations
const SHAPES = {
    diamond: [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0]
    ],
    triangle: [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1]
    ],
    square: [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1]
    ]
};

// Simulation state
let grid = [];
let agents = [];
let targetPositions = [];
let gridSize = 10;
let isSimulationRunning = false;
let simulationInterval = null;
let totalMoves = 0;
let deadlockHandler = null;
let currentMode = MODE_WALL;
let generationMode = GEN_MANUAL;
let failedDeadlockResolutionAttempts = 0; // Track failed deadlock resolution attempts
let sequentialMovementMode = false; // Flag for sequential movement mode
let sequentialMovesRemaining = 0; // Counter for sequential moves

// DOM elements
const gridContainer = document.getElementById('grid-container');
const gridSizeInput = document.getElementById('grid-size');
const applyGridSizeBtn = document.getElementById('apply-grid-size-btn');
const interactionModeSelect = document.getElementById('interaction-mode');
const generationModeSelect = document.getElementById('generation-mode');
const targetShapeSelect = document.getElementById('target-shape');
const initializeBtn = document.getElementById('initialize-btn');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const clearAgentsBtn = document.getElementById('clear-agents-btn');
const clearTargetsBtn = document.getElementById('clear-targets-btn');
const clearWallsBtn = document.getElementById('clear-walls-btn');
const clearLogBtn = document.getElementById('clear-log-btn');
const totalMovesDisplay = document.getElementById('total-moves');
const deadlocksResolvedDisplay = document.getElementById('deadlocks-resolved');
const agentsCountDisplay = document.getElementById('agents-count');
const targetsCountDisplay = document.getElementById('targets-count');
const currentModeDisplay = document.getElementById('current-mode');
const logConsole = document.getElementById('log-console');

// Event listeners
initializeBtn.addEventListener('click', initializeGrid);
applyGridSizeBtn.addEventListener('click', applyGridSize);
startBtn.addEventListener('click', toggleSimulation);
resetBtn.addEventListener('click', resetSimulation);
clearAgentsBtn.addEventListener('click', clearAgents);
clearTargetsBtn.addEventListener('click', clearTargets);
clearWallsBtn.addEventListener('click', clearWalls);
clearLogBtn.addEventListener('click', clearLog);
interactionModeSelect.addEventListener('change', changeInteractionMode);
generationModeSelect.addEventListener('change', changeGenerationMode);
targetShapeSelect.addEventListener('change', handleTargetShapeChange);

/**
 * Log a message to the console with optional type (info, warn, error, success)
 * @param {string} message - The message to log
 * @param {string} type - The type of log message (info, warn, error, success)
 */
function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    
    logConsole.appendChild(entry);
    logConsole.scrollTop = logConsole.scrollHeight;
    
    // Also log to browser console for debugging
    console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Clear the log console
 */
function clearLog() {
    logConsole.innerHTML = '';
    log('Log cleared', 'info');
}

/**
 * Apply new grid size
 */
function applyGridSize() {
    const newSize = parseInt(gridSizeInput.value, 10);
    if (newSize < 5 || newSize > 30) {
        log(`Invalid grid size. Please enter a value between 5 and 30.`, 'error');
        return;
    }
    
    gridSize = newSize;
    log(`Grid size set to ${gridSize}x${gridSize}`, 'info');
    initializeGrid();
}

/**
 * Change the current interaction mode
 */
function changeInteractionMode() {
    currentMode = interactionModeSelect.value;
    currentModeDisplay.textContent = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
    log(`Interaction mode changed to: ${currentMode}`, 'info');
    
    // Update cell hover styles
    updateCellHoverStyles();
}

/**
 * Change the generation mode
 */
function changeGenerationMode() {
    generationMode = generationModeSelect.value;
    log(`Generation mode changed to: ${generationMode}`, 'info');
    
    // Update UI based on generation mode
    if (generationMode === GEN_AUTO) {
        targetShapeSelect.disabled = false;
        log('Auto generation enabled. Target shape selector is now active.', 'info');
    } else {
        if (targetShapeSelect.value !== 'custom') {
            targetShapeSelect.value = 'custom';
        }
        targetShapeSelect.disabled = false;
        log('Manual placement enabled. Place agents and targets by clicking on the grid.', 'info');
    }
}

/**
 * Handle target shape change
 */
function handleTargetShapeChange() {
    const shape = targetShapeSelect.value;
    log(`Target shape changed to: ${shape}`, 'info');
    
    if (shape !== 'custom' && generationMode === GEN_AUTO) {
        // Clear existing targets if auto generation
        clearTargets();
        // Generate new targets based on shape
        setTargetShape(shape);
        renderGrid();
    } else if (shape === 'custom') {
        log('Custom shape selected. Place targets manually on the grid.', 'info');
    }
}

/**
 * Update cell hover styles based on current mode
 */
function updateCellHoverStyles() {
    const cells = gridContainer.querySelectorAll('.cell');
    
    cells.forEach(cell => {
        cell.classList.remove('mode-wall', 'mode-agent', 'mode-target');
        cell.classList.add(`mode-${currentMode}`);
    });
}

/**
 * Initialize the grid based on selected parameters
 */
function initializeGrid() {
    resetSimulation();
    log('Initializing grid...', 'info');
    
    // Get grid size
    gridSize = parseInt(gridSizeInput.value, 10);
    log(`Grid size set to ${gridSize}x${gridSize}`, 'info');
    
    // Create grid
    grid = createEmptyGrid(gridSize);
    
    // Clear old grid
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    // Create cells
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('div');
            cell.className = `cell mode-${currentMode}`;
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // Add click event for placing elements
            cell.addEventListener('click', () => handleCellClick(x, y));
            
            gridContainer.appendChild(cell);
        }
    }
    
    // Add initial agents at the bottom row if auto generation is enabled
    if (generationMode === GEN_AUTO) {
        const initialAgentCount = Math.min(5, Math.floor(gridSize * 0.5));
        const startY = gridSize - 1;
        const spacing = Math.floor(gridSize / initialAgentCount);
        
        log(`Adding ${initialAgentCount} agents at the bottom row`, 'info');
        
        for (let i = 0; i < initialAgentCount; i++) {
            const x = i * spacing;
            if (x < gridSize) {
                addAgent(x, startY);
            }
        }
        
        // Set target shape in the middle of the grid
        if (targetShapeSelect.value !== 'custom') {
            setTargetShape(targetShapeSelect.value);
        }
    }
    
    // Render initial state
    renderGrid();
    
    // Create deadlock handler
    deadlockHandler = new DeadlockHandler(grid, agents);
    
    // Update UI
    startBtn.disabled = (agents.length === 0 || targetPositions.length === 0);
    
    updateCountDisplays();
    log('Grid initialized successfully', 'success');
}

/**
 * Handle cell click based on current interaction mode
 */
function handleCellClick(x, y) {
    if (isSimulationRunning) {
        log('Cannot modify grid while simulation is running', 'warn');
        return;
    }
    
    switch (currentMode) {
        case MODE_WALL:
            toggleWall(x, y);
            break;
        case MODE_AGENT:
            toggleAgent(x, y);
            break;
        case MODE_TARGET:
            toggleTarget(x, y);
            break;
    }
    
    // Update the start button based on agents and targets count
    startBtn.disabled = (agents.length === 0 || targetPositions.length === 0);
}

/**
 * Update the agent and target count displays
 */
function updateCountDisplays() {
    agentsCountDisplay.textContent = agents.length;
    targetsCountDisplay.textContent = targetPositions.length;
}

/**
 * Create an empty grid of specified size
 */
function createEmptyGrid(size) {
    const newGrid = [];
    for (let y = 0; y < size; y++) {
        const row = [];
        for (let x = 0; x < size; x++) {
            row.push(CELL_EMPTY);
        }
        newGrid.push(row);
    }
    return newGrid;
}

/**
 * Toggle an agent cell on/off
 */
function toggleAgent(x, y) {
    // Check if there's a wall or target there
    if (grid[y][x] === CELL_WALL) {
        log(`Cannot place agent on wall at (${x}, ${y})`, 'warn');
        return;
    }
    
    const isAgent = agents.some(agent => agent.x === x && agent.y === y);
    
    if (isAgent) {
        // Remove agent
        const agentIndex = agents.findIndex(agent => agent.x === x && agent.y === y);
        if (agentIndex !== -1) {
            agents.splice(agentIndex, 1);
            grid[y][x] = CELL_EMPTY;
            log(`Removed agent at position (${x}, ${y})`, 'info');
            
            // Reassign agent IDs
            agents.forEach((agent, index) => {
                agent.id = index;
            });
        }
    } else {
        // Add agent
        addAgent(x, y);
    }
    
    renderGrid();
    updateCountDisplays();
}

/**
 * Toggle a target cell on/off
 */
function toggleTarget(x, y) {
    // Check if there's a wall there
    if (grid[y][x] === CELL_WALL) {
        log(`Cannot place target on wall at (${x}, ${y})`, 'warn');
        return;
    }
    
    const isTarget = targetPositions.some(pos => pos.x === x && pos.y === y);
    
    if (isTarget) {
        // Remove target
        const targetIndex = targetPositions.findIndex(pos => pos.x === x && pos.y === y);
        if (targetIndex !== -1) {
            targetPositions.splice(targetIndex, 1);
            log(`Removed target at position (${x}, ${y})`, 'info');
        }
    } else {
        // Add target
        targetPositions.push({ x, y });
        log(`Added target at position (${x}, ${y})`, 'info');
    }
    
    renderGrid();
    updateCountDisplays();
}

/**
 * Add an agent to the grid
 */
function addAgent(x, y) {
    // Don't add if there's already an agent or wall there
    if (grid[y][x] === CELL_WALL || agents.some(agent => agent.x === x && agent.y === y)) {
        return;
    }
    
    const agent = {
        id: agents.length,
        x: x,
        y: y,
        targetX: null,
        targetY: null,
        path: [],
        isRetreating: false
    };
    
    agents.push(agent);
    grid[y][x] = CELL_AGENT;
    log(`Added agent ${agent.id} at position (${x}, ${y})`, 'info');
}

/**
 * Clear all agents from the grid
 */
function clearAgents() {
    if (isSimulationRunning) {
        log('Cannot clear agents while simulation is running', 'warn');
        return;
    }
    
    // Remove agents from grid
    agents.forEach(agent => {
        grid[agent.y][agent.x] = CELL_EMPTY;
    });
    
    agents = [];
    log('All agents cleared', 'info');
    renderGrid();
    updateCountDisplays();
    
    // Update the start button
    startBtn.disabled = (agents.length === 0 || targetPositions.length === 0);
}

/**
 * Clear all targets from the grid
 */
function clearTargets() {
    if (isSimulationRunning) {
        log('Cannot clear targets while simulation is running', 'warn');
        return;
    }
    
    targetPositions = [];
    log('All targets cleared', 'info');
    renderGrid();
    updateCountDisplays();
    
    // Update the start button
    startBtn.disabled = (agents.length === 0 || targetPositions.length === 0);
}

/**
 * Clear all walls from the grid
 */
function clearWalls() {
    if (isSimulationRunning) {
        log('Cannot clear walls while simulation is running', 'warn');
        return;
    }
    
    // Create new grid with agents and targets preserved
    const newGrid = createEmptyGrid(gridSize);
    
    // Restore agents
    agents.forEach(agent => {
        newGrid[agent.y][agent.x] = CELL_AGENT;
    });
    
    grid = newGrid;
    log('All walls cleared', 'info');
    renderGrid();
}

/**
 * Toggle a wall cell on/off
 */
function toggleWall(x, y) {
    // Don't allow walls on agent positions
    if (agents.some(agent => agent.x === x && agent.y === y)) {
        log(`Cannot place wall on agent at (${x}, ${y})`, 'warn');
        return;
    }
    
    // Don't allow walls on target positions
    if (targetPositions.some(pos => pos.x === x && pos.y === y)) {
        log(`Cannot place wall on target at (${x}, ${y})`, 'warn');
        return;
    }
    
    // Toggle wall
    if (grid[y][x] === CELL_WALL) {
        grid[y][x] = CELL_EMPTY;
        log(`Removed wall at (${x}, ${y})`, 'info');
    } else {
        grid[y][x] = CELL_WALL;
        log(`Added wall at (${x}, ${y})`, 'info');
    }
    
    renderGrid();
}

/**
 * Set the target shape in the middle of the grid
 */
function setTargetShape(shapeName) {
    if (isSimulationRunning) {
        log('Cannot set target shape while simulation is running', 'warn');
        return;
    }
    
    // Clear old target positions if not in custom mode
    if (shapeName !== 'custom') {
        targetPositions = [];
    }
    
    // Get the shape definition
    const shape = SHAPES[shapeName];
    if (!shape) {
        log(`Invalid shape: ${shapeName}`, 'error');
        return;
    }
    
    log(`Setting target shape to ${shapeName}`, 'info');
    
    // Calculate center position to place the shape
    const shapeHeight = shape.length;
    const shapeWidth = shape[0].length;
    const startX = Math.floor((gridSize - shapeWidth) / 2);
    const startY = Math.floor((gridSize - shapeHeight) / 2);
    
    // Mark target positions
    for (let y = 0; y < shapeHeight; y++) {
        for (let x = 0; x < shapeWidth; x++) {
            if (shape[y][x] === 1) {
                const gridX = startX + x;
                const gridY = startY + y;
                
                // Skip if out of bounds
                if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) {
                    log(`Target position (${gridX}, ${gridY}) is out of bounds, skipping`, 'warn');
                    continue;
                }
                
                // Skip if there's a wall or agent there
                if (grid[gridY][gridX] === CELL_WALL || agents.some(agent => agent.x === gridX && agent.y === gridY)) {
                    log(`Target position (${gridX}, ${gridY}) overlaps with wall or agent, skipping`, 'warn');
                    continue;
                }
                
                targetPositions.push({ x: gridX, y: gridY });
            }
        }
    }
    
    log(`Created ${targetPositions.length} target positions`, 'info');
    updateCountDisplays();
}

/**
 * Render the current grid state to the UI
 */
function renderGrid() {
    const cells = gridContainer.querySelectorAll('.cell');
    
    cells.forEach(cell => {
        const x = parseInt(cell.dataset.x, 10);
        const y = parseInt(cell.dataset.y, 10);
        
        // Reset cell classes but preserve mode class
        const mode = cell.className.match(/mode-\w+/);
        cell.className = 'cell';
        if (mode) {
            cell.classList.add(mode[0]);
        }
        
        // Check if this is a target position
        const isTarget = targetPositions.some(pos => pos.x === x && pos.y === y);
        if (isTarget) {
            cell.classList.add('target');
        }
        
        // Add class based on cell type
        switch (grid[y][x]) {
            case CELL_WALL:
                cell.classList.add('wall');
                break;
            case CELL_AGENT:
                cell.classList.add('active');
                break;
        }
        
        // Show path (debugging)
        const agent = agents.find(a => a.path && a.path.some(p => p.x === x && p.y === y));
        if (agent && !cell.classList.contains('active')) {
            cell.classList.add('path');
        }
    });
}

/**
 * Toggle simulation start/pause
 */
function toggleSimulation() {
    if (isSimulationRunning) {
        pauseSimulation();
        startBtn.textContent = 'Start Simulation';
        log('Simulation paused', 'info');
    } else {
        startSimulation();
        startBtn.textContent = 'Pause Simulation';
        log('Simulation started', 'info');
    }
}

/**
 * Start the simulation
 */
function startSimulation() {
    if (isSimulationRunning) return;
    
    // Check if we have agents and targets
    if (agents.length === 0) {
        log('Cannot start simulation: No agents placed on the grid', 'error');
        return;
    }
    
    if (targetPositions.length === 0) {
        log('Cannot start simulation: No targets placed on the grid', 'error');
        return;
    }
    
    // Reset the failed deadlock resolution counter
    failedDeadlockResolutionAttempts = 0;
    
    // Disable controls while simulation is running
    interactionModeSelect.disabled = true;
    generationModeSelect.disabled = true;
    targetShapeSelect.disabled = true;
    applyGridSizeBtn.disabled = true;
    clearAgentsBtn.disabled = true;
    clearTargetsBtn.disabled = true;
    clearWallsBtn.disabled = true;
    
    isSimulationRunning = true;
    
    // Assign targets to agents using Hungarian algorithm
    assignTargets();
    
    // Start simulation loop
    simulationInterval = setInterval(simulationStep, 300);
}

/**
 * Pause the simulation
 */
function pauseSimulation() {
    isSimulationRunning = false;
    clearInterval(simulationInterval);
    
    // Re-enable controls
    interactionModeSelect.disabled = false;
    generationModeSelect.disabled = false;
    targetShapeSelect.disabled = false;
    applyGridSizeBtn.disabled = false;
    clearAgentsBtn.disabled = false;
    clearTargetsBtn.disabled = false;
    clearWallsBtn.disabled = false;
}

/**
 * Reset the simulation to initial state
 */
function resetSimulation() {
    pauseSimulation();
    
    agents = [];
    targetPositions = [];
    totalMoves = 0;
    
    // Reset UI
    totalMovesDisplay.textContent = '0';
    deadlocksResolvedDisplay.textContent = '0';
    agentsCountDisplay.textContent = '0';
    targetsCountDisplay.textContent = '0';
    startBtn.textContent = 'Start Simulation';
    startBtn.disabled = true;
    
    log('Simulation reset', 'info');
}

/**
 * Assign target positions to agents using Hungarian algorithm
 */
function assignTargets() {
    log('Assigning targets to agents using Hungarian algorithm...', 'info');
    
    // Only assign if we have enough target positions
    if (targetPositions.length < agents.length) {
        log(`Not enough target positions (${targetPositions.length}) for all agents (${agents.length})`, 'warn');
        return;
    }
    
    // Get agent positions for assignment
    const agentPositions = agents.map(agent => ({ x: agent.x, y: agent.y }));
    
    try {
        // Use Hungarian algorithm for optimal assignment
        const assignments = HungarianAlgorithm.findOptimalAssignment(
            agentPositions, 
            targetPositions, 
            grid
        );
        
        // Assign targets to agents
        assignments.forEach(assignment => {
            const agent = agents[assignment.agent];
            const target = targetPositions[assignment.target];
            
            agent.targetX = target.x;
            agent.targetY = target.y;
            
            log(`Assigned agent ${agent.id} at (${agent.x}, ${agent.y}) to target at (${target.x}, ${target.y})`, 'info');
            
            // Calculate path to target
            calculatePath(agent);
        });
        
        log('Target assignment completed', 'success');
    } catch (error) {
        log(`Error in target assignment: ${error.message}`, 'error');
        console.error(error);
    }
}

/**
 * Calculate path for an agent using A* algorithm
 */
function calculatePath(agent) {
    try {
        // If agent is already at target, no need for path
        if (agent.x === agent.targetX && agent.y === agent.targetY) {
            agent.path = [{ x: agent.x, y: agent.y }];
            log(`Agent ${agent.id} is already at target position`, 'info');
            return;
        }
        
        // Create a copy of the grid for pathfinding
        const gridCopy = [];
        for (let y = 0; y < grid.length; y++) {
            gridCopy.push([...grid[y]]);
        }
        
        // Remove agents from grid copy to avoid blocking paths
        // except for the current agent
        agents.forEach(a => {
            if (a.id !== agent.id) {
                // Only mark agents at their final targets as obstacles
                // or those who haven't started moving yet
                if ((a.x === a.targetX && a.y === a.targetY) || 
                    (!a.path || a.path.length <= 1)) {
                    gridCopy[a.y][a.x] = CELL_WALL;
                } else {
                    gridCopy[a.y][a.x] = CELL_EMPTY;
                }
            }
        });
        
        const astar = new AStar(gridCopy);
        
        const path = astar.findPath(
            { x: agent.x, y: agent.y },
            { x: agent.targetX, y: agent.targetY }
        );
        
        if (path.length > 0) {
            // Make sure the path doesn't contain only the current position
            if (path.length === 1) {
                log(`Warning: Agent ${agent.id} has a 1-step path (only current position)`, 'warn');
                
                // Try a completely cleared path if 1-step path was returned
                return findPathIgnoringAgents(agent);
            }
            
            agent.path = path;
            log(`Path calculated for agent ${agent.id}: ${path.length} steps`, 'info');
            
            // Log path details for debugging
            const pathStr = path.map(p => `(${p.x},${p.y})`).join('→');
            log(`Path details for agent ${agent.id}: ${pathStr}`, 'info');
        } else {
            log(`No path found for agent ${agent.id} to target (${agent.targetX}, ${agent.targetY})`, 'warn');
            
            // Try with completely clear grid
            findPathIgnoringAgents(agent);
        }
    } catch (error) {
        log(`Error calculating path for agent ${agent.id}: ${error.message}`, 'error');
        console.error(error);
    }
}

/**
 * Find a completely clear path ignoring all agents except walls
 */
function findPathIgnoringAgents(agent) {
    try {
        // Create a grid with only walls
        const clearedGrid = [];
        for (let y = 0; y < grid.length; y++) {
            clearedGrid.push([]);
            for (let x = 0; x < grid[y].length; x++) {
                // Only keep walls, clear everything else
                clearedGrid[y][x] = grid[y][x] === CELL_WALL ? CELL_WALL : CELL_EMPTY;
            }
        }
        
        const astar = new AStar(clearedGrid);
        const path = astar.findPath(
            { x: agent.x, y: agent.y },
            { x: agent.targetX, y: agent.targetY }
        );
        
        if (path.length > 1) {
            agent.path = path;
            log(`Found ignoring-agents path for agent ${agent.id}: ${path.length} steps`, 'success');
            
            // Log path details
            const pathStr = path.map(p => `(${p.x},${p.y})`).join('→');
            log(`Clear path details for agent ${agent.id}: ${pathStr}`, 'info');
            
            return true;
        } else {
            // If all else fails, try temporary retreat
            findTemporaryTarget(agent);
            return false;
        }
    } catch (error) {
        log(`Error finding cleared path for agent ${agent.id}: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Find a temporary target for an agent when it can't reach its assigned target
 */
function findTemporaryTarget(agent) {
    // List possible retreat positions (empty cells near the agent)
    const retreatOptions = [];
    
    // Expand search radius for retreat
    const searchRadius = 3;
    
    // Check all cells within searchRadius
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            // Skip current position
            if (dx === 0 && dy === 0) continue;
            
            const nx = agent.x + dx;
            const ny = agent.y + dy;
            
            // Check if position is valid
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                // Check if cell is empty and no other agent is there
                const isEmpty = grid[ny][nx] !== CELL_WALL;
                const isOccupied = agents.some(a => a.id !== agent.id && a.x === nx && a.y === ny);
                
                if (isEmpty && !isOccupied) {
                    // Calculate Manhattan distance to actual target
                    const distToTarget = Math.abs(nx - agent.targetX) + Math.abs(ny - agent.targetY);
                    // Also consider distance from current position to avoid too far retreats
                    const distFromCurrent = Math.abs(nx - agent.x) + Math.abs(ny - agent.y);
                    
                    // Combine both distances with weights
                    const score = distToTarget * 2 + distFromCurrent;
                    
                    retreatOptions.push({ 
                        x: nx, 
                        y: ny, 
                        score: score,
                        distToTarget: distToTarget 
                    });
                }
            }
        }
    }
    
    if (retreatOptions.length > 0) {
        // Sort by score (ascending)
        retreatOptions.sort((a, b) => a.score - b.score);
        
        // Use the best retreat option
        const retreat = retreatOptions[0];
        
        log(`Agent ${agent.id} is retreating to (${retreat.x}, ${retreat.y}), distance to target: ${retreat.distToTarget}`, 'warn');
        
        // Calculate path to retreat position
        const clearedGrid = [];
        for (let y = 0; y < grid.length; y++) {
            clearedGrid.push([]);
            for (let x = 0; x < grid[y].length; x++) {
                clearedGrid[y][x] = grid[y][x] === CELL_WALL ? CELL_WALL : CELL_EMPTY;
            }
        }
        
        const astar = new AStar(clearedGrid);
        const retreatPath = astar.findPath(
            { x: agent.x, y: agent.y },
            { x: retreat.x, y: retreat.y }
        );
        
        if (retreatPath.length > 1) {
            agent.path = retreatPath;
            log(`Retreat path calculated for agent ${agent.id}: ${retreatPath.length} steps`, 'info');
            
            // Mark agent as retreating
            agent.isRetreating = true;
            return true;
        } else {
            log(`Failed to calculate retreat path for agent ${agent.id}`, 'error');
        }
    } else {
        log(`Agent ${agent.id} has no retreat options available`, 'error');
    }
    
    return false;
}

/**
 * Try to resolve deadlock by reassigning targets, including chain movements
 * @returns {boolean} - Whether a reassignment was successful
 */
function tryTargetReassignment() {
    log('Attempting to resolve deadlock by reassigning targets...', 'warn');
    
    // Find agents that haven't reached their targets
    const agentsNotAtTarget = agents.filter(agent => 
        agent.x !== agent.targetX || agent.y !== agent.targetY
    );
    
    // Find agents that have reached their targets
    const agentsAtTarget = agents.filter(agent => 
        agent.x === agent.targetX && agent.y === agent.targetY
    );
    
    // Find empty targets (targets not occupied by any agent)
    const emptyTargets = targetPositions.filter(pos => 
        !agents.some(a => a.x === pos.x && a.y === pos.y)
    );
    
    log(`Found ${emptyTargets.length} empty targets available for reassignment`, 'info');
    
    // PRIORITIZE: First identify agents at targets that are blocking others
    const blockingAgentsAtTargets = [];
    const blockedAgents = new Map(); // Map of blocked agent IDs to the agents blocking them
    
    for (const agent of agentsAtTarget) {
        // Find which agents this agent is blocking
        const agentsBlocked = [];
        
        for (const blockedAgent of agentsNotAtTarget) {
            if (blockedAgent.path && blockedAgent.path.some(pos => 
                pos.x === agent.x && pos.y === agent.y
            )) {
                agentsBlocked.push(blockedAgent);
                // Track which agent is blocking each blocked agent
                blockedAgents.set(blockedAgent.id, agent);
            }
        }
        
        if (agentsBlocked.length > 0) {
            blockingAgentsAtTargets.push({
                agent: agent,
                blocking: agentsBlocked,
                blockCount: agentsBlocked.length // Track how many agents are being blocked
            });
            log(`Agent ${agent.id} at target (${agent.x}, ${agent.y}) is blocking ${agentsBlocked.length} other agents`, 'warn');
        }
    }
    
    // Sort blocking agents by how many others they're blocking (highest first)
    blockingAgentsAtTargets.sort((a, b) => b.blockCount - a.blockCount);
    
    // Log the worst blocker if there is one
    if (blockingAgentsAtTargets.length > 0) {
        const worstBlocker = blockingAgentsAtTargets[0];
        log(`Highest priority blocker: Agent ${worstBlocker.agent.id} is blocking ${worstBlocker.blockCount} agents`, 'warn');
    }
    
    // First strategy: Try to create chains of movements
    // Look for agents at targets that could move to free targets to make space
    if (agentsAtTarget.length > 0 && emptyTargets.length > 0) {
        log(`Looking for chain movements to resolve deadlocks...`, 'info');
        
        // Try all agents at targets, prioritizing those blocking others
        const agentsToTry = [...blockingAgentsAtTargets.map(info => info.agent), 
                             ...agentsAtTarget.filter(a => !blockingAgentsAtTargets.some(info => info.agent.id === a.id))];
        
        for (const agent of agentsToTry) {
            // Try each empty target for this agent
            for (const target of emptyTargets) {
                // Skip if this is already the agent's target
                if (target.x === agent.targetX && target.y === agent.targetY) continue;
                
                // See if this agent can reach this empty target
                const clearedGrid = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid[y][x] = CELL_WALL;
                        } else {
                            // Mark other agents at targets as walls
                            const agentAtPos = agents.find(a => 
                                a.id !== agent.id && a.x === x && a.y === y && 
                                a.x === a.targetX && a.y === a.targetY
                            );
                            clearedGrid[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                        }
                    }
                }
                
                const astar = new AStar(clearedGrid);
                const path = astar.findPath(
                    { x: agent.x, y: agent.y },
                    { x: target.x, y: target.y }
                );
                
                if (path.length > 1) {
                    // Agent can reach this empty target
                    // Now check if this creates a chain that helps a blocked agent
                    
                    // Create a test grid where this agent has moved to the new target
                    const testGrid = [];
                    for (let y = 0; y < grid.length; y++) {
                        testGrid.push([...grid[y]]);
                    }
                    // Clear the agent's current position in the test grid
                    testGrid[agent.y][agent.x] = CELL_EMPTY;
                    
                    // Now check if this helps any blocked agents
                    let helpsBlockedAgent = false;
                    
                    // First, see if any blocking agent could now move to this agent's original target
                    for (const blockingInfo of blockingAgentsAtTargets) {
                        const blockingAgent = blockingInfo.agent;
                        if (blockingAgent.id === agent.id) continue; // Skip the agent we're moving
                        
                        // Can this blocking agent reach the newly vacated target?
                        const blockingAstar = new AStar(testGrid);
                        const blockingPath = blockingAstar.findPath(
                            { x: blockingAgent.x, y: blockingAgent.y },
                            { x: agent.targetX, y: agent.targetY }
                        );
                        
                        if (blockingPath.length > 1) {
                            // This creates a chain! The blocking agent can move to the vacated target
                            
                            // Now test if this would help the agents it was blocking
                            // Clear the blocking agent's current position
                            testGrid[blockingAgent.y][blockingAgent.x] = CELL_EMPTY;
                            
                            for (const blockedAgent of blockingInfo.blocking) {
                                // Can this blocked agent now reach its target?
                                const blockedAstar = new AStar(testGrid);
                                const blockedPath = blockedAstar.findPath(
                                    { x: blockedAgent.x, y: blockedAgent.y },
                                    { x: blockedAgent.targetX, y: blockedAgent.targetY }
                                );
                                
                                if (blockedPath.length > 1) {
                                    helpsBlockedAgent = true;
                                    log(`Found a chain movement: Agent ${agent.id} → empty target (${target.x}, ${target.y}), ` +
                                        `Agent ${blockingAgent.id} → vacated target (${agent.targetX}, ${agent.targetY}), ` +
                                        `helps Agent ${blockedAgent.id} reach its target`, 'success');
                                    break;
                                }
                            }
                            
                            if (helpsBlockedAgent) break;
                        }
                    }
                    
                    // Also check if this directly helps any blocked agent (without a middle step)
                    if (!helpsBlockedAgent) {
                        for (const blockedAgent of agentsNotAtTarget) {
                            // Can this blocked agent now reach its target?
                            const blockedAstar = new AStar(testGrid);
                            const blockedPath = blockedAstar.findPath(
                                { x: blockedAgent.x, y: blockedAgent.y },
                                { x: blockedAgent.targetX, y: blockedAgent.targetY }
                            );
                            
                            if (blockedPath.length > 1) {
                                helpsBlockedAgent = true;
                                log(`Direct chain: Agent ${agent.id} → empty target (${target.x}, ${target.y}) helps ` +
                                    `Agent ${blockedAgent.id} reach its target`, 'success');
                                break;
                            }
                        }
                    }
                    
                    if (helpsBlockedAgent) {
                        // Execute the first step in the chain
                        log(`Executing chain: Moving agent ${agent.id} from (${agent.targetX}, ${agent.targetY}) to target (${target.x}, ${target.y})`, 'success');
                        
                        // Update agent's target and path
                        agent.targetX = target.x;
                        agent.targetY = target.y;
                        agent.path = path;
                        
                        // Remove this target from available targets
                        const targetIndex = emptyTargets.findIndex(t => t.x === target.x && t.y === target.y);
                        if (targetIndex !== -1) {
                            emptyTargets.splice(targetIndex, 1);
                        }
                        
                        // Recalculate paths for all agents
                        agents.forEach(a => {
                            if (a.id !== agent.id) {
                                calculatePath(a);
                            }
                        });
                        
                        return true;
                    }
                }
            }
        }
    }
    
    // Second strategy: Move blocking agents at targets to empty targets (direct approach)
    if (blockingAgentsAtTargets.length > 0 && emptyTargets.length > 0) {
        log(`Attempting direct moves for ${blockingAgentsAtTargets.length} blocking agents to ${emptyTargets.length} empty targets`, 'info');
        
        // For each blocking agent (already sorted by most blocking first)
        for (const blockingInfo of blockingAgentsAtTargets) {
            const agent = blockingInfo.agent;
            
            log(`Trying to move agent ${agent.id} which is blocking ${blockingInfo.blockCount} other agents`, 'info');
            
            // Try each empty target, sorting them by distance to agent for efficiency
            const sortedTargets = [...emptyTargets].sort((a, b) => {
                const distA = Math.abs(agent.x - a.x) + Math.abs(agent.y - a.y);
                const distB = Math.abs(agent.x - b.x) + Math.abs(agent.y - b.y);
                return distA - distB; // Sort by closest first
            });
            
            for (const target of sortedTargets) {
                // Skip if this is already the agent's target
                if (target.x === agent.targetX && target.y === agent.targetY) continue;
                
                // Check if there's a path to this new target
                const clearedGrid = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid[y][x] = CELL_WALL;
                        } else {
                            // Mark other agents at targets as walls
                            const agentAtPos = agents.find(a => 
                                a.id !== agent.id && a.x === x && a.y === y && 
                                a.x === a.targetX && a.y === a.targetY
                            );
                            clearedGrid[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                        }
                    }
                }
                
                const astar = new AStar(clearedGrid);
                const path = astar.findPath(
                    { x: agent.x, y: agent.y },
                    { x: target.x, y: target.y }
                );
                
                if (path.length > 1) {
                    // Found a viable target reassignment
                    log(`Reassigning blocking agent ${agent.id} (blocks ${blockingInfo.blockCount} agents) from target (${agent.targetX}, ${agent.targetY}) to target at (${target.x}, ${target.y})`, 'success');
                    
                    // Update the agent's target
                    agent.targetX = target.x;
                    agent.targetY = target.y;
                    agent.path = path;
                    
                    // Remove this target from empty targets so other agents don't get assigned the same target
                    const targetIndex = emptyTargets.findIndex(t => t.x === target.x && t.y === target.y);
                    if (targetIndex !== -1) {
                        emptyTargets.splice(targetIndex, 1);
                    }
                    
                    // Recalculate paths for blocked agents
                    blockingInfo.blocking.forEach(blockedAgent => {
                        calculatePath(blockedAgent);
                    });
                    
                    return true;
                }
            }
        }
    }
    
    // Third strategy: Try assigning blocked agents to different targets
    for (const blockedAgent of agentsNotAtTarget) {
        // Try each empty target
        for (const target of emptyTargets) {
            // Skip if this is already the agent's target
            if (target.x === blockedAgent.targetX && target.y === blockedAgent.targetY) continue;
            
            const clearedGrid = [];
            for (let y = 0; y < grid.length; y++) {
                clearedGrid.push([]);
                for (let x = 0; x < grid[y].length; x++) {
                    if (grid[y][x] === CELL_WALL) {
                        clearedGrid[y][x] = CELL_WALL;
                    } else {
                        // Mark agents at targets as walls
                        const agentAtPos = agents.find(a => 
                            a.id !== blockedAgent.id && a.x === x && a.y === y && 
                            a.x === a.targetX && a.y === a.targetY
                        );
                        clearedGrid[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                    }
                }
            }
            
            const astar = new AStar(clearedGrid);
            const path = astar.findPath(
                { x: blockedAgent.x, y: blockedAgent.y },
                { x: target.x, y: target.y }
            );
            
            if (path.length > 1) {
                // Found a viable target reassignment
                log(`Reassigning blocked agent ${blockedAgent.id} from target (${blockedAgent.targetX}, ${blockedAgent.targetY}) to target at (${target.x}, ${target.y})`, 'success');
                
                // Update the agent's target
                blockedAgent.targetX = target.x;
                blockedAgent.targetY = target.y;
                blockedAgent.path = path;
                return true;
            }
        }
    }
    
    // Fourth strategy: Try swapping target assignments between agents
    // This is for cases where there are no empty targets
    if (emptyTargets.length === 0) {
        log('No empty targets available, trying to swap target assignments between agents', 'info');
        
        // Try swapping targets between blocked agents and agents at targets
        for (const blockedAgent of agentsNotAtTarget) {
            for (const agentAtTarget of agentsAtTarget) {
                log(`Trying to swap targets between blocked agent ${blockedAgent.id} and agent ${agentAtTarget.id} at target`, 'info');
                
                // Check if the blocked agent can reach the target of the agent at target
                const clearedGrid1 = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid1.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid1[y][x] = CELL_WALL;
                        } else {
                            // Mark other agents at targets as walls (except the one we're swapping with)
                            const agentAtPos = agents.find(a => 
                                a.id !== blockedAgent.id && a.id !== agentAtTarget.id && a.x === x && a.y === y && 
                                a.x === a.targetX && a.y === a.targetY
                            );
                            clearedGrid1[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                        }
                    }
                }
                
                const astar1 = new AStar(clearedGrid1);
                const pathForBlocked = astar1.findPath(
                    { x: blockedAgent.x, y: blockedAgent.y },
                    { x: agentAtTarget.targetX, y: agentAtTarget.targetY }
                );
                
                // Check if the agent at target can reach the blocked agent's target
                const clearedGrid2 = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid2.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid2[y][x] = CELL_WALL;
                        } else {
                            // Mark other agents at targets as walls (except the one we're swapping with)
                            const agentAtPos = agents.find(a => 
                                a.id !== blockedAgent.id && a.id !== agentAtTarget.id && a.x === x && a.y === y && 
                                a.x === a.targetX && a.y === a.targetY
                            );
                            clearedGrid2[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                        }
                    }
                }
                
                const astar2 = new AStar(clearedGrid2);
                const pathForAgentAtTarget = astar2.findPath(
                    { x: agentAtTarget.x, y: agentAtTarget.y },
                    { x: blockedAgent.targetX, y: blockedAgent.targetY }
                );
                
                // If both agents can reach each other's targets, swap them
                if (pathForBlocked.length > 1 && pathForAgentAtTarget.length > 1) {
                    log(`Swapping target assignments: agent ${blockedAgent.id} → (${agentAtTarget.targetX}, ${agentAtTarget.targetY}), agent ${agentAtTarget.id} → (${blockedAgent.targetX}, ${blockedAgent.targetY})`, 'success');
                    
                    // Swap target assignments
                    const tempX = blockedAgent.targetX;
                    const tempY = blockedAgent.targetY;
                    
                    blockedAgent.targetX = agentAtTarget.targetX;
                    blockedAgent.targetY = agentAtTarget.targetY;
                    blockedAgent.path = pathForBlocked;
                    
                    agentAtTarget.targetX = tempX;
                    agentAtTarget.targetY = tempY;
                    agentAtTarget.path = pathForAgentAtTarget;
                    
                    return true;
                }
            }
        }
        
        // Try swapping targets between blocked agents
        for (let i = 0; i < agentsNotAtTarget.length - 1; i++) {
            for (let j = i + 1; j < agentsNotAtTarget.length; j++) {
                const agent1 = agentsNotAtTarget[i];
                const agent2 = agentsNotAtTarget[j];
                
                log(`Trying to swap targets between blocked agents ${agent1.id} and ${agent2.id}`, 'info');
                
                // Check if agent1 can reach agent2's target
                const clearedGrid1 = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid1.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid1[y][x] = CELL_WALL;
                        } else {
                            // Mark agents at targets as walls
                            const agentAtPos = agents.find(a => 
                                a.id !== agent1.id && a.id !== agent2.id && a.x === x && a.y === y && 
                                a.x === a.targetX && a.y === a.targetY
                            );
                            clearedGrid1[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                        }
                    }
                }
                
                const astar1 = new AStar(clearedGrid1);
                const pathForAgent1 = astar1.findPath(
                    { x: agent1.x, y: agent1.y },
                    { x: agent2.targetX, y: agent2.targetY }
                );
                
                // Check if agent2 can reach agent1's target
                const clearedGrid2 = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid2.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid2[y][x] = CELL_WALL;
                        } else {
                            // Mark agents at targets as walls
                            const agentAtPos = agents.find(a => 
                                a.id !== agent1.id && a.id !== agent2.id && a.x === x && a.y === y && 
                                a.x === a.targetX && a.y === a.targetY
                            );
                            clearedGrid2[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                        }
                    }
                }
                
                const astar2 = new AStar(clearedGrid2);
                const pathForAgent2 = astar2.findPath(
                    { x: agent2.x, y: agent2.y },
                    { x: agent1.targetX, y: agent1.targetY }
                );
                
                // If both agents can reach each other's targets, swap them
                if (pathForAgent1.length > 1 && pathForAgent2.length > 1) {
                    log(`Swapping target assignments: agent ${agent1.id} → (${agent2.targetX}, ${agent2.targetY}), agent ${agent2.id} → (${agent1.targetX}, ${agent1.targetY})`, 'success');
                    
                    // Swap target assignments
                    const tempX = agent1.targetX;
                    const tempY = agent1.targetY;
                    
                    agent1.targetX = agent2.targetX;
                    agent1.targetY = agent2.targetY;
                    agent1.path = pathForAgent1;
                    
                    agent2.targetX = tempX;
                    agent2.targetY = tempY;
                    agent2.path = pathForAgent2;
                    
                    return true;
                }
            }
        }
    }
    
    log('Could not find any viable target reassignments', 'error');
    return false;
}

/**
 * Try to swap positions between agents to resolve deadlocks
 * @param {Array} stuckAgents - List of agents that are deadlocked
 * @returns {boolean} - Whether a swap was successful
 */
function tryAgentSwapping(stuckAgents) {
    log('Attempting to swap positions between deadlocked agents', 'warn');
    
    // Try pairwise swaps for deadlocked agents
    for (let i = 0; i < stuckAgents.length - 1; i++) {
        for (let j = i + 1; j < stuckAgents.length; j++) {
            const agent1 = stuckAgents[i];
            const agent2 = stuckAgents[j];
            
            // Only allow swapping of adjacent agents - check if they're neighbors
            const isAdjacent = Math.abs(agent1.x - agent2.x) + Math.abs(agent1.y - agent2.y) === 1;
            
            if (!isAdjacent) {
                continue; // Skip if agents aren't adjacent
            }
            
            // Check if swapping helps them get closer to their targets
            const distA1 = Math.abs(agent1.x - agent1.targetX) + Math.abs(agent1.y - agent1.targetY);
            const distB1 = Math.abs(agent2.x - agent2.targetX) + Math.abs(agent2.y - agent2.targetY);
            
            // Calculate distances if positions are swapped
            const distA2 = Math.abs(agent2.x - agent1.targetX) + Math.abs(agent2.y - agent1.targetY);
            const distB2 = Math.abs(agent1.x - agent2.targetX) + Math.abs(agent1.y - agent2.targetY);
            
            // If swapping reduces total distance
            if (distA2 + distB2 < distA1 + distB1) {
                log(`Swapping adjacent agents ${agent1.id} and ${agent2.id} to resolve deadlock`, 'success');
                
                // Swap positions
                const tempX = agent1.x;
                const tempY = agent1.y;
                
                // Update grid
                grid[agent1.y][agent1.x] = CELL_EMPTY;
                grid[agent2.y][agent2.x] = CELL_EMPTY;
                
                agent1.x = agent2.x;
                agent1.y = agent2.y;
                agent2.x = tempX;
                agent2.y = tempY;
                
                grid[agent1.y][agent1.x] = CELL_AGENT;
                grid[agent2.y][agent2.x] = CELL_AGENT;
                
                // Recalculate paths
                calculatePath(agent1);
                calculatePath(agent2);
                
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Try random moves for stuck agents as a last resort
 * @param {Array} stuckAgents - List of agents that are deadlocked
 * @returns {boolean} - Whether any random move was successful
 */
function tryRandomMoves(stuckAgents) {
    log('Attempting random moves for deadlocked agents as last resort', 'warn');
    
    let madeRandomMove = false;
    
    for (const agent of stuckAgents) {
        // Try random direction
        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 1, dy: 0 },  // Right
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }  // Left
        ];
        
        // Shuffle directions
        directions.sort(() => Math.random() - 0.5);
        
        for (const dir of directions) {
            const nx = agent.x + dir.dx;
            const ny = agent.y + dir.dy;
            
            // Check if position is valid
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                // Check if cell is empty and no other agent is there
                const isEmpty = grid[ny][nx] !== CELL_WALL;
                const isOccupied = agents.some(a => a.id !== agent.id && a.x === nx && a.y === ny);
                
                if (isEmpty && !isOccupied) {
                    log(`Random move for agent ${agent.id} from (${agent.x}, ${agent.y}) to (${nx}, ${ny})`, 'warn');
                    
                    // Update grid
                    grid[agent.y][agent.x] = CELL_EMPTY;
                    agent.x = nx;
                    agent.y = ny;
                    grid[agent.y][agent.x] = CELL_AGENT;
                    
                    // Clear path to force recalculation
                    agent.path = [];
                    calculatePath(agent);
                    
                    madeRandomMove = true;
                    break;
                }
            }
        }
        
        if (madeRandomMove) break;
    }
    
    return madeRandomMove;
}

/**
 * More aggressive version of moving an agent at its target to another position
 * to resolve deadlocks. This will attempt to move the agent to a LEGAL adjacent position.
 * @param {Object} agent - The agent to move
 * @returns {boolean} - Whether the agent was moved successfully 
 */
function moveAgentTemporarilyForced(agent) {
    // Only move agents that are at their targets
    if (agent.x !== agent.targetX || agent.y !== agent.targetY) {
        return false;
    }
    
    log(`Moving agent ${agent.id} from its target at (${agent.x}, ${agent.y})`, 'warn');
    
    // Try an expanded search for temporary positions
    const availablePositions = [];
    
    // Only check ADJACENT positions (up, right, down, left)
    const directions = [
        { dx: 0, dy: -1 }, // Up
        { dx: 1, dy: 0 },  // Right
        { dx: 0, dy: 1 },  // Down
        { dx: -1, dy: 0 }  // Left
    ];
    
    for (const dir of directions) {
        const nx = agent.x + dir.dx;
        const ny = agent.y + dir.dy;
        
        // Check if position is valid
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            // Check if position is empty or not a wall
            if (grid[ny][nx] !== CELL_WALL) {
                // Check if no other agent is there
                const isOccupied = agents.some(a => a.id !== agent.id && a.x === nx && a.y === ny);
                
                if (!isOccupied) {
                    // Calculate Manhattan distance to target
                    const distToTarget = Math.abs(nx - agent.targetX) + Math.abs(ny - agent.targetY);
                    availablePositions.push({ x: nx, y: ny, dist: distToTarget });
                }
            }
        }
    }
    
    if (availablePositions.length > 0) {
        // Sort by distance to target (farthest first, to move agent away from target)
        // This is a change from the previous version, to optimize movement
        availablePositions.sort((a, b) => b.dist - a.dist);
        
        const tempPos = availablePositions[0];
        
        log(`Moving agent ${agent.id} from (${agent.x}, ${agent.y}) to adjacent position (${tempPos.x}, ${tempPos.y})`, 'success');
        
        // Set flag for return to target later
        agent.needsToReturnToTarget = true;
        agent.originalTarget = { x: agent.targetX, y: agent.targetY };
        
        // Move agent
        grid[agent.y][agent.x] = CELL_EMPTY;
        agent.x = tempPos.x;
        agent.y = tempPos.y;
        grid[agent.y][agent.x] = CELL_AGENT;
        
        // Create path to return later
        agent.path = [
            { x: agent.x, y: agent.y },
            { x: agent.originalTarget.x, y: agent.originalTarget.y }
        ];
        
        // Set a cooldown period before returning to target
        agent.targetCooldown = 5; // Wait for 5 steps before trying to return
        
        return true;
    }
    
    return false;
}

/**
 * Try to move all agents at targets that might be blocking others
 * More aggressive than the regular check, used as a last resort
 * @returns {boolean} - Whether any agent was moved
 */
function tryMoveBlockingAgents() {
    log('Attempting to move agents at targets that are blocking others', 'warn');
    
    let anyAgentMoved = false;
    
    // Find all agents at their targets
    const agentsAtTargets = agents.filter(a => a.x === a.targetX && a.y === a.targetY);
    
    // Find all agents not at their targets
    const agentsNotAtTargets = agents.filter(a => a.x !== a.targetX || a.y !== a.targetY);
    
    // Track which agents we've already tried to move
    const triedAgents = new Set();
    
    // Try each blocked agent, looking for agents at targets blocking their path
    for (const blockedAgent of agentsNotAtTargets) {
        // Skip agents that have no path
        if (!blockedAgent.path || blockedAgent.path.length <= 1) continue;
        
        // Get the next step in the blocked agent's path if available
        let nextStep = blockedAgent.path.length > 1 ? blockedAgent.path[1] : null;
        
        // Find agents at targets that are blocking this agent's next step
        const blockingAgents = agentsAtTargets.filter(targetAgent => 
            !triedAgents.has(targetAgent.id) && // Skip agents we've already tried
            (nextStep && targetAgent.x === nextStep.x && targetAgent.y === nextStep.y) || // Blocking next step
            blockedAgent.path.some(pos => pos.x === targetAgent.x && pos.y === targetAgent.y) // Blocking path
        );
        
        if (blockingAgents.length > 0) {
            log(`Agent ${blockedAgent.id} is blocked by ${blockingAgents.length} agents at their targets`, 'info');
            
            // Try moving each blocking agent in turn
            for (const blockingAgent of blockingAgents) {
                triedAgents.add(blockingAgent.id); // Mark as tried
                
                log(`Attempting to move blocking agent ${blockingAgent.id} at target (${blockingAgent.x}, ${blockingAgent.y})`, 'warn');
                
                if (moveAgentTemporarilyForced(blockingAgent)) {
                    // Successfully moved this agent
                    log(`Successfully moved blocking agent ${blockingAgent.id} from its target`, 'success');
                    
                    // Recalculate paths for all agents not at targets
                    agentsNotAtTargets.forEach(agent => calculatePath(agent));
                    anyAgentMoved = true;
                    return true; // Return immediately after successfully moving one agent
                }
            }
        }
    }
    
    // If no agent was moved by the first strategy, try a more aggressive approach
    // Instead of looking at paths, just try moving any agent at a target
    if (!anyAgentMoved) {
        log('First approach failed. Trying to move any agent at target...', 'warn');
        
        // Sort agents at targets by most recently reached
        // This helps to prioritize moving agents that have just reached their targets
        const sortedAgentsAtTargets = [...agentsAtTargets].sort((a, b) => {
            // Agents with higher IDs likely reached targets more recently in many cases
            return b.id - a.id;
        });
        
        // Try each agent at target that we haven't tried yet
        for (const targetAgent of sortedAgentsAtTargets) {
            if (triedAgents.has(targetAgent.id)) continue;
            triedAgents.add(targetAgent.id);
            
            log(`Trying to move agent ${targetAgent.id} from its target at (${targetAgent.x}, ${targetAgent.y})`, 'info');
            
            if (moveAgentTemporarilyForced(targetAgent)) {
                // Recalculate paths for all agents not at targets
                agentsNotAtTargets.forEach(agent => calculatePath(agent));
                anyAgentMoved = true;
                return true;
            }
        }
    }
    
    if (!anyAgentMoved) {
        log('Failed to move any agent from its target to resolve deadlock', 'error');
    }
    
    return anyAgentMoved;
}

/**
 * Find a two-phase path that goes around other agents to reach the target
 * First phase: find a path to an intermediate position away from other agents
 * Second phase: find a path from that position to the target
 * @param {Object} agent - The agent to find a path for
 * @returns {boolean} - Whether a path was found
 */
function findTwoPhasePathThroughAgents(agent) {
    log(`Trying to find a two-phase path for agent ${agent.id} to target (${agent.targetX}, ${agent.targetY})`, 'info');
    
    // First, find all potential intermediate positions
    const potentialIntermediates = [];
    
    // Look for open spaces that are not close to other agents at their targets
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            // Skip walls and positions occupied by agents
            if (grid[y][x] !== CELL_EMPTY) {
                continue;
            }
            
            // Check if position is close to any agent at its target
            const isCloseToAgentAtTarget = agents.some(a => 
                a.id !== agent.id && 
                a.x === a.targetX && a.y === a.targetY && 
                Math.abs(x - a.x) + Math.abs(y - a.y) <= 2
            );
            
            if (!isCloseToAgentAtTarget) {
                // Calculate distances to agent and target
                const distToAgent = Math.abs(x - agent.x) + Math.abs(y - agent.y);
                const distToTarget = Math.abs(x - agent.targetX) + Math.abs(y - agent.targetY);
                
                // Score the intermediate position
                // We want positions that make progress toward the target
                const score = distToAgent + distToTarget * 1.5;
                
                potentialIntermediates.push({ x, y, score });
            }
        }
    }
    
    // Sort intermediates by score (lower is better)
    potentialIntermediates.sort((a, b) => a.score - b.score);
    
    // Try each intermediate position
    for (const intermediate of potentialIntermediates.slice(0, 5)) { // Try top 5 positions
        // Create a grid where agents at targets are marked as walls
        const phaseOneGrid = [];
        for (let y = 0; y < grid.length; y++) {
            phaseOneGrid.push([]);
            for (let x = 0; x < grid[y].length; x++) {
                // Keep walls
                if (grid[y][x] === CELL_WALL) {
                    phaseOneGrid[y][x] = CELL_WALL;
                } 
                // Mark agents at targets as walls
                else {
                    const agentAtPos = agents.find(a => 
                        a.id !== agent.id && a.x === x && a.y === y && 
                        a.x === a.targetX && a.y === a.targetY
                    );
                    phaseOneGrid[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                }
            }
        }
        
        // Phase 1: Find path to intermediate position
        const astar1 = new AStar(phaseOneGrid);
        const pathToIntermediate = astar1.findPath(
            { x: agent.x, y: agent.y },
            { x: intermediate.x, y: intermediate.y }
        );
        
        if (pathToIntermediate.length > 1) {
            // Phase 2: Check if there's a path from intermediate to target
            // Use a clearer grid for this since we're now away from blocking agents
            const phaseTwoGrid = [];
            for (let y = 0; y < grid.length; y++) {
                phaseTwoGrid.push([]);
                for (let x = 0; x < grid[y].length; x++) {
                    // Only keep walls, clear everything else
                    phaseTwoGrid[y][x] = grid[y][x] === CELL_WALL ? CELL_WALL : CELL_EMPTY;
                }
            }
            
            const astar2 = new AStar(phaseTwoGrid);
            const pathToTarget = astar2.findPath(
                { x: intermediate.x, y: intermediate.y },
                { x: agent.targetX, y: agent.targetY }
            );
            
            if (pathToTarget.length > 1) {
                // We found a valid two-phase path!
                log(`Found two-phase path for agent ${agent.id} through intermediate (${intermediate.x}, ${intermediate.y})`, 'success');
                
                // Only use the first phase for now
                agent.path = pathToIntermediate;
                
                // Set the flag to recalculate path when intermediate is reached
                agent.needsRecalculation = true;
                
                return true;
            }
        }
    }
    
    log(`Failed to find two-phase path for agent ${agent.id}`, 'warn');
    return false;
}

/**
 * Perform one step of the simulation
 */
function simulationStep() {
    try {
        let agentsMoved = false;
        
        log('Simulation step started', 'info');
        
        // Update deadlock tracking
        deadlockHandler.updatePositionTracking();
        
        // Check if all agents have reached their targets BEFORE any other processing
        const agentsNotAtTarget = agents.filter(agent => 
            agent.x !== agent.targetX || agent.y !== agent.targetY
        );
        
        if (agentsNotAtTarget.length === 0) {
            log('All agents have reached their targets!', 'success');
            alert('All agents have reached their targets!');
            pauseSimulation();
            startBtn.textContent = 'Start Simulation';
            return;
        }
        
        // Detect deadlocks
        const deadlockedAgents = deadlockHandler.detectDeadlocks();
        
        // Resolve deadlocks if any
        if (deadlockedAgents.length > 0) {
            log(`Detected ${deadlockedAgents.length} deadlocked agents: ${deadlockedAgents.join(', ')}`, 'warn');
            deadlockHandler.resolveDeadlocks(deadlockedAgents);
            deadlocksResolvedDisplay.textContent = deadlockHandler.getDeadlockCount();
        }
        
        // Prioritize agent movements based on distance to target
        const prioritizedAgents = [...agents].sort((a, b) => {
            // Calculate Manhattan distance to target
            const distA = Math.abs(a.x - a.targetX) + Math.abs(a.y - a.targetY);
            const distB = Math.abs(b.x - b.targetX) + Math.abs(b.y - b.targetY);
            
            // First prioritize agents not at their targets
            const aAtTarget = a.x === a.targetX && a.y === a.targetY;
            const bAtTarget = b.x === b.targetX && b.y === b.targetY;
            
            if (aAtTarget && !bAtTarget) return 1;
            if (!aAtTarget && bAtTarget) return -1;
            
            // Then sort by distance to target (ascending)
            return distA - distB;
        });
        
        // Move each agent one step along its path
        let agentsMovedCount = 0;
        for (const agent of prioritizedAgents) {
            // Skip if agent is already at target
            if (agent.x === agent.targetX && agent.y === agent.targetY) {
                // Clear any remaining path for agents at targets to prevent accidental movement
                agent.path = [{ x: agent.x, y: agent.y }];
                continue;
            }
            
            // In sequential mode, only move one agent per step
            if (sequentialMovementMode && agentsMovedCount > 0) {
                break;
            }
            
            // Reset retreating flag if agent has reached its temporary position
            if (agent.isRetreating && (!agent.path || agent.path.length <= 1)) {
                agent.isRetreating = false;
                log(`Agent ${agent.id} has finished retreating, recalculating path to original target`, 'info');
            }
            
            // Skip if agent has no path or has reached path end
            if (!agent.path || agent.path.length <= 1) {
                // Recalculate path if agent has a target but no path
                if (agent.targetX !== null && agent.targetY !== null) {
                    log(`Recalculating path for agent ${agent.id}`, 'info');
                    calculatePath(agent);
                }
                continue;
            }
            
            // Get next step in path
            const nextStep = agent.path[1];
            
            // Check if next step is unoccupied by other agents
            const occupyingAgent = agents.find(a => 
                a.id !== agent.id && a.x === nextStep.x && a.y === nextStep.y
            );
            
            if (!occupyingAgent) {
                // Update grid - remove agent from current position
                grid[agent.y][agent.x] = CELL_EMPTY;
                
                // Log the move
                if (sequentialMovementMode) {
                    log(`[Sequential Mode] Moving agent ${agent.id} from (${agent.x}, ${agent.y}) to (${nextStep.x}, ${nextStep.y})`, 'info');
                    sequentialMovesRemaining--;
                    
                    // Check if we should exit sequential mode
                    if (sequentialMovesRemaining <= 0) {
                        log(`Sequential movement complete, returning to normal movement mode`, 'success');
                        sequentialMovementMode = false;
                    }
                } else {
                    log(`Moving agent ${agent.id} from (${agent.x}, ${agent.y}) to (${nextStep.x}, ${nextStep.y})`, 'info');
                }
                
                // Move agent to next position
                agent.x = nextStep.x;
                agent.y = nextStep.y;
                
                // Update grid - add agent to new position
                grid[agent.y][agent.x] = CELL_AGENT;
                
                // Remove first step from path
                agent.path.shift();
                
                agentsMoved = true;
                agentsMovedCount++;
                totalMoves++;
                
                // If agent has now reached its target, clear its path to prevent further movement
                if (agent.x === agent.targetX && agent.y === agent.targetY) {
                    log(`Agent ${agent.id} has reached its target at (${agent.x}, ${agent.y})`, 'success');
                    agent.path = [{ x: agent.x, y: agent.y }];
                }
            } else {
                log(`Agent ${agent.id} is waiting: next step (${nextStep.x}, ${nextStep.y}) is occupied by agent ${occupyingAgent.id}`, 'info');
                
                // If the blocking agent is at its target, recalculate path
                if (occupyingAgent.x === occupyingAgent.targetX && 
                    occupyingAgent.y === occupyingAgent.targetY) {
                    
                    log(`Agent ${agent.id} is blocked by agent ${occupyingAgent.id} at its target, recalculating path`, 'warn');
                    calculatePath(agent);
                }
                // If agent has been waiting too long, recalculate
                else if (deadlockHandler.waitingTime.get(agent.id) > 2) {
                    log(`Agent ${agent.id} has been waiting too long, recalculating path`, 'warn');
                    calculatePath(agent);
                }
            }
        }
        
        // Update UI
        renderGrid();
        totalMovesDisplay.textContent = totalMoves;
        updateCountDisplays();
        
        // Check again if all agents have reached their targets (after movements)
        const agentsAtTarget = agents.filter(agent => 
            agent.x === agent.targetX && agent.y === agent.targetY
        ).length;
        
        log(`${agentsAtTarget} out of ${agents.length} agents are at their targets`, 'info');
        
        // Second check for all agents reaching targets
        if (agentsAtTarget === agents.length) {
            log('All agents have reached their targets! Stopping simulation.', 'success');
            alert('All agents have reached their targets!');
            pauseSimulation();
            startBtn.textContent = 'Start Simulation';
            return;
        }
        
        // Check for agents with no valid moves
        const agentsWithNoMoves = agents.filter(agent => 
            (agent.x !== agent.targetX || agent.y !== agent.targetY) && // Not at target
            (!agent.path || agent.path.length <= 1) // No valid path
        ).length;
        
        if (agentsWithNoMoves > 0) {
            log(`${agentsWithNoMoves} agents have no valid moves`, 'warn');
        }
        
        // Stop simulation if no more movement
        if (!agentsMoved) {
            log('No agents moved in this step', 'warn');
            
            // Increment the failed resolution counter
            failedDeadlockResolutionAttempts++;
            log(`Deadlock resolution attempt #${failedDeadlockResolutionAttempts}`, 'warn');
            
            // If we've reached 5 failed attempts, pause and restart the simulation
            if (failedDeadlockResolutionAttempts >= 5) {
                log(`5 failed deadlock resolution attempts - automatically restarting simulation`, 'warn');
                
                // Pause the simulation
                pauseSimulation();
                
                // Reset the failed resolution counter
                failedDeadlockResolutionAttempts = 0;
                
                // Wait a moment then restart (using setTimeout to allow the UI to update)
                setTimeout(() => {
                    log(`Automatically restarting simulation with fresh target assignments`, 'info');
                    
                    // Enable sequential movement mode
                    sequentialMovementMode = true;
                    sequentialMovesRemaining = agents.length;
                    log(`Enabling sequential movement mode: Agents will move one at a time for ${sequentialMovesRemaining} steps`, 'info');
                    
                    startSimulation();
                }, 500);
                
                return; // Exit this simulation step
            }
            
            // Try complete target reassignment first
            log('Attempting complete target reassignment as first strategy', 'warn');
            if (tryTargetReassignment()) {
                return; // Continue simulation if successful
            }
            
            // If that fails, try moving blocking agents
            log('Target reassignment failed, trying to move blocking agents', 'info');
            if (tryMoveBlockingAgents()) {
                return; // Continue simulation if successful
            }
            
            // If some agents have no valid moves and the deadlock resolution failed,
            // try stronger intervention
            if (agentsWithNoMoves > 0) {
                log('Attempting stronger intervention for agents with no moves', 'warn');
                
                // Find agents stuck without paths
                const stuckAgents = agents.filter(agent => 
                    (agent.x !== agent.targetX || agent.y !== agent.targetY) && // Not at target
                    (!agent.path || agent.path.length <= 1) // No valid path
                );
                
                let interventionSuccessful = false;
                
                // Try to move agents at targets temporarily if they're blocking others
                if (!interventionSuccessful) {
                    for (const stuckAgent of stuckAgents) {
                        // Find any agent at its target that might be blocking
                        const blockingAgents = agents.filter(a => 
                            a.x === a.targetX && 
                            a.y === a.targetY &&
                            Math.abs(a.x - stuckAgent.targetX) + Math.abs(a.y - stuckAgent.targetY) <= 2
                        );
                        
                        for (const blockingAgent of blockingAgents) {
                            // Attempt a more aggressive temporary move
                            if (moveAgentTemporarilyForced(blockingAgent)) {
                                calculatePath(stuckAgent);
                                interventionSuccessful = true;
                                break;
                            }
                        }
                        
                        if (interventionSuccessful) break;
                    }
                }
                
                // Swap positions between agents if possible
                if (!interventionSuccessful && stuckAgents.length >= 2) {
                    interventionSuccessful = tryAgentSwapping(stuckAgents);
                }
                
                // If swapping didn't work, try completely cleared paths
                if (!interventionSuccessful) {
                    for (const agent of stuckAgents) {
                        if (findTwoPhasePathThroughAgents(agent) || findPathIgnoringAgents(agent)) {
                            interventionSuccessful = true;
                        }
                    }
                }
                
                // If we found new paths, continue simulation
                if (interventionSuccessful) {
                    return;
                }
                
                // If we still can't find paths, try random moves
                if (!interventionSuccessful) {
                    interventionSuccessful = tryRandomMoves(stuckAgents);
                    if (interventionSuccessful) return;
                }
                
                // Try to reassign targets as a last resort
                if (!interventionSuccessful) {
                    interventionSuccessful = tryTargetReassignment();
                    if (interventionSuccessful) return;
                }
                
                // If all intervention attempts failed
                log('Unable to find paths for stuck agents, stopping simulation', 'error');
                alert('Simulation stopped: Some agents cannot reach their targets');
            } else {
                log('Simulation stopped: No more possible moves', 'warn');
                
                // Try target reassignment before giving up
                if (tryTargetReassignment()) {
                    return;
                }
                
                alert('Simulation stopped: No more possible moves');
            }
            
            pauseSimulation();
            startBtn.textContent = 'Start Simulation';
        }
    } catch (error) {
        log(`Error in simulation step: ${error.message}`, 'error');
        console.error(error);
        pauseSimulation();
    }
}

// Initialize grid on page load
window.addEventListener('load', () => {
     log('Programmable Matter Simulation loaded', 'info');
     changeInteractionMode(); // Set initial mode display
     initializeGrid();
});