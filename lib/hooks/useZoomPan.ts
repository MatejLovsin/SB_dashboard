'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

// Zoom and pan for one image on a stage: wheel and buttons zoom, a drag pans, a
// pinch zooms on touch, a tap toggles between fitted and close-up. The view is
// a translate + scale around the stage's centre, kept so the image never
// drifts off the stage.

export interface View {
  scale: number;
  x: number;
  y: number;
}

type Point = { x: number; y: number };
type Size = { w: number; h: number };

export const FIT: View = { scale: 1, x: 0, y: 0 };
const MAX_SCALE = 8;
const TAP_SCALE = 2.5;
/** Pointer travel (px) under which a press counts as a tap, not a drag. */
const TAP_SLOP = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Zoom to `scale`, keeping the point `p` (relative to the stage centre) still. */
export function zoomAt(v: View, scale: number, p: Point): View {
  const s = clamp(scale, 1, MAX_SCALE);
  const k = s / v.scale;
  return { scale: s, x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k };
}

/** A zoomed image may pan only as far as it still covers the stage. */
export function clampView(v: View, content: Size, stage: Size): View {
  const maxX = Math.max(0, (content.w * v.scale - stage.w) / 2);
  const maxY = Math.max(0, (content.h * v.scale - stage.h) / 2);
  return { scale: v.scale, x: clamp(v.x, -maxX, maxX), y: clamp(v.y, -maxY, maxY) };
}

interface Gesture {
  moved: number;
  pinch: { dist: number; scale: number } | null;
}

type Apply = (next: (v: View) => View, anim: boolean) => void;

export function useZoomPan(
  stageRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  onBackdropTap: () => void,
) {
  const [view, setView] = useState<View>(FIT);
  const [animate, setAnimate] = useState(false);
  const viewRef = useRef(view);
  useLayoutEffect(() => {
    viewRef.current = view;
  }, [view]);
  // Positions relative to the stage centre, which is where the image sits at rest.
  const local = (clientX: number, clientY: number): Point => {
    const r = stageRef.current?.getBoundingClientRect();
    return r ? { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 } : { x: 0, y: 0 };
  };

  const apply: Apply = (next, anim) => {
    setAnimate(anim);
    setView((v) => {
      const stage = stageRef.current;
      const content = contentRef.current;
      if (!stage || !content) return next(v);
      return clampView(
        next(v),
        { w: content.offsetWidth, h: content.offsetHeight },
        { w: stage.clientWidth, h: stage.clientHeight },
      );
    });
  };

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      apply((v) => zoomAt(v, v.scale * Math.exp(-e.deltaY * 0.0015), p), false);
    }
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  });

  function tap(e: React.PointerEvent) {
    const onContent = e.target instanceof Node && contentRef.current?.contains(e.target);
    if (!onContent && viewRef.current.scale === 1) return onBackdropTap();
    const p = local(e.clientX, e.clientY);
    apply((v) => (v.scale > 1 ? FIT : zoomAt(v, TAP_SCALE, p)), true);
  }

  return {
    view,
    animate,
    handlers: usePointerHandlers(viewRef, apply, local, tap),
    zoomBy: (factor: number) => apply((v) => zoomAt(v, v.scale * factor, { x: 0, y: 0 }), true),
    reset: () => apply(() => FIT, true),
  };
}

const spread = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** One finger or mouse pans (when zoomed) or taps; two fingers pinch. */
function usePointerHandlers(
  viewRef: RefObject<View>,
  apply: Apply,
  local: (clientX: number, clientY: number) => Point,
  tap: (e: React.PointerEvent) => void,
) {
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  return {
    onPointerDown(e: React.PointerEvent) {
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.current.values()];
      if (pts.length === 1) gesture.current = { moved: 0, pinch: null };
      if (pts.length === 2 && gesture.current) {
        gesture.current.pinch = { dist: spread(pts[0], pts[1]), scale: viewRef.current.scale };
      }
    },
    onPointerMove(e: React.PointerEvent) {
      const prev = pointers.current.get(e.pointerId);
      const g = gesture.current;
      if (!prev || !g) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      g.moved += Math.abs(dx) + Math.abs(dy);
      const pts = [...pointers.current.values()];
      if (pts.length >= 2 && g.pinch) {
        const { dist, scale } = g.pinch;
        const mid = local((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
        apply((v) => zoomAt(v, (scale * spread(pts[0], pts[1])) / dist, mid), false);
      } else if (viewRef.current.scale > 1) {
        apply((v) => ({ ...v, x: v.x + dx, y: v.y + dy }), false);
      }
    },
    onPointerUp(e: React.PointerEvent) {
      pointers.current.delete(e.pointerId);
      const g = gesture.current;
      if (pointers.current.size > 0 || !g) return;
      gesture.current = null;
      if (g.moved < TAP_SLOP && !g.pinch) tap(e);
    },
    onPointerCancel(e: React.PointerEvent) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size === 0) gesture.current = null;
    },
  };
}
