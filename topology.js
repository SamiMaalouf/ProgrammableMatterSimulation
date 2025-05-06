/**
 * Topology configurations for the Programmable Matter Simulation
 * Defines different movement patterns (neighborhoods) for agents
 */

// Topology types
const TOPOLOGY_VON_NEUMANN = 'vonNeumann'; // 4-directional (N, E, S, W)
const TOPOLOGY_MOORE = 'moore';            // 8-directional (N, NE, E, SE, S, SW, W, NW)

// Get directions based on topology type
function getDirections(topologyType) {
    if (topologyType === TOPOLOGY_MOORE) {
        return [
            { x: 0, y: -1 },  // North
            { x: 1, y: -1 },  // Northeast
            { x: 1, y: 0 },   // East
            { x: 1, y: 1 },   // Southeast
            { x: 0, y: 1 },   // South
            { x: -1, y: 1 },  // Southwest
            { x: -1, y: 0 },  // West
            { x: -1, y: -1 }  // Northwest
        ];
    } else {
        // Default to Von Neumann
        return [
            { x: 0, y: -1 },  // North
            { x: 1, y: 0 },   // East
            { x: 0, y: 1 },   // South
            { x: -1, y: 0 }   // West
        ];
    }
}

// Get neighbor positions based on current position and topology
function getNeighbors(x, y, topologyType, gridSize) {
    const directions = getDirections(topologyType);
    const neighbors = [];
    
    for (const dir of directions) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        
        // Check bounds
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            neighbors.push({ x: nx, y: ny });
        }
    }
    
    return neighbors;
} 