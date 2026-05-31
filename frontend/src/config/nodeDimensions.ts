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
    width:      220,
    height:      44,
    lrRanksep:   50,
    lrNodesep:   16,
    tbRanksep:   32,
    tbNodesep:   20,
  },
  comfortable: {
    width:      320,
    height:      90,
    lrRanksep:   64,
    lrNodesep:   20,
    tbRanksep:   40,
    tbNodesep:   24,
  },
};
