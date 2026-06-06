import {
  AI_DEAD_ZONE,
  AI_REACTION,
  AI_SPEED,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_SPEEDUP,
  BALL_START_SPEED,
  FIELD_CENTER_X,
  FIELD_CENTER_Y,
  FIELD_WIDTH,
  HIT_STOP_SECONDS,
  MAX_BOUNCE_ANGLE,
  PADDLE_HEIGHT,
  PADDLE_INSET,
  PADDLE_WIDTH,
  PLAYER_SPEED,
  SCORE_LIMIT,
  WALL_BOTTOM,
  WALL_TOP
} from "./constants";
import type { BallState, EffectEvent, InputAction, MatchState, PaddleState, Side } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const signForSide = (side: Side) => (side === "left" ? 1 : -1);

function createPaddle(side: Side): PaddleState {
  return {
    side,
    x: side === "left" ? PADDLE_INSET : FIELD_WIDTH - PADDLE_INSET,
    y: FIELD_CENTER_Y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    velocityY: 0
  };
}

function createServedBall(serveSide: Side): BallState {
  const baseAngle = (Math.random() * 0.55 - 0.275) * Math.PI;
  const direction = signForSide(serveSide);
  return {
    x: FIELD_CENTER_X,
    y: FIELD_CENTER_Y,
    vx: Math.cos(baseAngle) * BALL_START_SPEED * direction,
    vy: Math.sin(baseAngle) * BALL_START_SPEED,
    speed: BALL_START_SPEED,
    radius: BALL_RADIUS,
    spin: direction * 0.55
  };
}

export function createMatchState(): MatchState {
  const serveSide: Side = Math.random() > 0.5 ? "left" : "right";
  return {
    phase: "ready",
    paddles: {
      left: createPaddle("left"),
      right: createPaddle("right")
    },
    ball: createServedBall(serveSide),
    scores: {
      left: 0,
      right: 0
    },
    scoreLimit: SCORE_LIMIT,
    rally: 0,
    serveSide,
    hitStopRemaining: 0
  };
}

export function startMatch(match: MatchState): void {
  match.phase = "playing";
  resetRound(match, match.serveSide);
}

export function restartMatch(match: MatchState): void {
  const fresh = createMatchState();
  Object.assign(match, fresh);
  startMatch(match);
}

export function togglePause(match: MatchState): void {
  if (match.phase === "playing") {
    match.phase = "paused";
    return;
  }

  if (match.phase === "paused") {
    match.phase = "playing";
  }
}

export function resetRound(match: MatchState, serveSide: Side): void {
  match.paddles.left.y = FIELD_CENTER_Y;
  match.paddles.right.y = FIELD_CENTER_Y;
  match.paddles.left.velocityY = 0;
  match.paddles.right.velocityY = 0;
  match.ball = createServedBall(serveSide);
  match.serveSide = serveSide;
  match.rally = 0;
  match.hitStopRemaining = 0;
}

export function stepMatch(match: MatchState, input: InputAction, dtSeconds: number): EffectEvent[] {
  if (match.phase !== "playing") {
    return [];
  }

  const effects: EffectEvent[] = [];
  const dt = clamp(dtSeconds, 0, 1 / 30);

  if (match.hitStopRemaining > 0) {
    match.hitStopRemaining = Math.max(0, match.hitStopRemaining - dt);
    return effects;
  }

  updatePlayerPaddle(match.paddles.left, input, dt);
  updateAiPaddle(match.paddles.right, match.ball, dt);
  updateBall(match, dt, effects);

  return effects;
}

function updatePlayerPaddle(paddle: PaddleState, input: InputAction, dt: number): void {
  const previousY = paddle.y;

  if (input.playerDirection !== 0) {
    paddle.y += input.playerDirection * PLAYER_SPEED * dt;
  } else if (input.playerTargetY !== undefined) {
    const targetY = clamp(input.playerTargetY, WALL_TOP + paddle.height / 2, WALL_BOTTOM - paddle.height / 2);
    const delta = targetY - paddle.y;
    const maxStep = PLAYER_SPEED * dt;
    paddle.y += clamp(delta, -maxStep, maxStep);
  }

  paddle.y = clamp(paddle.y, WALL_TOP + paddle.height / 2, WALL_BOTTOM - paddle.height / 2);
  paddle.velocityY = (paddle.y - previousY) / Math.max(dt, 0.0001);
}

function updateAiPaddle(paddle: PaddleState, ball: BallState, dt: number): void {
  const previousY = paddle.y;
  const isThreatened = ball.vx > 0;
  const predictedY = predictBallY(ball, paddle.x);
  const targetY = isThreatened ? predictedY : FIELD_CENTER_Y;
  const error = targetY - paddle.y;

  if (Math.abs(error) > AI_DEAD_ZONE) {
    const easedStep = error * Math.min(1, AI_REACTION * dt);
    paddle.y += clamp(easedStep, -AI_SPEED * dt, AI_SPEED * dt);
  }

  paddle.y = clamp(paddle.y, WALL_TOP + paddle.height / 2, WALL_BOTTOM - paddle.height / 2);
  paddle.velocityY = (paddle.y - previousY) / Math.max(dt, 0.0001);
}

function predictBallY(ball: BallState, targetX: number): number {
  if (ball.vx <= 0) {
    return FIELD_CENTER_Y;
  }

  const time = (targetX - ball.x) / ball.vx;
  let projectedY = ball.y + ball.vy * Math.max(0, time) * 0.82;
  const playableHeight = WALL_BOTTOM - WALL_TOP;

  while (projectedY < WALL_TOP || projectedY > WALL_BOTTOM) {
    if (projectedY < WALL_TOP) {
      projectedY = WALL_TOP + (WALL_TOP - projectedY);
    }
    if (projectedY > WALL_BOTTOM) {
      projectedY = WALL_BOTTOM - (projectedY - WALL_BOTTOM);
    }
    projectedY = WALL_TOP + ((projectedY - WALL_TOP) % playableHeight);
  }

  return projectedY;
}

function updateBall(match: MatchState, dt: number, effects: EffectEvent[]): void {
  const ball = match.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y - ball.radius <= WALL_TOP) {
    ball.y = WALL_TOP + ball.radius;
    ball.vy = Math.abs(ball.vy);
    effects.push({ type: "wall-bounce", x: ball.x, y: ball.y });
  } else if (ball.y + ball.radius >= WALL_BOTTOM) {
    ball.y = WALL_BOTTOM - ball.radius;
    ball.vy = -Math.abs(ball.vy);
    effects.push({ type: "wall-bounce", x: ball.x, y: ball.y });
  }

  resolvePaddleCollision(match, "left", effects);
  resolvePaddleCollision(match, "right", effects);

  if (ball.x + ball.radius < 0) {
    awardPoint(match, "right", effects);
  } else if (ball.x - ball.radius > FIELD_WIDTH) {
    awardPoint(match, "left", effects);
  }
}

function resolvePaddleCollision(match: MatchState, side: Side, effects: EffectEvent[]): void {
  const ball = match.ball;
  const paddle = match.paddles[side];
  const movingToward = side === "left" ? ball.vx < 0 : ball.vx > 0;

  if (!movingToward) {
    return;
  }

  const halfW = paddle.width / 2;
  const halfH = paddle.height / 2;
  const paddleLeft = paddle.x - halfW;
  const paddleRight = paddle.x + halfW;
  const paddleTop = paddle.y - halfH;
  const paddleBottom = paddle.y + halfH;
  const overlapsX = ball.x + ball.radius >= paddleLeft && ball.x - ball.radius <= paddleRight;
  const overlapsY = ball.y + ball.radius >= paddleTop && ball.y - ball.radius <= paddleBottom;

  if (!overlapsX || !overlapsY) {
    return;
  }

  const impactOffset = clamp((ball.y - paddle.y) / halfH, -1, 1);
  const angle = impactOffset * MAX_BOUNCE_ANGLE;
  const newSpeed = Math.min(BALL_MAX_SPEED, ball.speed * BALL_SPEEDUP);
  const direction = signForSide(side);
  ball.speed = newSpeed;
  ball.vx = Math.cos(angle) * newSpeed * direction;
  ball.vy = Math.sin(angle) * newSpeed + paddle.velocityY * 0.16;
  ball.spin = impactOffset * 2.3 + paddle.velocityY / 1500;
  ball.x = side === "left" ? paddleRight + ball.radius : paddleLeft - ball.radius;
  match.rally += 1;
  match.hitStopRemaining = HIT_STOP_SECONDS;

  effects.push({
    type: "paddle-hit",
    side,
    x: side === "left" ? paddleRight : paddleLeft,
    y: ball.y,
    intensity: Math.min(1, 0.45 + match.rally * 0.035)
  });
}

function awardPoint(match: MatchState, side: Side, effects: EffectEvent[]): void {
  match.scores[side] += 1;
  effects.push({ type: "score", side });

  if (match.scores[side] >= match.scoreLimit) {
    match.phase = "gameOver";
    match.winner = side;
    return;
  }

  resetRound(match, side === "left" ? "right" : "left");
}
