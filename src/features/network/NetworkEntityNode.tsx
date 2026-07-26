import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '../../shared/lib/utils';
import { NETWORK_NODE_STYLES } from './networkNodeStyles';
import type { NetworkNodeData } from './networkTypes';

export interface NetworkFlowNodeData extends NetworkNodeData {
  rank?: number;
  isPathHighlighted?: boolean;
  isDimmed?: boolean;
}

export type NetworkFlowNode = Node<NetworkFlowNodeData, 'networkEntity'>;

export function NetworkEntityNode({ data, selected }: NodeProps<NetworkFlowNode>) {
  const style = NETWORK_NODE_STYLES[data.kind];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'w-52 rounded-lg border-2 px-3 py-2.5 shadow-sm transition-all',
        style.classes,
        selected && 'shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background',
        data.isPathHighlighted && 'ring-2 ring-warning ring-offset-2 ring-offset-background',
        data.isDimmed && 'opacity-25'
      )}
    >
      <Handle type="target" position={Position.Left} className="!border-current !bg-current" />
      <div className="flex items-center gap-2">
        {data.rank !== undefined && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current text-[10px] font-bold text-background">
            {data.rank}
          </span>
        )}
        <Icon className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{data.label}</p>
          <p className="text-[11px] uppercase tracking-wide opacity-70">{data.kind}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!border-current !bg-current" />
    </div>
  );
}
