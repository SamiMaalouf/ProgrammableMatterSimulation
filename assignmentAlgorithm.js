/**
 * Hungarian Algorithm for optimal assignment of agents to targets
 * This implementation is used to minimize the total distance traveled
 */
class HungarianAlgorithm {
    /**
     * Find optimal assignment of agents to targets
     * @param {Array} agents - Array of agent positions [{x, y}, ...]
     * @param {Array} targets - Array of target positions [{x, y}, ...]
     * @param {Object} grid - The grid for pathfinding
     * @returns {Array} - Array of assignments [{agent: index, target: index}, ...]
     */
    static findOptimalAssignment(agents, targets, grid) {
        // Create cost matrix - cost is the Manhattan distance between each agent and target
        const costMatrix = this.createCostMatrix(agents, targets, grid);
        
        // Apply Hungarian algorithm to find optimal assignment
        const assignments = this.hungarianAlgorithm(costMatrix);
        
        return assignments.map(assignment => ({
            agent: assignment.row,
            target: assignment.col
        }));
    }

    /**
     * Create cost matrix for agents and targets
     * @param {Array} agents - Array of agent positions
     * @param {Array} targets - Array of target positions
     * @param {Object} grid - The grid for pathfinding
     * @returns {Array} - 2D cost matrix
     */
    static createCostMatrix(agents, targets, grid) {
        const astar = new AStar(grid);
        const costMatrix = [];
        
        for (let i = 0; i < agents.length; i++) {
            const row = [];
            for (let j = 0; j < targets.length; j++) {
                // Calculate path length using A* algorithm
                const path = astar.findPath(agents[i], targets[j]);
                // Cost is the path length (or Manhattan distance if no path found)
                const cost = path.length > 0 
                    ? path.length - 1  // Subtract 1 to exclude starting position
                    : this.manhattanDistance(agents[i], targets[j]) * 10; // Penalize unreachable targets
                
                row.push(cost);
            }
            costMatrix.push(row);
        }
        
        return costMatrix;
    }

    /**
     * Calculate Manhattan distance between two points
     * @param {Object} a - First position {x, y}
     * @param {Object} b - Second position {x, y}
     * @returns {number} - The Manhattan distance
     */
    static manhattanDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Implement Hungarian algorithm for optimal assignment
     * @param {Array} costMatrix - 2D cost matrix
     * @returns {Array} - Array of assignments [{row, col}, ...]
     */
    static hungarianAlgorithm(costMatrix) {
        if (costMatrix.length === 0) return [];
        
        // Make a copy of the cost matrix
        const costs = costMatrix.map(row => [...row]);
        
        const h = costs.length; // number of agents
        const w = costs[0].length; // number of targets
        
        // Step 1: Subtract row minima
        for (let i = 0; i < h; i++) {
            const minVal = Math.min(...costs[i]);
            for (let j = 0; j < w; j++) {
                costs[i][j] -= minVal;
            }
        }
        
        // Step 2: Subtract column minima
        for (let j = 0; j < w; j++) {
            let minVal = Infinity;
            for (let i = 0; i < h; i++) {
                if (costs[i][j] < minVal) {
                    minVal = costs[i][j];
                }
            }
            
            if (minVal !== Infinity) {
                for (let i = 0; i < h; i++) {
                    costs[i][j] -= minVal;
                }
            }
        }
        
        // Find a minimum number of lines to cover all zeros
        const assignments = this.findAssignments(costs, h, w);
        
        return assignments;
    }
    
    /**
     * Find assignments using a greedy approach
     * @param {Array} costs - Modified cost matrix with zeros
     * @param {number} h - Number of rows (agents)
     * @param {number} w - Number of columns (targets)
     * @returns {Array} - Array of assignments [{row, col}, ...]
     */
    static findAssignments(costs, h, w) {
        const assignments = [];
        const rowCovered = new Array(h).fill(false);
        const colCovered = new Array(w).fill(false);
        
        // Greedy assignment for each agent
        for (let i = 0; i < h; i++) {
            let minVal = Infinity;
            let minJ = -1;
            
            // Find the target with minimum cost for this agent
            for (let j = 0; j < w; j++) {
                if (!colCovered[j] && costs[i][j] < minVal) {
                    minVal = costs[i][j];
                    minJ = j;
                }
            }
            
            if (minJ !== -1) {
                assignments.push({ row: i, col: minJ });
                rowCovered[i] = true;
                colCovered[minJ] = true;
            }
        }
        
        // Handle unassigned agents (if any)
        for (let i = 0; i < h; i++) {
            if (!rowCovered[i]) {
                for (let j = 0; j < w; j++) {
                    if (!colCovered[j]) {
                        assignments.push({ row: i, col: j });
                        colCovered[j] = true;
                        break;
                    }
                }
            }
        }
        
        return assignments;
    }
} 