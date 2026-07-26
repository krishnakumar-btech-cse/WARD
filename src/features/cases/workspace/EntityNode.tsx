import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '../../../shared/lib/utils';
import { NODE_STYLES } from './nodeStyles';
import type { CanvasNodeData } from './canvasTypes';

export type EntityFlowNode = Node<CanvasNodeData, 'entity'>;

export function EntityNode({ data, selected }: NodeProps<EntityFlowNode>) {
  const style = NODE_STYLES[data.kind];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'w-56 rounded-lg border-2 px-3 py-2.5 shadow-sm transition-shadow',
        style.classes,
        selected && 'shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <Handle type="target" position={Position.Left} className="!border-current !bg-current" />
      <div className="flex items-center gap-2">
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
