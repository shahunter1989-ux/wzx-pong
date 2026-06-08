export type ArenaAsset = {
  key: string;
  label: string;
  url: string;
  leftColor: number;
  rightColor: number;
};

export type BallAsset = {
  key: string;
  label: string;
  url: string;
};

export type IntroAsset = {
  key: string;
  url: string;
};

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const INTRO_ASSET: IntroAsset = {
  key: "wzx-intro",
  url: assetUrl("assets/optimized/intro/wzx-intro.jpg")
};

export const ARENAS: ArenaAsset[] = [
  {
    key: "arena-cyan-tech",
    label: "Cyan Tech",
    url: assetUrl("assets/optimized/arenas/arena-cyan-tech.jpg"),
    leftColor: 0x18c8ff,
    rightColor: 0x18c8ff
  },
  {
    key: "arena-pink-cyan-grid",
    label: "Pink Cyan Grid",
    url: assetUrl("assets/optimized/arenas/arena-pink-cyan-grid.jpg"),
    leftColor: 0x1fd4ff,
    rightColor: 0xff45c9
  },
  {
    key: "arena-green-cyan",
    label: "Green Cyan",
    url: assetUrl("assets/optimized/arenas/arena-green-cyan.jpg"),
    leftColor: 0x7cff4c,
    rightColor: 0x28f0ff
  },
  {
    key: "arena-retro-horizon",
    label: "Retro Horizon",
    url: assetUrl("assets/optimized/arenas/arena-retro-horizon.jpg"),
    leftColor: 0xff3dcc,
    rightColor: 0x438dff
  },
  {
    key: "retro-arena-01",
    label: "Retro Sunset",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-01.jpg"),
    leftColor: 0xff3dcc,
    rightColor: 0x38d9ff
  },
  {
    key: "retro-arena-02",
    label: "Pixel Orbit",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-02.jpg"),
    leftColor: 0x2f6dff,
    rightColor: 0xff4ac8
  },
  {
    key: "retro-arena-03",
    label: "Neon Diner",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-03.jpg"),
    leftColor: 0x3eefff,
    rightColor: 0xff5d7c
  },
  {
    key: "retro-arena-04",
    label: "Memphis Pop",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-04.jpg"),
    leftColor: 0x46ead7,
    rightColor: 0xff4f9a
  },
  {
    key: "retro-arena-05",
    label: "Comic Burst",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-05.jpg"),
    leftColor: 0xff3aa8,
    rightColor: 0x25c8ff
  },
  {
    key: "retro-arena-06",
    label: "Bot Circuit",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-06.jpg"),
    leftColor: 0x2a9cff,
    rightColor: 0xff7ac8
  },
  {
    key: "retro-arena-07",
    label: "VHS Frame",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-07.jpg"),
    leftColor: 0x3d6dff,
    rightColor: 0xff35d6
  },
  {
    key: "retro-arena-08",
    label: "Arcade Rails",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-08.jpg"),
    leftColor: 0x2697ff,
    rightColor: 0xff3ccc
  },
  {
    key: "retro-arena-09",
    label: "Neon Mixtape",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-09.jpg"),
    leftColor: 0x37f4ff,
    rightColor: 0xff45d3
  },
  {
    key: "retro-arena-10",
    label: "Miami Night",
    url: assetUrl("assets/optimized/arenas/retro/retro-arena-10.jpg"),
    leftColor: 0xff45b8,
    rightColor: 0x32c8ff
  }
];

export const BALLS: BallAsset[] = [
  {
    key: "wzx-ball",
    label: "WZX Core",
    url: assetUrl("assets/optimized/ball/wzx-ball.png")
  },
  ...Array.from({ length: 10 }, (_, index) => {
    const id = index + 1;
    const padded = String(id).padStart(2, "0");
    return {
      key: `retro-ball-${padded}`,
      label: `Retro Ball ${id}`,
      url: assetUrl(`assets/optimized/ball/retro/retro-ball-${padded}.png`)
    };
  })
];

export function getRandomArena(previousKey?: string): ArenaAsset {
  const candidates = ARENAS.filter((arena) => arena.key !== previousKey);
  const pool = candidates.length > 0 ? candidates : ARENAS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomBall(previousKey?: string): BallAsset {
  const candidates = BALLS.filter((ball) => ball.key !== previousKey);
  const pool = candidates.length > 0 ? candidates : BALLS;
  return pool[Math.floor(Math.random() * pool.length)];
}
