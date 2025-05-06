/**
 * A* Pathfinding Algorithm for Programmable Matter Simulation
 * Using Von Neumann topology (4-directional movement)
 */
class AStar {
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
     * Find path from start to end using A* algorithm
     * @param {Object} start - The starting position {x, y}
     * @param {Object} end - The ending position {x, y}
     * @returns {Array} - Array of positions forming the path
     */
    findPath(start, end) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = {};
        const gScore = {};
        const fScore = {};
        const rows = this.grid.length;
        const cols = this.grid[0].length;

        // Initialize scores
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const key = `${x},${y}`;
                gScore[key] = Infinity;
                fScore[key] = Infinity;
            }
        }

        const startKey = `${start.x},${start.y}`;
        gScore[startKey] = 0;
        fScore[startKey] = this.heuristic(start, end);
        
        openSet.push({
            pos: start,
            f: fScore[startKey]
        });

        while (openSet.length > 0) {
            // Sort by fScore and get the node with lowest f value
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift().pos;
            const currentKey = `${current.x},${current.y}`;

            // If we reached the target
            if (current.x === end.x && current.y === end.y) {
                // Reconstruct path
                return this.reconstructPath(cameFrom, end);
            }

            closedSet.add(currentKey);

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
                
                // Skip if already evaluated or is a wall
                if (closedSet.has(neighborKey) || this.grid[neighbor.y][neighbor.x] === 1) {
                    continue;
                }

                // Distance from start to neighbor
                const tentativeGScore = gScore[currentKey] + 1;

                // Add neighbor to open set if not there
                const neighborInOpenSet = openSet.some(node => 
                    node.pos.x === neighbor.x && node.pos.y === neighbor.y);
                
                if (!neighborInOpenSet) {
                    openSet.push({
                        pos: neighbor,
                        f: Infinity
                    });
                } else if (tentativeGScore >= gScore[neighborKey]) {
                    // Not a better path
                    continue;
                }

                // Best path until now
                cameFrom[neighborKey] = current;
                gScore[neighborKey] = tentativeGScore;
                fScore[neighborKey] = tentativeGScore + this.heuristic(neighbor, end);
                
                // Update f score in openSet
                for (const node of openSet) {
                    if (node.pos.x === neighbor.x && node.pos.y === neighbor.y) {
                        node.f = fScore[neighborKey];
                        break;
                    }
                }
            }
        }

        // No path found
        return [];
    }

    /**
     * Manhattan distance heuristic
     * @param {Object} a - First position {x, y}
     * @param {Object} b - Second position {x, y}
     * @returns {number} - The Manhattan distance
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Reconstruct path from cameFrom map
     * @param {Object} cameFrom - Map of positions
     * @param {Object} current - End position
     * @returns {Array} - Array of positions forming the path
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;
        
        while (cameFrom[currentKey]) {
            current = cameFrom[currentKey];
            currentKey = `${current.x},${current.y}`;
            path.unshift(current);
        }
        
        return path;
    }
} 