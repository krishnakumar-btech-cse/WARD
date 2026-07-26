/** Standard {all,list,detail,schema} key shape shared by every schema-driven resource. */
function createResourceKeys(namespace: string) {
  return {
    all: () => [namespace] as const,
    list: (params?: object) => [namespace, 'list', params ?? {}] as const,
    detail: (id: string) => [namespace, 'detail', id] as const,
    schema: () => [namespace, 'schema'] as const,
  };
}

/** Centralized TanStack Query key factory — keeps cache invalidation consistent across hooks. */
export const queryKeys = {
  cases: createResourceKeys('cases'),
  evidence: createResourceKeys('evidence'),
  workspaceItems: createResourceKeys('workspaceItems'),
  workspaceEdges: createResourceKeys('workspaceEdges'),
  notebookEntries: createResourceKeys('notebookEntries'),
  timelineEvents: createResourceKeys('timelineEvents'),
  caseHypotheses: createResourceKeys('caseHypotheses'),
  caseTasks: createResourceKeys('caseTasks'),
  networkEntities: createResourceKeys('networkEntities'),
  networkRelationships: createResourceKeys('networkRelationships'),
  crimePatternAggregates: createResourceKeys('crimePatternAggregates'),
  adminUsers: createResourceKeys('adminUsers'),
  adminRoles: createResourceKeys('adminRoles'),
  adminPoliceStations: createResourceKeys('adminPoliceStations'),
  caseAssignments: createResourceKeys('caseAssignments'),
} as const;
