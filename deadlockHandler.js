/**
 * DeadlockHandler class to detect and resolve deadlocks in the simulation
 */
class DeadlockHandler {
    constructor(grid, agents) {
        this.grid = grid;
        this.agents = agents;
        this.deadlockCount = 0;
        this.waitingTime = new Map(); // Map to track how long agents wait in the same position
        this.previousPositions = new Map(); // Map to track previous positions
        this.waitingThreshold = 3; // Number of consecutive turns without movement to consider a deadlock
    }

    /**
     * Update the tracking of agent positions to detect deadlocks
     */
    updatePositionTracking() {
        // Store current positions for comparison in next update
        this.agents.forEach(agent => {
            const posKey = `${agent.x},${agent.y}`;
            const prevPosKey = this.previousPositions.get(agent.id);
            
            // Check if agent hasn't moved from previous position
            if (prevPosKey === posKey) {
                // Increment waiting time for this agent
                this.waitingTime.set(agent.id, (this.waitingTime.get(agent.id) || 0) + 1);
            } else {
                // Reset waiting time if agent moved
                this.waitingTime.set(agent.id, 0);
            }
            
            // Update previous position
            this.previousPositions.set(agent.id, posKey);
        });
    }

    /**
     * Detect if there are any deadlocks in the current state
     * @returns {Array} - Array of deadlocked agent IDs
     */
    detectDeadlocks() {
        const deadlockedAgents = [];
        
        // Check for agents that haven't moved for several turns
        this.waitingTime.forEach((waitTime, agentId) => {
            if (waitTime >= this.waitingThreshold) {
                deadlockedAgents.push(agentId);
            }
        });
        
        // Also check for circular deadlocks (agents waiting for each other)
        this.detectCircularDeadlocks(deadlockedAgents);
        
        return deadlockedAgents;
    }
    
    /**
     * Detect circular deadlocks where agents are waiting for each other
     * @param {Array} deadlockedAgents - Array to append deadlocked agent IDs
     */
    detectCircularDeadlocks(deadlockedAgents) {
        const agentWaitingFor = new Map();
        
        // Build map of which agent is waiting for which position
        this.agents.forEach(agent => {
            if (!agent.path || agent.path.length <= 1) return;
            
            const nextStep = agent.path[1]; // Next position in path
            
            // Check if any other agent is on this position
            this.agents.forEach(otherAgent => {
                if (agent.id !== otherAgent.id && 
                    otherAgent.x === nextStep.x && 
                    otherAgent.y === nextStep.y) {
                    agentWaitingFor.set(agent.id, otherAgent.id);
                }
            });
        });
        
        // Detect cycles in the waiting graph
        agentWaitingFor.forEach((waitingForId, agentId) => {
            let current = waitingForId;
            const visited = new Set([agentId]);
            
            while (agentWaitingFor.has(current)) {
                if (visited.has(current)) {
                    // Cycle detected - add all agents in the cycle to deadlocked list
                    visited.forEach(id => {
                        if (!deadlockedAgents.includes(id)) {
                            deadlockedAgents.push(id);
                        }
                    });
                    
                    // Log the deadlock cycle
                    console.log(`Deadlock cycle detected: ${Array.from(visited).join(' → ')} → ${current}`);
                    break;
                }
                
                visited.add(current);
                current = agentWaitingFor.get(current);
            }
        });
    }
    
    /**
     * Resolve deadlocks by finding alternative paths or temporarily moving agents
     * @param {Array} deadlockedAgentIds - IDs of deadlocked agents
     */
    resolveDeadlocks(deadlockedAgentIds) {
        if (deadlockedAgentIds.length === 0) return;
        
        this.deadlockCount += 1;
        
        // Sort by agent ID to process in a consistent order
        deadlockedAgentIds.sort();
        
        // For each deadlocked agent
        deadlockedAgentIds.forEach(agentId => {
            const agent = this.agents.find(a => a.id === agentId);
            if (!agent) return;
            
            // Try finding an alternative path
            if (this.findAlternativePath(agent)) {
                console.log(`Found alternative path for deadlocked agent ${agent.id}`);
            } 
            // If still has no valid path, try temporary retreat
            else if (this.temporaryRetreat(agent)) {
                console.log(`Created temporary retreat for deadlocked agent ${agent.id}`);
            }
            // If both approaches fail, try clearing path of other agents
            else {
                console.log(`Attempting drastic measures for deadlocked agent ${agent.id}`);
                this.createClearedPathForAgent(agent);
            }
        });
    }
    
    /**
     * Find an alternative path for a deadlocked agent
     * @param {Object} agent - The deadlocked agent
     * @returns {boolean} - True if a new path was found
     */
    findAlternativePath(agent) {
        // Create a modified grid with slight penalties for cells near other agents
        const modifiedGrid = this.createModifiedGrid();
        
        // Use A* with the modified grid
        const astar = new AStar(modifiedGrid);
        
        // Find new path to target
        const newPath = astar.findPath(
            { x: agent.x, y: agent.y }, 
            { x: agent.targetX, y: agent.targetY }
        );
        
        if (newPath.length > 1) {
            agent.path = newPath;
            return true;
        }
        
        return false;
    }
    
    /**
     * Create a modified grid with penalties around other agents
     * @returns {Array} - 2D grid with added penalties
     */
    createModifiedGrid() {
        const rows = this.grid.length;
        const cols = this.grid[0].length;
        const modifiedGrid = [];
        
        // Copy original grid
        for (let y = 0; y < rows; y++) {
            modifiedGrid.push([...this.grid[y]]);
        }
        
        // Add small penalties (not walls) around other agents
        this.agents.forEach(agent => {
            // Mark agent's current position
            modifiedGrid[agent.y][agent.x] = 1;
            
            // Also mark positions of agents at their final targets as walls
            // to prevent other agents from planning paths through them
            if (agent.x === agent.targetX && agent.y === agent.targetY) {
                modifiedGrid[agent.y][agent.x] = 1;
            }
        });
        
        return modifiedGrid;
    }
    
    /**
     * Force agent to temporarily retreat to an unoccupied cell
     * @param {Object} agent - The deadlocked agent
     * @returns {boolean} - True if retreat was successful
     */
    temporaryRetreat(agent) {
        const rows = this.grid.length;
        const cols = this.grid[0].length;
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];
        
        // Find all possible retreat directions (sorted by distance to target)
        const retreatOptions = [];
        
        for (const dir of directions) {
            const nx = agent.x + dir.x;
            const ny = agent.y + dir.y;
            
            // Check if valid move
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && this.grid[ny][nx] !== 1) {
                // Check if no other agent is here
                const occupied = this.agents.some(a => 
                    a.id !== agent.id && a.x === nx && a.y === ny
                );
                
                if (!occupied) {
                    // Calculate Manhattan distance to target
                    const distToTarget = Math.abs(nx - agent.targetX) + Math.abs(ny - agent.targetY);
                    retreatOptions.push({ x: nx, y: ny, dist: distToTarget });
                }
            }
        }
        
        // Sort retreat options by distance to target (ascending)
        retreatOptions.sort((a, b) => a.dist - b.dist);
        
        if (retreatOptions.length > 0) {
            // Use the best retreat option (closest to target)
            const retreat = retreatOptions[0];
            
            // Set new temporary path to this cell
            agent.path = [
                { x: agent.x, y: agent.y },
                { x: retreat.x, y: retreat.y }
            ];
            
            // Mark agent as retreating
            agent.isRetreating = true;
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Create a completely cleared path for a deadlocked agent
     * This is a last resort measure when all else fails
     * @param {Object} agent - The deadlocked agent
     * @returns {boolean} - True if a path was found
     */
    createClearedPathForAgent(agent) {
        // Create a grid with only walls, ignoring all agents
        const clearedGrid = [];
        for (let y = 0; y < this.grid.length; y++) {
            clearedGrid.push([]);
            for (let x = 0; x < this.grid[y].length; x++) {
                // Only keep walls, clear everything else
                clearedGrid[y][x] = this.grid[y][x] === 1 ? 1 : 0;
            }
        }
        
        // Find a path ignoring all other agents
        const astar = new AStar(clearedGrid);
        const path = astar.findPath(
            { x: agent.x, y: agent.y },
            { x: agent.targetX, y: agent.targetY }
        );
        
        if (path.length > 1) {
            agent.path = path;
            console.log(`Created cleared path for agent ${agent.id}, length: ${path.length}`);
            return true;
        }
        
        console.log(`Failed to create cleared path for agent ${agent.id}`);
        return false;
    }
    
    /**
     * Get count of resolved deadlocks
     * @returns {number} - The count of resolved deadlocks
     */
    getDeadlockCount() {
        return this.deadlockCount;
    }
} 