export type Side = "left" | "right";

export type MatchPhase = "ready" | "playing" | "paused" | "gameOver";

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
  paddles: Record<Side, PaddleState>;
  ball: BallState;
  scores: Record<Side, number>;
  scoreLimit: number;
  rally: number;
  serveSide: Side;
  winner?: Side;
  hitStopRemaining: number;
};

export type InputAction = {
  playerDirection: -1 | 0 | 1;
  playerTargetY?: number;
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
