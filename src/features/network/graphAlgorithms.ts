import type { NetworkGraphNode, NetworkGraphEdge } from './resolveNetworkGraphData';

/**
 * Real, deterministic graph algorithms — no AI, no Function, nothing to
 * fake. Same honesty as the AI Analyst's "computed" capabilities: what's
 * here is plain graph theory over the entities/relationships that already
 * exist, labeled as computed rather than presented as intelligence.
 */

export interface CentralityScore {
  nodeId: string;
  degree: number;
  weightedDegree: number;
  influenceScore: number;
}

/** Degree centrality, weighted by relationship strength where available, normalized to 0–100. */
export function computeCentrality(nodes: NetworkGraphNode[], edges: NetworkGraphEdge[]): Map<string, CentralityScore> {
  const degree = new Map<string, number>();
  const weightedDegree = new Map<string, number>();

  for (const node of nodes) {
    degree.set(node.id, 0);
    weightedDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    const strength = edge.data.strength ?? 50;
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    weightedDegree.set(edge.source, (weightedDegree.get(edge.source) ?? 0) + strength);
    weightedDegree.set(edge.target, (weightedDegree.get(edge.target) ?? 0) + strength);
  }

  const maxWeighted = Math.max(1, ...Array.from(weightedDegree.values()));

  const scores = new Map<string, CentralityScore>();
  for (const node of nodes) {
    const w = weightedDegree.get(node.id) ?? 0;
    scores.set(node.id, {
      nodeId: node.id,
      degree: degree.get(node.id) ?? 0,
      weightedDegree: w,
      influenceScore: Math.round((w / maxWeighted) * 100),
    });
  }
  return scores;
}

export function rankCentralEntities(
  nodes: NetworkGraphNode[],
  edges: NetworkGraphEdge[],
  topN = 5
): { node: NetworkGraphNode; score: CentralityScore }[] {
  const scores = computeCentrality(nodes, edges);
  return nodes
    .map((node) => ({ node, score: scores.get(node.id)! }))
    .filter((entry) => entry.score.degree > 0)
    .sort((a, b) => b.score.influenceScore - a.score.influenceScore)
    .slice(0, topN);
}

export interface PathHop {
  node: NetworkGraphNode;
  viaEdge?: NetworkGraphEdge;
}

/** Breadth-first shortest path, treating relationships as undirected — investigators care about any connection, not flow direction. */
export function findShortestPath(
  sourceId: string,
  targetId: string,
  nodes: NetworkGraphNode[],
  edges: NetworkGraphEdge[]
): PathHop[] | null {
  if (sourceId === targetId) {
    const node = nodes.find((n) => n.id === sourceId);
    return node ? [{ node }] : null;
  }

  const adjacency = new Map<string, { neighborId: string; edge: NetworkGraphEdge }[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push({ neighborId: edge.target, edge });
    adjacency.get(edge.target)!.push({ neighborId: edge.source, edge });
  }

  const visited = new Set<string>([sourceId]);
  const queue: string[] = [sourceId];
  const cameFrom = new Map<string, { fromId: string; edge: NetworkGraphEdge }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) break;
    for (const { neighborId, edge } of adjacency.get(current) ?? []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      cameFrom.set(neighborId, { fromId: current, edge });
      queue.push(neighborId);
    }
  }

  if (!visited.has(targetId)) return null;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const path: PathHop[] = [];
  let cursor: string | undefined = targetId;
  while (cursor) {
    const node = nodeById.get(cursor);
    if (!node) break;
    const step = cameFrom.get(cursor);
    path.unshift({ node, viaEdge: step?.edge });
    cursor = step?.fromId;
  }
  return path;
}
