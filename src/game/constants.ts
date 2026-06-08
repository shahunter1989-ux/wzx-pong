import type { Difficulty, MatchConfig } from "./types";

export const FIELD_WIDTH = 540;
export const FIELD_HEIGHT = 960;
export const WALL_TOP = 43;
export const WALL_BOTTOM = FIELD_HEIGHT - 43;
export const FIELD_CENTER_X = FIELD_WIDTH / 2;
export const FIELD_CENTER_Y = FIELD_HEIGHT / 2;

export const SCORE_LIMIT = 7;
export const PADDLE_WIDTH = 16;
export const PADDLE_HEIGHT = 114;
export const PADDLE_INSET = 55;
export const PLAYER_SPEED = 612;
export const AI_SPEED = 348;
export const AI_REACTION = 4.15;
export const AI_DEAD_ZONE = 34;
export const AI_PREDICTION_ERROR = 76;

export type AiDifficultyPreset = {
  speed: number;
  reaction: number;
  deadZone: number;
  predictionError: number;
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mode: "ai",
  difficulty: "normal"
};

export const AI_DIFFICULTY_PRESETS: Record<Difficulty, AiDifficultyPreset> = {
  easy: {
    speed: 318,
    reaction: 3.55,
    deadZone: 42,
    predictionError: 96
  },
  normal: {
    speed: AI_SPEED,
    reaction: AI_REACTION,
    deadZone: AI_DEAD_ZONE,
    predictionError: AI_PREDICTION_ERROR
  },
  hard: {
    speed: 438,
    reaction: 6.2,
    deadZone: 18,
    predictionError: 38
  }
};

export const BALL_RADIUS = 23;
export const BALL_START_SPEED = 351;
export const BALL_MAX_SPEED = 624;
export const BALL_SPEEDUP = 1.045;
export const MAX_BOUNCE_ANGLE = Math.PI * 0.36;
export const HIT_STOP_SECONDS = 0.045;
