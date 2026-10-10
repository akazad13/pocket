export type VirtualSliceConfig = {
  totalCount: number;
  itemHeight: number;
  offsetY: number;
  viewportHeight: number;
  overscan?: number;
};

export type VirtualSliceResult = {
  startIndex: number;
  endIndex: number;
  topPadding: number;
  bottomPadding: number;
  totalHeight: number;
  visibleCount: number;
};

export function calculateVirtualSlice({
  totalCount,
  itemHeight,
  offsetY,
  viewportHeight,
  overscan = 10,
}: VirtualSliceConfig): VirtualSliceResult {
  if (totalCount <= 0 || itemHeight <= 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topPadding: 0,
      bottomPadding: 0,
      totalHeight: 0,
      visibleCount: 0,
    };
  }

  const totalHeight = totalCount * itemHeight;
  const safeOffset = Math.max(0, offsetY);

  const rawStart = Math.floor(safeOffset / itemHeight);
  const rawEnd = Math.ceil((safeOffset + viewportHeight) / itemHeight);

  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(totalCount, Math.max(startIndex, rawEnd + overscan));

  const topPadding = startIndex * itemHeight;
  const bottomPadding = Math.max(0, (totalCount - endIndex) * itemHeight);
  const visibleCount = Math.max(0, endIndex - startIndex);

  return {
    startIndex,
    endIndex,
    topPadding,
    bottomPadding,
    totalHeight,
    visibleCount,
  };
}
