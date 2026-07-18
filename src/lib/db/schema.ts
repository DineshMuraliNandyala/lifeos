import Dexie, { type Table } from "dexie";
import type {
  Settings,
  DailyGoal,
  DailyGoalCompletion,
  Hobby,
  HobbyLog,
  Exercise,
  ExerciseSetLog,
  WorkoutSession,
  ProteinLog,
  WaterLog,
  StepReading,
  Problem,
  SpacedRevision,
  WeeklyRevisionList,
  MonthlyRevisionList,
  JournalEntry,
  Note,
  DayCompletion,
} from "./types";

// Single Dexie database backing the entire app. Everything lives here —
// there is no server and no cloud sync target except the LeetCode fetch.
class LifeOSDatabase extends Dexie {
  settings!: Table<Settings, number>;

  dailyGoals!: Table<DailyGoal, number>;
  dailyGoalCompletions!: Table<DailyGoalCompletion, number>;

  hobbies!: Table<Hobby, number>;
  hobbyLogs!: Table<HobbyLog, number>;

  exercises!: Table<Exercise, number>;
  exerciseSetLogs!: Table<ExerciseSetLog, number>;
  workoutSessions!: Table<WorkoutSession, number>;

  proteinLogs!: Table<ProteinLog, number>;
  waterLogs!: Table<WaterLog, number>;
  stepReadings!: Table<StepReading, number>;

  problems!: Table<Problem, number>;
  spacedRevisions!: Table<SpacedRevision, number>;
  weeklyRevisionLists!: Table<WeeklyRevisionList, number>;
  monthlyRevisionLists!: Table<MonthlyRevisionList, number>;

  journalEntries!: Table<JournalEntry, number>;
  notes!: Table<Note, number>;

  dayCompletions!: Table<DayCompletion, number>;

  constructor() {
    super("lifeos");

    this.version(1).stores({
      settings: "id",

      // Note: boolean fields (archived, pinned, completed…) are deliberately
      // NOT indexed — IndexedDB keys can't be booleans. Those tables are
      // small (user-authored config, not logs), so we read the full table
      // and filter in JS rather than fighting the key-type restriction.
      dailyGoals: "++id",
      dailyGoalCompletions: "++id, goalId, date, [goalId+date]",

      hobbies: "++id",
      hobbyLogs: "++id, hobbyId, date",

      exercises: "++id, weekday, muscleGroup, order",
      exerciseSetLogs: "++id, exerciseId, date",
      workoutSessions: "++id, date, weekday",

      proteinLogs: "++id, date",
      waterLogs: "++id, date",
      stepReadings: "++id, date",

      problems: "++id, number, difficulty, solvedDate, *topics",
      spacedRevisions: "++id, problemId, dueDate, stage",
      weeklyRevisionLists: "++id, weekStart",
      monthlyRevisionLists: "++id, month",

      journalEntries: "++id, &date",
      notes: "++id, category, *tags",

      dayCompletions: "++id, &date",
    });
  }
}

export const db = new LifeOSDatabase();

/** Ensures the singleton settings row exists; call once at app boot. */
export async function ensureSettingsSeed() {
  const existing = await db.settings.get(1);
  if (existing) return existing;

  const now = new Date().toISOString();
  const seeded: Settings = {
    id: 1,
    onboardingComplete: false,
    displayName: null,
    theme: "dark",
    accentDomain: "focus",
    leetcodeUsername: null,
    leetcodeSession: null,
    leetcodeConnected: false,
    leetcodeSessionExpiry: null,
    googleFitToken: null,
    googleFitTokenExpiry: null,
    googleFitRefreshToken: null,
    googleFitConnected: false,
    weeklyCodingGoal: 7,
    dailyCodingGoalMinutes: 45,
    proteinGoalGrams: 150,
    waterGoalMl: 2500,
    stepGoal: 8000,
    healthConnectLinked: false,
    notificationsEnabled: false,
    reminderTimes: {
      morning: "07:30",
      evening: "21:30",
      gym: "18:00",
      walking: null,
      protein: null,
    },
    createdAt: now,
    updatedAt: now,
  };
  await db.settings.put(seeded);
  return seeded;
}
