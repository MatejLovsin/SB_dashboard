'use client';

import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { PhaseFlowNode } from './boardFlow';
import { useBoardContext, useGoalState } from './boardContext';
import { GoalTrace, goalAttr } from './goalLinks';

// A phase is a pool of light, not a box: a soft wash with its name in the
// corner. Only the title catches the pointer — the pool itself lets clicks
// through to the canvas, so lines inside stay clickable and a double-click in
// it adds an idea there. Styling lives in board.css.
export const PhaseNode = memo(function PhaseNode({ id, data, selected }: NodeProps<PhaseFlowNode>) {
  const { canEdit, resizePhase } = useBoardContext();
  const goal = useGoalState(data.goalId);

  return (
    <div
      className="phase-node"
      data-done={data.done}
      data-goal={goalAttr(goal)}
      data-selected={selected}
    >
      <NodeResizer
        isVisible={canEdit && selected}
        minWidth={200}
        minHeight={140}
        lineClassName="phase-resize-line"
        handleClassName="phase-resize-handle"
        onResizeEnd={(_event, rect) => resizePhase(id, rect)}
      />
      <div className="phase-title">
        <span className="label">{data.title}</span>
        {goal && !goal.achieved ? <GoalTrace percent={goal.percent} /> : null}
      </div>
    </div>
  );
});
