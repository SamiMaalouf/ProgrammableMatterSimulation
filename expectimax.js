/**
 * Expectimax Algorithm for pathfinding
 * Similar to Minimax but accounts for probabilistic outcomes
 * - Agent tries to maximize expected utility
 * - Environment/obstacles are modeled with probability distributions
 */
class Expectimax {
    /**
     * Initialize Expectimax pathfinder
     * @param {Array} grid - The grid representation
     * @param {string} topology - The movement topology (vonNeumann or moore)
     */
    constructor(grid, topology) {
        this.grid = grid;
        this.topology = topology;
        this.maxDepth = 4; // Max search depth for Expectimax (typically less than Minimax due to complexity)
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
        
        // Start the Expectimax search
        const bestMove = this.expectimaxDecision(start, this.maxDepth);
        
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
     * Main Expectimax decision function to find the best move
     * @param {Object} state - Current state/position {x, y}
     * @param {number} depth - Search depth
     * @returns {Object} - Best next move
     */
    expectimaxDecision(state, depth) {
        let bestValue = -Infinity;
        let bestMove = null;
        
        // Get all possible moves from current state
        const moves = this.getNeighbors(state);
        
        // Evaluate each move with expectimax
        for (const move of moves) {
            // Get node key
            const nodeKey = `${move.x},${move.y}`;
            if (this.visited.has(nodeKey)) continue;
            
            // Mark as visited
            this.visited.add(nodeKey);
            
            // Calculate value using expectimax
            const value = this.expectValue(move, depth - 1);
            
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
     * MAX step in Expectimax (agent's turn)
     * @param {Object} state - Current state/position
     * @param {number} depth - Remaining search depth
     * @returns {number} - Utility value
     */
    maxValue(state, depth) {
        // Terminal test
        if (this.isTerminal(state) || depth <= 0) {
            return this.evaluate(state);
        }
        
        let value = -Infinity;
        const moves = this.getNeighbors(state);
        
        if (moves.length === 0) {
            return this.evaluate(state);
        }
        
        for (const move of moves) {
            // Get node key
            const nodeKey = `${move.x},${move.y}`;
            if (this.visited.has(nodeKey)) continue;
            
            // Mark as visited
            this.visited.add(nodeKey);
            
            // Calculate expected value
            value = Math.max(value, this.expectValue(move, depth - 1));
            
            // Unmark as visited for other paths
            this.visited.delete(nodeKey);
            
            // Save this move for path reconstruction if it's the best
            if (value > -Infinity) {
                this.cameFrom.set(`${state.x},${state.y}`, move);
            }
        }
        
        return value;
    }
    
    /**
     * EXPECT step in Expectimax (probabilistic outcomes)
     * @param {Object} state - Current state/position
     * @param {number} depth - Remaining search depth
     * @returns {number} - Expected utility value
     */
    expectValue(state, depth) {
        // Terminal test
        if (this.isTerminal(state) || depth <= 0) {
            return this.evaluate(state);
        }
        
        // Get possible next states
        const moves = this.getNeighbors(state);
        
        if (moves.length === 0) {
            return this.evaluate(state);
        }
        
        // Calculate expected value across all possible next states
        let expectedValue = 0;
        let validMoves = 0;
        
        for (const move of moves) {
            // Get node key
            const nodeKey = `${move.x},${move.y}`;
            if (this.visited.has(nodeKey)) continue;
            
            // Count valid moves for probability calculation
            validMoves++;
            
            // Mark as visited
            this.visited.add(nodeKey);
            
            // Add weighted value to expected value
            expectedValue += this.calculateProbability(move, state) * this.maxValue(move, depth - 1);
            
            // Unmark as visited for other paths
            this.visited.delete(nodeKey);
        }
        
        // If no valid moves, return current state evaluation
        if (validMoves === 0) {
            return this.evaluate(state);
        }
        
        // Return expected value
        return expectedValue;
    }
    
    /**
     * Calculate probability for a state transition based on various factors
     * @param {Object} nextState - Next state to consider
     * @param {Object} currentState - Current state
     * @returns {number} - Probability value between 0 and 1
     */
    calculateProbability(nextState, currentState) {
        // In Expectimax, we calculate transitions with probabilities
        // This is a simplified model - in a real system, these would be learned from data
        
        // Base probability - uniform distribution
        let baseProbability = 1.0;
        
        // Calculate distance to goal from next state
        const distanceToGoal = Math.abs(nextState.x - this.goal.x) + Math.abs(nextState.y - this.goal.y);
        
        // Calculate distance to goal from current state
        const currentDistanceToGoal = Math.abs(currentState.x - this.goal.x) + Math.abs(currentState.y - this.goal.y);
        
        // Check if we're getting closer to goal
        if (distanceToGoal < currentDistanceToGoal) {
            // Higher probability for moves that get us closer to the goal
            baseProbability *= 1.5; 
        } else {
            // Lower probability for moves that take us away from goal
            baseProbability *= 0.5;
        }
        
        // Check for proximity to walls - might indicate danger zones
        const neighbors = getNeighbors(nextState.x, nextState.y, this.topology, this.grid.length);
        const wallCount = neighbors.filter(n => this.isWall(n.x, n.y)).length;
        
        // Adjust probability based on wall proximity (more walls = more constrained = riskier)
        if (wallCount > 0) {
            baseProbability *= (1 - (wallCount / (neighbors.length * 2)));
        }
        
        // Ensure probability is between 0 and 1
        return Math.max(0, Math.min(1, baseProbability));
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
        
        // Calculate open space around state (less constrained = better)
        const neighbors = getNeighbors(state.x, state.y, this.topology, this.grid.length);
        const openNeighbors = neighbors.filter(n => !this.isWall(n.x, n.y)).length;
        const openBonus = openNeighbors / (this.topology === 'vonNeumann' ? 4 : 8) * 10;
        
        // Utility is inversely proportional to distance (closer = higher utility)
        // Add bonus for states with more open neighbors (less constrained)
        return 100 - distance + openBonus;
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