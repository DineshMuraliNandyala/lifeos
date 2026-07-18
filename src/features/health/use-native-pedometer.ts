"use client";

/**
 * useNativePedometer — counts steps using the phone's built-in accelerometer
 * via the DeviceMotion Web API. Works in any PWA without external accounts.
 *
 * Algorithm: detects peaks in the vertical acceleration signal that exceed a
 * threshold. Each peak that is separated from the previous by at least 250ms
 * counts as one step. Very similar to Android's hardware step detector.
 *
 * On iOS 13+ requires a permission prompt (handled here).
 * On Android Chrome the event fires automatically with no permission needed.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import { toLocalISODate } from "@/lib/date";

// Tuning knobs
const THRESHOLD_G      = 1.15; // acceleration magnitude must exceed this (in g)
const MIN_STEP_MS      = 250;  // ignore peaks closer than this (debounce)
const SMOOTH_FACTOR    = 0.8;  // low-pass filter α for smoothing

export type PedometerStatus =
  | "idle"
  | "requesting"
  | "active"
  | "unsupported"
  | "denied";

export function useNativePedometer() {
  const [status,    setStatus]    = useState<PedometerStatus>("idle");
  const [todaySteps, setTodaySteps] = useState(0);

  const lastMagnitude = useRef(0);
  const lastStepAt    = useRef(0);
  const isRising      = useRef(false);
  const sessionSteps  = useRef(0);
  const savedBaseline = useRef(0); // steps already in DB before session started

  // ── Load today's existing count from DB on mount ──────────────────────────
  useEffect(() => {
    const today = toLocalISODate(new Date());
    db.stepReadings
      .where("date").equals(today)
      .first()
      .then((row) => {
        const existing = row?.steps ?? 0;
        savedBaseline.current = existing;
        setTodaySteps(existing);
      });
  }, []);

  // ── Motion handler ────────────────────────────────────────────────────────
  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;

    // Magnitude of total acceleration vector
    const raw = Math.sqrt(x * x + y * y + z * z) / 9.81; // convert to g

    // Simple low-pass smooth
    const smoothed = SMOOTH_FACTOR * lastMagnitude.current + (1 - SMOOTH_FACTOR) * raw;
    lastMagnitude.current = smoothed;

    const now = Date.now();

    if (smoothed > THRESHOLD_G && !isRising.current) {
      isRising.current = true;
    } else if (smoothed < THRESHOLD_G && isRising.current) {
      // Falling edge — that's a step if enough time has passed
      isRising.current = false;
      if (now - lastStepAt.current > MIN_STEP_MS) {
        lastStepAt.current = now;
        sessionSteps.current += 1;

        const total = savedBaseline.current + sessionSteps.current;
        setTodaySteps(total);

        // Upsert to IndexedDB every 10 steps to avoid excessive writes
        if (sessionSteps.current % 10 === 0) {
          persistSteps(total);
        }
      }
    }
  }, []);

  // ── Persist to DB ─────────────────────────────────────────────────────────
  async function persistSteps(total: number) {
    const today = toLocalISODate(new Date());
    const existing = await db.stepReadings.where("date").equals(today).first();
    if (existing) {
      await db.stepReadings.update(existing.id!, { steps: total });
    } else {
      await db.stepReadings.add({
        date: today,
        steps: total,
        source: "manual" as const,
        syncedAt: new Date().toISOString(),
      });
    }
  }

  // ── Start tracking ────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!window.DeviceMotionEvent) {
      setStatus("unsupported");
      return;
    }

    // iOS 13+ requires explicit permission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DME = DeviceMotionEvent as any;
    if (typeof DME.requestPermission === "function") {
      setStatus("requesting");
      try {
        const result = await DME.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return;
        }
      } catch {
        setStatus("denied");
        return;
      }
    }

    window.addEventListener("devicemotion", handleMotion, { passive: true });
    setStatus("active");
  }, [handleMotion]);

  // ── Stop tracking ─────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    if (sessionSteps.current > 0) {
      persistSteps(savedBaseline.current + sessionSteps.current);
    }
    setStatus("idle");
  }, [handleMotion]);

  // Clean up on unmount
  useEffect(() => () => { window.removeEventListener("devicemotion", handleMotion); }, [handleMotion]);

  return { status, todaySteps, start, stop };
}
