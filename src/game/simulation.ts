import {
  AI_DIFFICULTY_PRESETS,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_SPEEDUP,
  BALL_START_SPEED,
  DEFAULT_MATCH_CONFIG,
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
import type { BallState, Difficulty, EffectEvent, InputAction, MatchConfig, MatchState, PaddleState, Side } from "./types";

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

export function createMatchState(config: MatchConfig = DEFAULT_MATCH_CONFIG): MatchState {
  const serveSide: Side = Math.random() > 0.5 ? "left" : "right";
  return {
    phase: "ready",
    config,
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
    hitStopRemaining: 0,
    stats: {
      elapsedSeconds: 0,
      longestRally: 0,
      totalHits: 0
    }
  };
}

export function startMatch(match: MatchState, config: MatchConfig = match.config): void {
  match.config = config;
  match.scores.left = 0;
  match.scores.right = 0;
  match.winner = undefined;
  match.stats.elapsedSeconds = 0;
  match.stats.longestRally = 0;
  match.stats.totalHits = 0;
  resetRound(match, match.serveSide);
  match.phase = "countdown";
}

export function finishCountdown(match: MatchState): void {
  if (match.phase === "countdown") {
    match.phase = "playing";
  }
}

export function restartMatch(match: MatchState, config: MatchConfig = match.config): void {
  const fresh = createMatchState(config);
  Object.assign(match, fresh);
  startMatch(match, config);
}

export function togglePause(match: MatchState): void {
  if (match.phase === "playing" || match.phase === "countdown") {
    match.pauseReturnPhase = match.phase;
    match.phase = "paused";
    return;
  }

  if (match.phase === "paused") {
    match.phase = match.pauseReturnPhase ?? "playing";
    match.pauseReturnPhase = undefined;
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
  if (match.phase !== "playing" && match.phase !== "countdown") {
    return [];
  }

  const effects: EffectEvent[] = [];
  const dt = clamp(dtSeconds, 0, 1 / 30);

  updatePaddles(match, input, dt);

  if (match.phase === "countdown") {
    return effects;
  }

  match.stats.elapsedSeconds += dt;

  if (match.hitStopRemaining > 0) {
    match.hitStopRemaining = Math.max(0, match.hitStopRemaining - dt);
    return effects;
  }

  updateBall(match, dt, effects);

  return effects;
}

function updatePaddles(match: MatchState, input: InputAction, dt: number): void {
  updatePlayerPaddle(match.paddles.left, input.leftDirection, input.leftTargetY, dt);

  if (match.config.mode === "twoPlayer") {
    updatePlayerPaddle(match.paddles.right, input.rightDirection, input.rightTargetY, dt);
  } else {
    updateAiPaddle(match.paddles.right, match.ball, match.rally, match.config.difficulty, dt);
  }
}

function updatePlayerPaddle(paddle: PaddleState, direction: -1 | 0 | 1, targetY: number | undefined, dt: number): void {
  const previousY = paddle.y;

  if (direction !== 0) {
    paddle.y += direction * PLAYER_SPEED * dt;
  } else if (targetY !== undefined) {
    const clampedTargetY = clamp(targetY, WALL_TOP + paddle.height / 2, WALL_BOTTOM - paddle.height / 2);
    const delta = clampedTargetY - paddle.y;
    const maxStep = PLAYER_SPEED * dt;
    paddle.y += clamp(delta, -maxStep, maxStep);
  }

  paddle.y = clamp(paddle.y, WALL_TOP + paddle.height / 2, WALL_BOTTOM - paddle.height / 2);
  paddle.velocityY = (paddle.y - previousY) / Math.max(dt, 0.0001);
}

function updateAiPaddle(paddle: PaddleState, ball: BallState, rally: number, difficulty: Difficulty, dt: number): void {
  const previousY = paddle.y;
  const preset = AI_DIFFICULTY_PRESETS[difficulty];
  const isThreatened = ball.vx > 0;
  const predictedY = predictBallY(ball, paddle.x);
  const pressure = clamp(ball.speed / BALL_MAX_SPEED, 0, 1);
  const predictionError =
    Math.sin(ball.x * 0.027 + ball.y * 0.014 + ball.spin * 1.8 + rally * 0.41) *
    preset.predictionError *
    (0.74 + pressure * 0.48);
  const targetY = isThreatened ? predictedY + predictionError : FIELD_CENTER_Y;
  const error = targetY - paddle.y;

  if (Math.abs(error) > preset.deadZone) {
    const reaction = isThreatened ? preset.reaction * (0.7 + (1 - pressure) * 0.14) : preset.reaction * 0.48;
    const easedStep = error * Math.min(1, reaction * dt);
    paddle.y += clamp(easedStep, -preset.speed * dt, preset.speed * dt);
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
  match.stats.totalHits += 1;
  match.stats.longestRally = Math.max(match.stats.longestRally, match.rally);
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
  match.phase = "countdown";
}
