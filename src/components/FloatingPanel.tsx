'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const EDGE = 8;

interface FloatingPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  /** Side of the anchor to prefer; flips when the viewport has no room there. */
  placement?: 'top' | 'bottom';
  /** Which anchor edge the panel lines up with. */
  align?: 'start' | 'end';
  className?: string;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

/**
 * Renders a menu or tooltip in document.body with fixed positioning, so cards with
 * overflow-hidden and scrolling tables never clip it. Follows the anchor on scroll
 * and resize, flips to the other side when needed, and stays inside the viewport.
 */
export function FloatingPanel({
  anchorRef,
  open,
  placement = 'bottom',
  align = 'start',
  className = '',
  panelRef,
  children,
}: FloatingPanelProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const ref = panelRef ?? innerRef;
  const [style, setStyle] = useState<React.CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const anchor = anchorRef.current;
      const panel = ref.current;
      if (!anchor || !panel) return;

      const a = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = panel.offsetWidth;
      const height = panel.scrollHeight;

      const below = vh - a.bottom - GAP - EDGE;
      const above = a.top - GAP - EDGE;
      const side =
        placement === 'bottom'
          ? height <= below || below >= above ? 'bottom' : 'top'
          : height <= above || above >= below ? 'top' : 'bottom';
      const room = Math.max(side === 'bottom' ? below : above, 80);
      const shown = Math.min(height, room);

      const top = side === 'bottom' ? a.bottom + GAP : a.top - GAP - shown;
      let left = align === 'end' ? a.right - width : a.left;
      left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - width - EDGE));

      setStyle({ position: 'fixed', top, left, maxHeight: room, overflowY: 'auto', visibility: 'visible' });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef, ref, placement, align]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={ref} style={style} className={`z-[60] ${className}`}>
      {children}
    </div>,
    document.body
  );
}
