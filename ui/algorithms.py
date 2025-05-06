"""Algorithms for pathfinding, assignment, and movement in programmable matter simulation."""
import heapq
import random
import numpy as np
from collections import deque
from ui.config import *

class PathPlanner:
    """Plans paths for agents to targets."""
    
    def __init__(self, grid):
        """Initialize with a grid reference."""
        self.grid = grid
        
    def bfs(self, start, goal):
        """Breadth-first search algorithm."""
        if not start or not goal:
            return None
            
        queue = deque([(start, [])])
        visited = set([start])
        
        while queue:
            (r, c), path = queue.popleft()
            
            # Check if we've reached the goal
            if (r, c) == goal:
                return path + [(r, c)]
            
            # Explore neighbors
            for nr, nc in self.grid.get_neighbors(r, c):
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append(((nr, nc), path + [(r, c)]))
        
        # No path found
        return None
    
    def a_star(self, start, goal):
        """A* search algorithm."""
        if not start or not goal:
            return None
            
        # Priority queue for A*
        open_set = [(0, 0, start, [])]  # (f_score, tiebreaker, position, path)
        closed_set = set()
        g_scores = {start: 0}
        f_scores = {start: self._heuristic(start, goal)}
        counter = 0  # Tiebreaker for equal f_scores
        
        while open_set:
            _, _, (r, c), path = heapq.heappop(open_set)
            
            # Check if we've reached the goal
            if (r, c) == goal:
                return path + [(r, c)]
            
            if (r, c) in closed_set:
                continue
                
            closed_set.add((r, c))
            
            # Explore neighbors
            for nr, nc in self.grid.get_neighbors(r, c):
                neighbor = (nr, nc)
                
                # Skip if already processed
                if neighbor in closed_set:
                    continue
                
                # Calculate new g_score (path cost)
                tentative_g = g_scores[(r, c)] + 1  # Uniform cost of 1 per step
                
                if neighbor not in g_scores or tentative_g < g_scores[neighbor]:
                    # Found a better path to this neighbor
                    g_scores[neighbor] = tentative_g
                    f_scores[neighbor] = tentative_g + self._heuristic(neighbor, goal)
                    counter += 1
                    heapq.heappush(open_set, (f_scores[neighbor], counter, neighbor, path + [(r, c)]))
        
        # No path found
        return None
    
    def greedy_search(self, start, goal):
        """Greedy best-first search algorithm."""
        if not start or not goal:
            return None
            
        # Priority queue for greedy search
        open_set = [(self._heuristic(start, goal), 0, start, [])]
        closed_set = set()
        counter = 0  # Tiebreaker for equal heuristic values
        
        while open_set:
            _, _, (r, c), path = heapq.heappop(open_set)
            
            # Check if we've reached the goal
            if (r, c) == goal:
                return path + [(r, c)]
            
            if (r, c) in closed_set:
                continue
                
            closed_set.add((r, c))
            
            # Explore neighbors
            for nr, nc in self.grid.get_neighbors(r, c):
                neighbor = (nr, nc)
                
                # Skip if already processed
                if neighbor in closed_set:
                    continue
                
                counter += 1
                heapq.heappush(open_set, (self._heuristic(neighbor, goal), counter, neighbor, path + [(r, c)]))
        
        # No path found
        return None
    
    def _heuristic(self, a, b):
        """Manhattan distance heuristic."""
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    def plan_paths(self, algorithm, agents, targets, assignments=None):
        """Plan paths for all agents based on the chosen algorithm."""
        paths = {}
        
        # Use the provided assignments or create a default one
        if assignments is None:
            # Default to greedy assignment if none provided
            assignments = list(range(min(len(agents), len(targets))))
        
        for agent_idx, target_idx in enumerate(assignments):
            if agent_idx < len(agents) and target_idx < len(targets):
                agent_pos = agents[agent_idx]
                target_pos = targets[target_idx]
                
                if algorithm == ALGORITHM_BFS:
                    path = self.bfs(agent_pos, target_pos)
                elif algorithm == ALGORITHM_ASTAR:
                    path = self.a_star(agent_pos, target_pos)
                elif algorithm == ALGORITHM_GREEDY:
                    path = self.greedy_search(agent_pos, target_pos)
                else:
                    # Default to A*
                    path = self.a_star(agent_pos, target_pos)
                
                paths[agent_idx] = path
        
        return paths
    
    def detect_deadlocks(self, paths):
        """Detect and resolve potential deadlocks in the planned paths."""
        # Simple time-based collision detection and resolution
        if not paths:
            return paths
            
        # Check for each timestep if two agents occupy the same cell
        max_path_length = max(len(path) for path in paths.values() if path)
        timestep_positions = {}
        
        for t in range(max_path_length):
            # Reset for the current timestep
            timestep_positions = {}
            
            for agent_idx, path in paths.items():
                if not path:
                    continue
                    
                # Get position at current timestep (stay at goal if path is shorter)
                pos = path[min(t, len(path) - 1)]
                
                # Check if another agent is at this position
                if pos in timestep_positions:
                    # Collision detected, delay the second agent
                    existing_agent = timestep_positions[pos]
                    if agent_idx != existing_agent:
                        # Insert a delay (repeat the previous position)
                        if t > 0 and t < len(paths[agent_idx]):
                            prev_pos = paths[agent_idx][t-1]
                            paths[agent_idx] = paths[agent_idx][:t] + [prev_pos] + paths[agent_idx][t:]
                else:
                    timestep_positions[pos] = agent_idx
        
        return paths


class AssignmentStrategy:
    """Strategies for assigning agents to targets."""
    
    @staticmethod
    def hungarian(grid, agents, targets):
        """Hungarian algorithm for optimal agent-target assignment."""
        n_agents = len(agents)
        n_targets = len(targets)
        
        if n_agents == 0 or n_targets == 0:
            return []
        
        # Create cost matrix (distance between each agent and target)
        cost_matrix = np.zeros((n_agents, n_targets))
        for i, agent in enumerate(agents):
            for j, target in enumerate(targets):
                cost_matrix[i, j] = abs(agent[0] - target[0]) + abs(agent[1] - target[1])
        
        # Run the Hungarian algorithm
        # This is a simplified implementation - in practice, you'd use a library like scipy
        row_ind, col_ind = AssignmentStrategy._hungarian_algorithm(cost_matrix)
        
        # Convert to assignments
        return [col_ind[i] if i < len(col_ind) else -1 for i in range(n_agents)]
    
    @staticmethod
    def _hungarian_algorithm(cost_matrix):
        """Simplified Hungarian algorithm implementation."""
        # This is a basic implementation - for production, use scipy.optimize.linear_sum_assignment
        n, m = cost_matrix.shape
        
        # Step 1: Subtract row minima
        cost_matrix = cost_matrix.copy()
        for i in range(n):
            cost_matrix[i, :] -= np.min(cost_matrix[i, :])
        
        # Step 2: Subtract column minima
        for j in range(m):
            cost_matrix[:, j] -= np.min(cost_matrix[:, j])
        
        # Find a minimal set of lines to cover all zeros
        line_count = 0
        row_covered = np.zeros(n, dtype=bool)
        col_covered = np.zeros(m, dtype=bool)
        
        # Simple greedy algorithm for cover
        while line_count < min(n, m):
            # Find uncovered zeros
            zero_positions = np.argwhere(cost_matrix == 0)
            if len(zero_positions) == 0:
                break
                
            # Count zeros in each row and column
            row_zeros = np.zeros(n)
            col_zeros = np.zeros(m)
            for row, col in zero_positions:
                if not row_covered[row] and not col_covered[col]:
                    row_zeros[row] += 1
                    col_zeros[col] += 1
            
            # Cover the row or column with the most zeros
            if np.max(row_zeros) >= np.max(col_zeros):
                row_to_cover = np.argmax(row_zeros)
                row_covered[row_to_cover] = True
            else:
                col_to_cover = np.argmax(col_zeros)
                col_covered[col_to_cover] = True
            
            line_count += 1
        
        # Assign agents to targets greedily based on covered zeros
        assignments = []
        for i in range(n):
            for j in range(m):
                if cost_matrix[i, j] == 0 and not col_covered[j]:
                    assignments.append((i, j))
                    col_covered[j] = True
                    break
        
        # Sort assignments by agent index
        assignments.sort()
        
        # Extract row and column indices
        row_ind = [a[0] for a in assignments]
        col_ind = [a[1] for a in assignments]
        
        return row_ind, col_ind
    
    @staticmethod
    def greedy(grid, agents, targets):
        """Greedy assignment of agents to targets."""
        n_agents = len(agents)
        n_targets = len(targets)
        
        if n_agents == 0 or n_targets == 0:
            return []
        
        # Calculate distance matrix
        distance_matrix = np.zeros((n_agents, n_targets))
        for i, agent in enumerate(agents):
            for j, target in enumerate(targets):
                distance_matrix[i, j] = abs(agent[0] - target[0]) + abs(agent[1] - target[1])
        
        # Greedy assignment
        assignments = [-1] * n_agents
        used_targets = set()
        
        # Assign each agent to the closest available target
        for i in range(n_agents):
            # Get distances to all targets for this agent
            distances = [(distance_matrix[i, j], j) for j in range(n_targets) if j not in used_targets]
            
            if distances:
                # Sort by distance and take the closest one
                distances.sort()
                target_idx = distances[0][1]
                assignments[i] = target_idx
                used_targets.add(target_idx)
        
        return assignments
    
    @staticmethod
    def auction(grid, agents, targets):
        """Auction-based assignment of agents to targets."""
        n_agents = len(agents)
        n_targets = len(targets)
        
        if n_agents == 0 or n_targets == 0:
            return []
        
        # Initialize prices and assignments
        prices = np.zeros(n_targets)
        assignments = [-1] * n_agents
        assigned_targets = set()
        
        # Calculate utility matrix (negative distance)
        utility_matrix = np.zeros((n_agents, n_targets))
        for i, agent in enumerate(agents):
            for j, target in enumerate(targets):
                # Use negative distance as utility (closer is better)
                utility_matrix[i, j] = -1 * (abs(agent[0] - target[0]) + abs(agent[1] - target[1]))
        
        # Main auction loop
        epsilon = 0.01  # Small constant to ensure convergence
        
        while len(assigned_targets) < min(n_agents, n_targets):
            # Find unassigned agent
            unassigned = next((i for i in range(n_agents) if assignments[i] == -1), None)
            if unassigned is None:
                break
            
            # Calculate net utilities
            net_utilities = [(utility_matrix[unassigned, j] - prices[j], j) 
                             for j in range(n_targets) if j not in assigned_targets]
            
            if not net_utilities:
                break
                
            # Sort by net utility and take the best one
            net_utilities.sort(reverse=True)
            best_target = net_utilities[0][1]
            
            # Assign agent to target
            assignments[unassigned] = best_target
            assigned_targets.add(best_target)
            
            # Update price
            prices[best_target] += epsilon
        
        return assignments 