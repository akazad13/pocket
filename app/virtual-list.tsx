'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateVirtualSlice } from '@/lib/virtual';

export type VirtualListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  estimateItemHeight?: number;
  overscan?: number;
  threshold?: number;
  className?: string;
};

export function VirtualList<T>({
  items,
  renderItem,
  keyExtractor,
  estimateItemHeight = 62,
  overscan = 12,
  threshold = 40,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [slice, setSlice] = useState(() =>
    calculateVirtualSlice({
      totalCount: items.length,
      itemHeight: estimateItemHeight,
      offsetY: 0,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
      overscan,
    })
  );

  const updateSlice = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetY = Math.max(0, -rect.top);
    const viewportHeight = window.innerHeight;

    setSlice(
      calculateVirtualSlice({
        totalCount: items.length,
        itemHeight: estimateItemHeight,
        offsetY,
        viewportHeight,
        overscan,
      })
    );
  }, [items.length, estimateItemHeight, overscan]);

  useEffect(() => {
    if (items.length <= threshold) return;

    let rafId: number | null = null;
    const handleScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        updateSlice();
        rafId = null;
      });
    };

    updateSlice();
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [items.length, threshold, updateSlice]);

  // For small collections, render straightforward list without virtual spacer blocks
  if (items.length <= threshold) {
    return (
      <div className={`virtual-list-container ${className}`}>
        {items.map((item, index) => (
          <div key={keyExtractor(item, index)} className="virtual-row-wrapper">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  const visibleItems = items.slice(slice.startIndex, slice.endIndex);

  return (
    <div
      ref={containerRef}
      className={`virtual-list-container is-virtualized ${className}`}
      style={{ minHeight: slice.totalHeight }}
    >
      {slice.topPadding > 0 && (
        <div
          className="virtual-spacer top"
          style={{ height: slice.topPadding }}
          aria-hidden="true"
        />
      )}
      <div className="virtual-list-content">
        {visibleItems.map((item, i) => {
          const actualIndex = slice.startIndex + i;
          return (
            <div
              key={keyExtractor(item, actualIndex)}
              className="virtual-row-wrapper"
              style={{ containIntrinsicSize: `auto none auto ${estimateItemHeight}px` }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
      {slice.bottomPadding > 0 && (
        <div
          className="virtual-spacer bottom"
          style={{ height: slice.bottomPadding }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
