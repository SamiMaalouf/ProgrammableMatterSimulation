/**
 * BFS (Breadth-First Search) Pathfinding Algorithm for Programmable Matter Simulation
 * Using Von Neumann topology (4-directional movement)
 */
class BFS {
    constructor(grid) {
        this.grid = grid;
        this.directions = [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];
    }

    /**
     * Find path from start to end using BFS algorithm
     * @param {Object} start - The starting position {x, y}
     * @param {Object} end - The ending position {x, y}
     * @returns {Array} - Array of positions forming the path
     */
    findPath(start, end) {
        const rows = this.grid.length;
        const cols = this.grid[0].length;
        
        // Queue for BFS
        const queue = [];
        // To keep track of visited cells
        const visited = new Set();
        // To keep track of parent cells for path reconstruction
        const parent = {};
        
        // Add start position to queue
        queue.push(start);
        visited.add(`${start.x},${start.y}`);
        
        while (queue.length > 0) {
            const current = queue.shift();
            const currentKey = `${current.x},${current.y}`;
            
            // If we reached the target
            if (current.x === end.x && current.y === end.y) {
                // Reconstruct path
                return this.reconstructPath(parent, end);
            }
            
            // Check all neighbor directions
            for (const dir of this.directions) {
                const neighbor = {
                    x: current.x + dir.x,
                    y: current.y + dir.y
                };
                
                // Skip if out of bounds
                if (neighbor.x < 0 || neighbor.x >= cols || 
                    neighbor.y < 0 || neighbor.y >= rows) {
                    continue;
                }
                
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                // Skip if already visited or is a wall
                if (visited.has(neighborKey) || this.grid[neighbor.y][neighbor.x] === 1) {
                    continue;
                }
                
                // Mark as visited and add to queue
                visited.add(neighborKey);
                queue.push(neighbor);
                parent[neighborKey] = current;
            }
        }
        
        // No path found
        return [];
    }
    
    /**
     * Reconstruct path from parent map
     * @param {Object} parent - Map of positions
     * @param {Object} current - End position
     * @returns {Array} - Array of positions forming the path
     */
    reconstructPath(parent, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;
        
        while (parent[currentKey]) {
            current = parent[currentKey];
            currentKey = `${current.x},${current.y}`;
            path.unshift(current);
        }
        
        return path;
    }
} 