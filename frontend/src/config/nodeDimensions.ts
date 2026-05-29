export type DisplayMode = 'compact' | 'comfortable';

export const NODE_DIMS: Record<DisplayMode, {
  width: number;
  height: number;
  ranksep: number;
  nodesep: number;
}> = {
  compact: {
    width:   220,
    height:  52,
    ranksep: 50,
    nodesep: 14,
  },
  comfortable: {
    width:   320,
    height:  88,   // generous to absorb 2-line wrapped titles
    ranksep: 64,
    nodesep: 22,
  },
};
