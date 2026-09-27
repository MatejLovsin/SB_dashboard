'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { markdownExcerpt } from '@/lib/utils/markdown';
import type { IdeaFlowNode } from './useBoardGraph';

// An idea is a point of light with its words beside it — no card. The light is
// also the connector: drag from it to another idea to draw a line. The words
// are the grip for moving it. Styling lives in board.css.
export const IdeaNode = memo(function IdeaNode({
  data,
  selected,
  isConnectable,
}: NodeProps<IdeaFlowNode>) {
  const excerpt = markdownExcerpt(data.body);
  return (
    <div className="idea-node" data-done={data.done} data-selected={selected}>
      <span className="idea-light" aria-hidden />
      <Handle
        type="source"
        position={Position.Right}
        className="idea-handle"
        isConnectable={isConnectable}
      />
      <div className="idea-text">
        <div className="idea-title">{data.title}</div>
        {excerpt ? <p className="idea-excerpt">{excerpt}</p> : null}
      </div>
    </div>
  );
});
