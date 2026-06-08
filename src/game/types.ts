export type Side = "left" | "right";

export type GameMode = "ai" | "twoPlayer";

export type Difficulty = "easy" | "normal" | "hard";

export type MatchPhase = "ready" | "countdown" | "playing" | "paused" | "gameOver";

export type MatchConfig = {
  mode: GameMode;
  difficulty: Difficulty;
};

export type PaddleState = {
  side: Side;
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
};

export type BallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  spin: number;
};

export type MatchState = {
  phase: MatchPhase;
  pauseReturnPhase?: "countdown" | "playing";
  config: MatchConfig;
  paddles: Record<Side, PaddleState>;
  ball: BallState;
  scores: Record<Side, number>;
  scoreLimit: number;
  rally: number;
  serveSide: Side;
  winner?: Side;
  hitStopRemaining: number;
  stats: MatchStats;
};

export type MatchStats = {
  elapsedSeconds: number;
  longestRally: number;
  totalHits: number;
};

export type InputAction = {
  leftDirection: -1 | 0 | 1;
  leftTargetY?: number;
  rightDirection: -1 | 0 | 1;
  rightTargetY?: number;
};

export type EffectEvent =
  | {
      type: "paddle-hit";
      side: Side;
      x: number;
      y: number;
      intensity: number;
    }
  | {
      type: "wall-bounce";
      x: number;
      y: number;
    }
  | {
      type: "score";
      side: Side;
    };
