export type DisplayMode = 'compact' | 'comfortable';

export const NODE_DIMS: Record<DisplayMode, {
  width: number;
  height: number;
  ranksep: number;
  nodesep: number;
}> = {
  compact: {
    width:   220,
    height:  44,   // header row only: min-h-[40px] + border
    ranksep: 50,
    nodesep: 16,
  },
  comfortable: {
    width:   320,
    height:  68,   // header row with 2-line wrapped title
    ranksep: 64,
    nodesep: 20,
  },
};
