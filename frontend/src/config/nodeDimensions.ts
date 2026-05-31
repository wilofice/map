export type DisplayMode = 'compact' | 'comfortable';
export type LayoutDir  = 'LR' | 'RL' | 'TB';

export const NODE_DIMS: Record<DisplayMode, {
  width: number;
  height: number;
  lrRanksep: number;  // horizontal gap between levels (LR)
  lrNodesep: number;  // vertical gap between siblings (LR)
  tbRanksep: number;  // vertical gap between levels (TB)
  tbNodesep: number;  // horizontal gap between siblings (TB)
}> = {
  compact: {
    width:      240,
    height:      60,
    lrRanksep:   55,
    lrNodesep:   18,
    tbRanksep:   36,
    tbNodesep:   22,
  },
  comfortable: {
    width:      340,
    height:     116,
    lrRanksep:   72,
    lrNodesep:   24,
    tbRanksep:   48,
    tbNodesep:   28,
  },
};
