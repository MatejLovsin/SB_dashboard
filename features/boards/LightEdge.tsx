'use client';

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react';
import type { LightFlowEdge } from './boardFlow';

// A line between two ideas is a thin trace of light, straight from one to the
// other — it only ever means "related", so it has no arrow and no curve that
// would imply a direction. Its optional label sits on the midpoint.
export const LightEdge = memo(function LightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<LightFlowEdge>) {
  const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge id={id} path={path} className="light-edge" interactionWidth={18} />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className="light-edge-label"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
