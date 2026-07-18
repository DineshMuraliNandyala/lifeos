import "fake-indexeddb/auto";
import { db, ensureSettingsSeed } from "../src/lib/db/schema";

async function main() {
  await ensureSettingsSeed();
  console.log("settings seeded:", await db.settings.get(1));

  const goalId = await db.dailyGoals.add({
    title: "Drink water",
    icon: "Droplet",
    color: "#6e8cff",
    weekdays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    reminderTime: null,
    archived: false,
    createdAt: new Date().toISOString(),
  });
  await db.dailyGoalCompletions.add({
    goalId: goalId as number,
    date: "2026-07-12",
    completed: true,
    completedAt: new Date().toISOString(),
  });

  const hobbyId = await db.hobbies.add({
    name: "Guitar",
    icon: "Music",
    color: "#b9a6ff",
    weekdays: ["sat", "sun"],
    goalMinutes: 30,
    reminderTime: null,
    archived: false,
    createdAt: new Date().toISOString(),
  });
  await db.hobbyLogs.add({ hobbyId: hobbyId as number, date: "2026-07-12", minutes: 30, note: null });

  const exId = await db.exercises.add({
    name: "Lat Pulldown",
    muscleGroup: "Back",
    weekday: "mon",
    targetSets: 4,
    targetReps: "8-10",
    currentPR: 60,
    bestPR: 65,
    notes: null,
    order: 0,
    archived: false,
    createdAt: new Date().toISOString(),
  });
  await db.exerciseSetLogs.add({
    exerciseId: exId as number,
    date: "2026-07-12",
    setNumber: 1,
    weightKg: 60,
    reps: 8,
    isPR: false,
  });

  await db.proteinLogs.add({ date: "2026-07-12", grams: 30, loggedAt: new Date().toISOString() });
  await db.waterLogs.add({ date: "2026-07-12", ml: 500, loggedAt: new Date().toISOString() });
  await db.stepReadings.add({
    date: "2026-07-12",
    steps: 4000,
    distanceMeters: 3000,
    calories: 200,
    syncedAt: new Date().toISOString(),
    source: "manual",
  });

  const problemId = await db.problems.add({
    number: 1,
    title: "Two Sum",
    difficulty: "Easy",
    topics: ["Array", "Hash Table"],
    notes: null,
    approach: null,
    mistakes: null,
    solvedDate: "2026-07-12",
    source: "manual",
    leetcodeSlug: "two-sum",
  });
  await db.spacedRevisions.add({
    problemId: problemId as number,
    stage: 0,
    dueDate: "2026-07-13",
    lastReviewedAt: null,
    history: [],
  });
  await db.weeklyRevisionLists.add({
    weekStart: "2026-07-06",
    problemIds: [problemId as number],
    createdAt: new Date().toISOString(),
    completedProblemIds: [],
  });
  await db.monthlyRevisionLists.add({
    month: "2026-07",
    problemIds: [problemId as number],
    createdAt: new Date().toISOString(),
    completedProblemIds: [],
  });

  await db.journalEntries.add({
    date: "2026-07-12",
    reflectionMarkdown: "Good day.",
    systemDesignTopic: "Rate limiter",
    mood: "good",
    photoIds: [],
  });
  await db.notes.add({
    title: "Sliding window pattern",
    category: "Algorithms",
    bodyMarkdown: "...",
    tags: ["patterns"],
    pinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await db.dayCompletions.add({
    date: "2026-07-12",
    gym: true,
    protein: true,
    walking: null,
    coding: true,
    hobbiesCompleted: 1,
    hobbiesScheduled: 1,
    goalsCompleted: 1,
    goalsScheduled: 1,
  });

  const counts: Record<string, number> = {};
  for (const table of db.tables) {
    counts[table.name] = await table.count();
  }
  console.log("row counts:", counts);
  console.log("SMOKE TEST OK");
}

main()
  .catch((err) => {
    console.error("SMOKE TEST FAILED");
    console.error(err);
    process.exit(1);
  })
  .then(() => process.exit(0));
