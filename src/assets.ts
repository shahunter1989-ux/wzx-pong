export type ArenaAsset = {
  key: string;
  label: string;
  url: string;
  leftColor: number;
  rightColor: number;
};

export const ARENAS: ArenaAsset[] = [
  {
    key: "arena-cyan-tech",
    label: "Cyan Tech",
    url: "/assets/arenas/arena-cyan-tech.png",
    leftColor: 0x18c8ff,
    rightColor: 0x18c8ff
  },
  {
    key: "arena-pink-cyan-grid",
    label: "Pink Cyan Grid",
    url: "/assets/arenas/arena-pink-cyan-grid.png",
    leftColor: 0x1fd4ff,
    rightColor: 0xff45c9
  },
  {
    key: "arena-green-cyan",
    label: "Green Cyan",
    url: "/assets/arenas/arena-green-cyan.png",
    leftColor: 0x7cff4c,
    rightColor: 0x28f0ff
  },
  {
    key: "arena-retro-horizon",
    label: "Retro Horizon",
    url: "/assets/arenas/arena-retro-horizon.png",
    leftColor: 0xff3dcc,
    rightColor: 0x438dff
  }
];

export const BALL_ASSET = {
  key: "wzx-ball",
  url: "/assets/ball/wzx-ball.png"
};

export function getRandomArena(previousKey?: string): ArenaAsset {
  const candidates = ARENAS.filter((arena) => arena.key !== previousKey);
  const pool = candidates.length > 0 ? candidates : ARENAS;
  return pool[Math.floor(Math.random() * pool.length)];
}
