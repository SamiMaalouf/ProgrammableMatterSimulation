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
 * Try to resolve deadlock by reassigning targets
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
    
    // Find empty targets (targets not assigned to any agent)
    const emptyTargets = [];
    
    // Consider all possible target reassignments
    for (const agent of agentsAtTarget) {
        // First try to move a blocking agent to another target
        const otherTargets = targetPositions.filter(pos => 
            !(pos.x === agent.x && pos.y === agent.y) && // Not this agent's current target
            !agents.some(a => a.x === pos.x && a.y === pos.y) // Not occupied by another agent
        );
        
        if (otherTargets.length > 0) {
            // Try each other target to see if it improves the situation
            for (const target of otherTargets) {
                // Check if the new target position is reachable
                const clearedGrid = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        // Only keep walls and other agents at targets
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid[y][x] = CELL_WALL;
                        } else {
                            // Mark as empty unless it's another agent at target
                            const agentAtPos = agents.find(a => 
                                a.id !== agent.id && a.x === x && a.y === y && 
                                a.x === a.targetX && a.y === a.targetY
                            );
                            clearedGrid[y][x] = agentAtPos ? CELL_WALL : CELL_EMPTY;
                        }
                    }
                }
                
                // Check if this target is reachable for the agent
                const astar = new AStar(clearedGrid);
                const path = astar.findPath(
                    { x: agent.x, y: agent.y },
                    { x: target.x, y: target.y }
                );
                
                if (path.length > 1) {
                    // This target is reachable, reassign it
                    log(`Reassigning agent ${agent.id} from target (${agent.targetX}, ${agent.targetY}) to target (${target.x}, ${target.y})`, 'success');
                    
                    // Update agent's target
                    agent.targetX = target.x;
                    agent.targetY = target.y;
                    agent.path = path;
                    
                    // Now check if other agents can find paths to their targets
                    for (const blockedAgent of agentsNotAtTarget) {
                        calculatePath(blockedAgent);
                    }
                    
                    return true;
                }
            }
        }
    }
    
    // If moving agents at targets doesn't work, try reassigning a blocked agent to another target
    for (const blockedAgent of agentsNotAtTarget) {
        const otherTargets = targetPositions.filter(pos => 
            !(pos.x === blockedAgent.targetX && pos.y === blockedAgent.targetY) && // Not this agent's current target
            !agents.some(a => a.x === pos.x && a.y === pos.y) // Not occupied by another agent
        );
        
        if (otherTargets.length > 0) {
            // Find the closest alternative target
            otherTargets.sort((a, b) => {
                const distA = Math.abs(blockedAgent.x - a.x) + Math.abs(blockedAgent.y - a.y);
                const distB = Math.abs(blockedAgent.x - b.x) + Math.abs(blockedAgent.y - b.y);
                return distA - distB;
            });
            
            // Try to find a path to the closest alternative target
            for (const target of otherTargets) {
                const clearedGrid = [];
                for (let y = 0; y < grid.length; y++) {
                    clearedGrid.push([]);
                    for (let x = 0; x < grid[y].length; x++) {
                        // Only keep walls and agents at targets
                        if (grid[y][x] === CELL_WALL) {
                            clearedGrid[y][x] = CELL_WALL;
                        } else {
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
                    // This target is reachable, reassign it
                    log(`Reassigning blocked agent ${blockedAgent.id} from target (${blockedAgent.targetX}, ${blockedAgent.targetY}) to target (${target.x}, ${target.y})`, 'success');
                    
                    // Update agent's target
                    blockedAgent.targetX = target.x;
                    blockedAgent.targetY = target.y;
                    blockedAgent.path = path;
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
            
            // Check if swapping helps them get closer to their targets
            const distA1 = Math.abs(agent1.x - agent1.targetX) + Math.abs(agent1.y - agent1.targetY);
            const distB1 = Math.abs(agent2.x - agent2.targetX) + Math.abs(agent2.y - agent2.targetY);
            
            // Calculate distances if positions are swapped
            const distA2 = Math.abs(agent2.x - agent1.targetX) + Math.abs(agent2.y - agent1.targetY);
            const distB2 = Math.abs(agent1.x - agent2.targetX) + Math.abs(agent1.y - agent2.targetY);
            
            // If swapping reduces total distance
            if (distA2 + distB2 < distA1 + distB1) {
                log(`Swapping agents ${agent1.id} and ${agent2.id} to resolve deadlock`, 'success');
                
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
    
    // Check if any agent at target is blocking a path for agents not at targets
    for (const targetAgent of agentsAtTargets) {
        // Check if this agent's position is in the path of any agent not at target
        const isBlocking = agentsNotAtTargets.some(a => 
            a.path && a.path.length > 1 && 
            a.path.some(pos => pos.x === targetAgent.x && pos.y === targetAgent.y)
        );
        
        if (isBlocking) {
            log(`Agent ${targetAgent.id} at target (${targetAgent.x}, ${targetAgent.y}) is blocking other agents' paths`, 'warn');
            
            // Try to move this agent temporarily
            if (moveAgentTemporarilyForced(targetAgent)) {
                // Recalculate paths for all agents not at targets
                agentsNotAtTargets.forEach(agent => calculatePath(agent));
                anyAgentMoved = true;
            }
        }
    }
    
    return anyAgentMoved;
}

/**
 * More aggressive version of moving an agent at its target to another position
 * to resolve deadlocks. This will attempt to move the agent further away if needed.
 * @param {Object} agent - The agent to move
 * @returns {boolean} - Whether the agent was moved successfully
 */
function moveAgentTemporarilyForced(agent) {
    // Only move agents that are at their targets
    if (agent.x !== agent.targetX || agent.y !== agent.targetY) {
        return false;
    }
    
    log(`Forcefully moving agent ${agent.id} from its target at (${agent.x}, ${agent.y})`, 'warn');
    
    // Try an expanded search for temporary positions
    const availablePositions = [];
    
    // Check all positions within radius 3
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            // Skip current position
            if (dx === 0 && dy === 0) {
                continue;
            }
            
            const nx = agent.x + dx;
            const ny = agent.y + dy;
            
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
    }
    
    if (availablePositions.length > 0) {
        // Sort by distance to target (closest first)
        availablePositions.sort((a, b) => a.dist - b.dist);
        
        const tempPos = availablePositions[0];
        
        log(`Force-moving agent ${agent.id} from (${agent.x}, ${agent.y}) to (${tempPos.x}, ${tempPos.y})`, 'success');
        
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
        
        return true;
    }
    
    return false;
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
        for (const agent of prioritizedAgents) {
            // Skip if agent is already at target
            if (agent.x === agent.targetX && agent.y === agent.targetY) {
                continue;
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
                log(`Moving agent ${agent.id} from (${agent.x}, ${agent.y}) to (${nextStep.x}, ${nextStep.y})`, 'info');
                
                // Move agent to next position
                agent.x = nextStep.x;
                agent.y = nextStep.y;
                
                // Update grid - add agent to new position
                grid[agent.y][agent.x] = CELL_AGENT;
                
                // Remove first step from path
                agent.path.shift();
                
                agentsMoved = true;
                totalMoves++;
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
        
        // Count how many agents have reached their target
        const agentsAtTarget = agents.filter(agent => 
            agent.x === agent.targetX && agent.y === agent.targetY
        ).length;
        
        log(`${agentsAtTarget} out of ${agents.length} agents are at their targets`, 'info');
        
        // Check if all agents reached their targets
        const allReachedTargets = agentsAtTarget === agents.length;
        
        if (allReachedTargets) {
            log('All agents have reached their targets!', 'success');
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
            
            // Try one last attempt to move agents at targets that might be blocking others
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