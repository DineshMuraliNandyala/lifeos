// Domain types for LifeOS. These mirror the Dexie table shapes 1:1 so the
// rest of the app never has to guess what a record looks like.
// `id` fields are Dexie auto-increment numbers unless noted otherwise.

export type ISODate = string; // "YYYY-MM-DD" — local calendar day, no time component
export type ISODateTime = string; // full ISO timestamp

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// ---------------------------------------------------------------------------
// Settings & setup wizard
// ---------------------------------------------------------------------------

export interface Settings {
  id: number; // always 1 — singleton row
  onboardingComplete: boolean;
  displayName: string | null;
  theme: "dark" | "amoled" | "light";
  accentDomain: "focus" | "energy" | "calm";

  // ── LeetCode ────────────────────────────────────────────────────────────
  leetcodeUsername: string | null;
  /**
   * LEETCODE_SESSION token — set by the login proxy (POST /auth/leetcode).
   * The user enters email + password in-app; the Worker authenticates and
   * returns only this token. Password is never stored anywhere.
   */
  leetcodeSession: string | null;
  /** True while the session token is believed to be valid. */
  leetcodeConnected: boolean;
  /** ISO timestamp of when the session was last refreshed. */
  leetcodeSessionExpiry: ISODateTime | null;

  // ── Google Fit (Android step sync) ──────────────────────────────────────
  /**
   * Google OAuth 2.0 access token for Fitness API (fitness.activity.read).
   * Fetched via browser OAuth redirect. Expires after ~1 hour.
   */
  googleFitToken: string | null;
  googleFitTokenExpiry: ISODateTime | null;
  /**
   * Refresh token — used to silently get a new access token.
   * Google only issues this on the first authorization (prompt=consent).
   */
  googleFitRefreshToken: string | null;
  /** True while connected and token is valid / can be refreshed. */
  googleFitConnected: boolean;

  // ── Goals ────────────────────────────────────────────────────────────────
  weeklyCodingGoal: number; // problems/week
  dailyCodingGoalMinutes: number;
  proteinGoalGrams: number;
  waterGoalMl: number;
  stepGoal: number;

  // ── Misc ─────────────────────────────────────────────────────────────────
  healthConnectLinked: boolean;
  notificationsEnabled: boolean;
  reminderTimes: {
    morning: string | null; // "HH:mm"
    evening: string | null;
    gym: string | null;
    walking: string | null;
    protein: string | null;
  };
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}


// ---------------------------------------------------------------------------
// Daily goals (custom, unlimited)
// ---------------------------------------------------------------------------

export interface DailyGoal {
  id?: number;
  title: string;
  icon: string; // lucide icon name
  color: string; // hex
  weekdays: Weekday[];
  reminderTime: string | null;
  archived: boolean;
  createdAt: ISODateTime;
}

export interface DailyGoalCompletion {
  id?: number;
  goalId: number;
  date: ISODate;
  completed: boolean;
  completedAt: ISODateTime | null;
}

// ---------------------------------------------------------------------------
// Hobbies
// ---------------------------------------------------------------------------

export interface Hobby {
  id?: number;
  name: string;
  icon: string;
  color: string;
  weekdays: Weekday[];
  goalMinutes: number;
  reminderTime: string | null;
  archived: boolean;
  createdAt: ISODateTime;
}

export interface HobbyLog {
  id?: number;
  hobbyId: number;
  date: ISODate;
  minutes: number;
  note: string | null;
}

// ---------------------------------------------------------------------------
// Gym planner
// ---------------------------------------------------------------------------

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: string; // e.g. "Back", "Shoulders"
  weekday: Weekday; // which planned workout day this belongs to
  targetSets: number;
  targetReps: string; // "8-10", "AMRAP", etc — kept as string for flexibility
  currentPR: number | null; // kg
  bestPR: number | null; // kg
  notes: string | null;
  order: number;
  archived: boolean;
  createdAt: ISODateTime;
}

export interface ExerciseSetLog {
  id?: number;
  exerciseId: number;
  date: ISODate;
  setNumber: number;
  weightKg: number;
  reps: number;
  isPR: boolean;
}

export interface WorkoutSession {
  id?: number;
  date: ISODate;
  weekday: Weekday;
  startedAt: ISODateTime;
  completedAt: ISODateTime | null;
  durationMinutes: number | null;
  totalVolumeKg: number | null;
  newPRCount: number;
}

// ---------------------------------------------------------------------------
// Fitness: protein / water / steps
// ---------------------------------------------------------------------------

export interface ProteinLog {
  id?: number;
  date: ISODate;
  grams: number;
  loggedAt: ISODateTime;
}

export interface WaterLog {
  id?: number;
  date: ISODate;
  ml: number;
  loggedAt: ISODateTime;
}

// Cached read from Android Health Connect. Source of truth stays on-device;
// this table is just what LifeOS has last synced, so the UI works offline.
export interface StepReading {
  id?: number;
  date: ISODate;
  steps: number;
  distanceMeters?: number | null;
  calories?: number | null;
  syncedAt?: ISODateTime;
  source: "health_connect" | "manual" | "google_fit";
}

// ---------------------------------------------------------------------------
// Placement: LeetCode problem database + revision engine
// ---------------------------------------------------------------------------

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Problem {
  id?: number;
  number: number | null; // LeetCode problem number, null for non-LC entries
  title: string;
  difficulty: Difficulty;
  topics: string[];
  notes: string | null;
  approach: string | null;
  mistakes: string | null;
  solvedDate: ISODate;
  source: "leetcode_sync" | "manual";
  leetcodeSlug: string | null;
}

export type RevisionStage = 0 | 1 | 2 | 3 | 4; // index into [1d, 3d, 7d, 14d, 30d]
export const SPACED_REPETITION_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

export interface SpacedRevision {
  id?: number;
  problemId: number;
  stage: RevisionStage;
  dueDate: ISODate;
  lastReviewedAt: ISODateTime | null;
  history: Array<{ date: ISODateTime; result: "easy" | "hard" | "forgot" }>;
}

export interface WeeklyRevisionList {
  id?: number;
  weekStart: ISODate; // Monday of the ISO week
  problemIds: number[];
  createdAt: ISODateTime;
  completedProblemIds: number[];
}

export interface MonthlyRevisionList {
  id?: number;
  month: string; // "YYYY-MM"
  problemIds: number[];
  createdAt: ISODateTime;
  completedProblemIds: number[];
}

// ---------------------------------------------------------------------------
// Notes: daily journal + knowledge base
// ---------------------------------------------------------------------------

export interface JournalEntry {
  id?: number;
  date: ISODate;
  reflectionMarkdown: string;
  systemDesignTopic: string | null;
  mood: "great" | "good" | "okay" | "low" | "rough" | null;
  photoIds: string[]; // references into an in-memory/blob store, not used yet
}

export type NoteCategory = "Algorithms" | "System Design" | "Interview" | "Gym" | "Life" | string;

export interface Note {
  id?: number;
  title: string;
  category: NoteCategory;
  bodyMarkdown: string;
  tags: string[];
  pinned: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Aggregated per-day completion — powers Today's checklist + Analytics
// heatmap without recomputing from every other table each render.
// ---------------------------------------------------------------------------

export interface DayCompletion {
  id?: number;
  date: ISODate;
  gym: boolean | null; // null = not scheduled that day
  protein: boolean | null;
  walking: boolean | null;
  coding: boolean | null;
  hobbiesCompleted: number;
  hobbiesScheduled: number;
  goalsCompleted: number;
  goalsScheduled: number;
}
