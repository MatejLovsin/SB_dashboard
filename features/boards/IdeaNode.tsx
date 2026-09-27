'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { markdownExcerpt } from '@/lib/utils/markdown';
import type { IdeaFlowNode } from './boardFlow';
import { useGoalState, useImageUrl } from './boardContext';
import { GoalTrace, goalAttr } from './goalLinks';

// An idea is a point of light with its words beside it — no card. The light is
// also the connector: drag from it to another idea to draw a line. The words
// are the grip for moving it. Styling lives in board.css.
export const IdeaNode = memo(function IdeaNode({
  data,
  selected,
  isConnectable,
}: NodeProps<IdeaFlowNode>) {
  const excerpt = markdownExcerpt(data.body);
  const goal = useGoalState(data.goalId);
  const imageUrl = useImageUrl(data.imagePath);
  return (
    <div
      className="idea-node"
      data-done={data.done}
      data-goal={goalAttr(goal)}
      data-selected={selected}
    >
      <span className="idea-light" aria-hidden />
      <Handle
        type="source"
        position={Position.Right}
        className="idea-handle"
        isConnectable={isConnectable}
      />
      <div className="idea-text">
        <div className="idea-title">{data.title}</div>
        {goal && !goal.achieved ? <GoalTrace percent={goal.percent} /> : null}
        {excerpt ? <p className="idea-excerpt">{excerpt}</p> : null}
        {imageUrl ? (
          // Below the words, so the light stays level with the title.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="idea-image" draggable={false} loading="lazy" />
        ) : null}
      </div>
    </div>
  );
});
