/**
 * Minimax Algorithm for pathfinding
 * Adapts the adversarial search algorithm to pathfinding context
 * - Agent tries to maximize utility (getting closer to target)
 * - Obstacles/other agents are treated as adversaries
 */
class Minimax {
    /**
     * Initialize Minimax pathfinder
     * @param {Array} grid - The grid representation
     * @param {string} topology - The movement topology (vonNeumann or moore)
     */
    constructor(grid, topology) {
        this.grid = grid;
        this.topology = topology;
        this.maxDepth = 5; // Max search depth for Minimax
        this.CELL_WALL = 1; // Wall cell type
    }

    /**
     * Find a path from start to goal
     * @param {Object} start - Start position {x, y}
     * @param {Object} goal - Goal position {x, y}
     * @returns {Array} - Array of positions from start to goal
     */
    findPath(start, goal) {
        // If start or goal is a wall, return empty path
        if (this.isWall(start.x, start.y) || this.isWall(goal.x, goal.y)) {
            return [];
        }
        
        // If start and goal are the same, return only that position
        if (start.x === goal.x && start.y === start.y) {
            return [{ x: start.x, y: start.y }];
        }
        
        this.goal = goal;
        this.visited = new Set(); // Track visited nodes
        this.cameFrom = new Map(); // Track path
        
        // Start the Minimax search
        const bestMove = this.minimaxDecision(start, this.maxDepth);
        
        // If no path found, return just the start position
        if (!bestMove) {
            return [{ x: start.x, y: start.y }];
        }
        
        // Build path from start to goal using best moves
        const path = [{ x: start.x, y: start.y }];
        let current = { x: start.x, y: start.y };
        
        while (!(current.x === goal.x && current.y === goal.y)) {
            // Get next move from best moves found during search
            const nextKey = `${current.x},${current.y}`;
            if (!this.cameFrom.has(nextKey)) {
                break; // No path found
            }
            
            current = this.cameFrom.get(nextKey);
            path.push({ x: current.x, y: current.y });
            
            // Safety check for infinite loops
            if (path.length > 1000) {
                console.error("Path search exceeded 1000 steps, likely stuck in a loop");
                break;
            }
            
            // If we've found the goal, finish
            if (current.x === goal.x && current.y === goal.y) {
                break;
            }
        }
        
        // If path doesn't end at goal, try to complete with A* or return partial path
        if (path.length > 0 && !(path[path.length-1].x === goal.x && path[path.length-1].y === goal.y)) {
            // Use A* to complete the path if possible
            // This is a fallback to ensure we always try to reach the goal
            const astar = new AStar(this.grid, this.topology);
            const restOfPath = astar.findPath(path[path.length-1], goal);
            
            // Remove first position from restOfPath as it's already in path
            if (restOfPath.length > 1) {
                restOfPath.shift();
                path.push(...restOfPath);
            }
        }
        
        return path;
    }
    
    /**
     * Main Minimax decision function to find the best move
     * @param {Object} state - Current state/position {x, y}
     * @param {number} depth - Search depth
     * @returns {Object} - Best next move
     */
    minimaxDecision(state, depth) {
        let bestValue = -Infinity;
        let bestMove = null;
        
        // Get all possible moves from current state
        const moves = this.getNeighbors(state);
        
        // Evaluate each move with minimax
        for (const move of moves) {
            // Get node key
            const nodeKey = `${move.x},${move.y}`;
            if (this.visited.has(nodeKey)) continue;
            
            // Mark as visited
            this.visited.add(nodeKey);
            
            // Calculate value using minimax
            const value = this.minValue(move, depth - 1, -Infinity, Infinity);
            
            // Unmark as visited for other paths
            this.visited.delete(nodeKey);
            
            // Update best move if this has higher value
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
                
                // Save this move for path reconstruction
                this.cameFrom.set(`${state.x},${state.y}`, move);
            }
        }
        
        return bestMove;
    }
    
    /**
     * MAX step in Minimax (agent's turn)
     * @param {Object} state - Current state/position
     * @param {number} depth - Remaining search depth
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @returns {number} - Utility value
     */
    maxValue(state, depth, alpha, beta) {
        // Terminal test
        if (this.isTerminal(state) || depth <= 0) {
            return this.evaluate(state);
        }
        
        let value = -Infinity;
        const moves = this.getNeighbors(state);
        
        for (const move of moves) {
            // Get node key
            const nodeKey = `${move.x},${move.y}`;
            if (this.visited.has(nodeKey)) continue;
            
            // Mark as visited
            this.visited.add(nodeKey);
            
            // Calculate value of MIN's best response
            value = Math.max(value, this.minValue(move, depth - 1, alpha, beta));
            
            // Unmark as visited for other paths
            this.visited.delete(nodeKey);
            
            // Alpha-beta pruning
            if (value >= beta) return value;
            alpha = Math.max(alpha, value);
            
            // Save this move for path reconstruction if it's the best
            if (value > alpha) {
                this.cameFrom.set(`${state.x},${state.y}`, move);
            }
        }
        
        return value;
    }
    
    /**
     * MIN step in Minimax (adversary's turn)
     * @param {Object} state - Current state/position
     * @param {number} depth - Remaining search depth
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @returns {number} - Utility value
     */
    minValue(state, depth, alpha, beta) {
        // Terminal test
        if (this.isTerminal(state) || depth <= 0) {
            return this.evaluate(state);
        }
        
        let value = Infinity;
        const moves = this.getNeighbors(state);
        
        for (const move of moves) {
            // Get node key
            const nodeKey = `${move.x},${move.y}`;
            if (this.visited.has(nodeKey)) continue;
            
            // Mark as visited
            this.visited.add(nodeKey);
            
            // Calculate value of MAX's best response
            value = Math.min(value, this.maxValue(move, depth - 1, alpha, beta));
            
            // Unmark as visited for other paths
            this.visited.delete(nodeKey);
            
            // Alpha-beta pruning
            if (value <= alpha) return value;
            beta = Math.min(beta, value);
        }
        
        return value;
    }
    
    /**
     * Check if a state is terminal (reached the goal)
     * @param {Object} state - Current state/position
     * @returns {boolean} - True if terminal state
     */
    isTerminal(state) {
        return state.x === this.goal.x && state.y === this.goal.y;
    }
    
    /**
     * Evaluate the utility of a state
     * @param {Object} state - Current state/position
     * @returns {number} - Utility value (higher is better)
     */
    evaluate(state) {
        // If we've reached the goal, high positive value
        if (state.x === this.goal.x && state.y === this.goal.y) {
            return 1000;
        }
        
        // Calculate Manhattan distance to goal
        const distance = Math.abs(state.x - this.goal.x) + Math.abs(state.y - this.goal.y);
        
        // Utility is inversely proportional to distance (closer = higher utility)
        return 100 - distance;
    }
    
    /**
     * Get valid neighboring positions
     * @param {Object} node - Current position {x, y}
     * @returns {Array} - Array of valid neighboring positions
     */
    getNeighbors(node) {
        return getNeighbors(node.x, node.y, this.topology, this.grid.length)
            .filter(neighbor => !this.isWall(neighbor.x, neighbor.y));
    }
    
    /**
     * Check if a position is a wall
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if position is a wall
     */
    isWall(x, y) {
        // Check if position is within grid bounds
        if (x < 0 || x >= this.grid[0].length || y < 0 || y >= this.grid.length) {
            return true;
        }
        
        // Check if position is a wall
        return this.grid[y][x] === this.CELL_WALL;
    }
} 