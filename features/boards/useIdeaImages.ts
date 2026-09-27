'use client';

import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { createClient } from '@/lib/supabase/client';
import { removeImages, signImages, uploadNodeImage } from '@/lib/queries/boardImages';
import { updateNode, type NodePatch } from '@/lib/queries/boards';
import { isIdea, type BoardFlowNode, type IdeaData } from './boardFlow';
import { downscaleImage } from './downscaleImage';
import type { Attempt, SetNodes } from './useBoardGraph';

/** What the idea form asks for besides its text: a new picture, none, or no change. */
export type ImageChange = { kind: 'set'; file: File } | { kind: 'remove' } | null;

/**
 * Signed URLs for the board's images, keyed by object path. The page signs the
 * existing ones on load; a fresh upload is signed here and added.
 */
export function useBoardImages(boardId: string, initialUrls: Record<string, string>) {
  const [urls, setUrls] = useState(initialUrls);

  const upload = useCallback(
    async (nodeId: string, file: File) => {
      const client = createClient();
      const image = await downscaleImage(file);
      const path = await uploadNodeImage(client, { boardId, nodeId, image });
      const signed = await signImages(client, [path]);
      setUrls((prev) => ({ ...prev, ...signed }));
      return path;
    },
    [boardId],
  );

  // Best effort: an orphaned file costs a little storage, never correctness.
  const discard = useCallback((paths: (string | null | undefined)[]) => {
    const real = paths.filter((p): p is string => Boolean(p));
    if (real.length) removeImages(createClient(), real).catch(console.error);
  }, []);

  return { urls, upload, discard };
}

type Images = ReturnType<typeof useBoardImages>;

/**
 * Saving an idea, image included. A new picture is uploaded first and only
 * then written to the row; the old file is removed once the row no longer
 * points at it, and a fresh upload is removed again if the row write fails.
 */
export function useSaveIdea(attempt: Attempt, setNodes: SetNodes, images: Images) {
  const { getNodes } = useReactFlow<BoardFlowNode>();

  return useCallback(
    async (id: string, patch: NodePatch, change: ImageChange = null) => {
      const node = getNodes().find((n) => n.id === id);
      const oldPath = node && isIdea(node) ? node.data.imagePath : null;

      let newPath: string | null | undefined;
      if (change?.kind === 'set') {
        const up = await attempt('upload the image', () => images.upload(id, change.file));
        if (!up) return false;
        newPath = up.value;
      } else if (change?.kind === 'remove') {
        newPath = null;
      }

      const full: NodePatch = newPath === undefined ? patch : { ...patch, image_path: newPath };
      const ok = await attempt('save the idea', () => updateNode(createClient(), id, full));
      if (!ok) {
        images.discard([newPath]);
        return false;
      }
      if (newPath !== undefined && oldPath !== newPath) images.discard([oldPath]);

      setNodes((prev) =>
        prev.map((n) => (n.id === id && isIdea(n) ? { ...n, data: patchData(n.data, full) } : n)),
      );
      return true;
    },
    [attempt, getNodes, images, setNodes],
  );
}

export const patchData = (data: IdeaData, patch: NodePatch): IdeaData => ({
  title: patch.title ?? data.title,
  body: patch.body !== undefined ? patch.body : data.body,
  done: patch.done ?? data.done,
  goalId: patch.goal_id !== undefined ? patch.goal_id : data.goalId,
  imagePath: patch.image_path !== undefined ? patch.image_path : data.imagePath,
});
