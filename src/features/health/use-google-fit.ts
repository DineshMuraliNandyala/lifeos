"use client";

/**
 * useGoogleFit — OAuth 2.0 + Google Fitness REST API
 *
 * How Android step count works:
 *   Android hardware step counter → syncs automatically to Google Fit
 *   Google Fit REST API → fetches daily step buckets
 *   This hook → reads those buckets and writes to stepReadings table
 *
 * OAuth flow:
 *   1. connectGoogleFit() → opens accounts.google.com OAuth popup
 *   2. User authorizes fitness.activity.read scope
 *   3. Google redirects to /health/callback with access_token in URL hash
 *   4. Callback page calls setTokenFromCallback() → stored in IndexedDB
 *   5. syncSteps() fetches last 7 days of step data from Google Fitness API
 */

import { useCallback } from "react";
import { db } from "@/lib/db";
import { toLocalISODate } from "@/lib/date";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";
const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/health/callback`
    : "";

const FITNESS_API = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate";
const LS_REDIRECT = "gfit_redirect_origin";

async function patch(next: Record<string, unknown>) {
  await db.settings.update(1, { ...next, updatedAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// OAuth token storage (called by /health/callback page)
// ---------------------------------------------------------------------------

export async function setGoogleFitTokenFromCallback(
  accessToken: string,
  expiresIn: number
): Promise<void> {
  const expiry = new Date(Date.now() + expiresIn * 1000);
  await patch({
    googleFitToken: accessToken,
    googleFitTokenExpiry: expiry.toISOString(),
    googleFitConnected: true,
  });
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export function useGoogleFit() {

  /** Open Google OAuth consent screen in current tab */
  function connectGoogleFit() {
    if (!CLIENT_ID) {
      console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google Fit unavailable");
      return;
    }
    // Store the current path so the callback can redirect back
    try { localStorage.setItem(LS_REDIRECT, window.location.pathname); } catch { /* */ }

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/health/callback`,
      response_type: "token",          // implicit flow — no server needed
      scope: SCOPE,
      prompt: "consent",               // always show screen so we get refresh-like behaviour
      access_type: "online",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/auth?${params}`;
  }

  async function disconnectGoogleFit() {
    await patch({
      googleFitToken: null,
      googleFitTokenExpiry: null,
      googleFitRefreshToken: null,
      googleFitConnected: false,
    });
  }

  /**
   * Sync step counts for the last N days from Google Fitness API.
   * Writes to the stepReadings table (upserts by date).
   */
  const syncSteps = useCallback(async (daysBack = 7): Promise<number> => {
    const settings = await db.settings.get(1);
    const token = settings?.googleFitToken;
    if (!token) return 0;

    // Check token expiry
    if (settings?.googleFitTokenExpiry) {
      const expiry = new Date(settings.googleFitTokenExpiry);
      if (expiry <= new Date()) {
        await patch({ googleFitConnected: false });
        return 0; // Token expired — user needs to reconnect
      }
    }

    const endMs = Date.now();
    const startMs = endMs - daysBack * 24 * 60 * 60 * 1000;

    const body = {
      aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
      bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    };

    let data: {
      bucket?: Array<{
        startTimeMillis: string;
        dataset: Array<{ point: Array<{ value: Array<{ intVal?: number }> }> }>;
      }>;
    };

    try {
      const res = await fetch(FITNESS_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        await patch({ googleFitConnected: false });
        return 0;
      }
      if (!res.ok) return 0;
      data = await res.json();
    } catch {
      return 0;
    }

    let synced = 0;

    for (const bucket of data.bucket ?? []) {
      const dateMs = Number(bucket.startTimeMillis);
      const dateStr = toLocalISODate(new Date(dateMs));

      // Sum all step points in this day bucket
      let steps = 0;
      for (const ds of bucket.dataset) {
        for (const point of ds.point) {
          for (const v of point.value) {
            steps += v.intVal ?? 0;
          }
        }
      }

      if (steps === 0) continue;

      // Upsert: if we already have a reading for this date, update it
      const existing = await db.stepReadings
        .where("date")
        .equals(dateStr)
        .first();

      if (existing) {
        // Only update if Google Fit has more steps (it's the authoritative source)
        if (steps > (existing.steps ?? 0)) {
          await db.stepReadings.update(existing.id!, { steps, source: "google_fit" });
        }
      } else {
        await db.stepReadings.add({ date: dateStr, steps, source: "google_fit" });
      }
      synced++;
    }

    return synced;
  }, []);

  return { connectGoogleFit, disconnectGoogleFit, syncSteps };
}
