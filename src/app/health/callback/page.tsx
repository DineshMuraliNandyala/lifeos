"use client";

/**
 * Google OAuth callback handler.
 *
 * Google redirects here after the user authorizes Google Fit access:
 *   /health/callback#access_token=...&token_type=Bearer&expires_in=3600
 *
 * The token is in the URL fragment (hash) — never sent to the server.
 * We extract it, store it in IndexedDB, and navigate back to the app.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { setGoogleFitTokenFromCallback } from "@/features/health/use-google-fit";

export default function GoogleFitCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove leading #
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const expiresIn = Number(params.get("expires_in") ?? "3600");
    const error = params.get("error");

    if (error) {
      setErrorMsg(error === "access_denied" ? "Access denied — please try again and allow the requested permissions." : `OAuth error: ${error}`);
      setStatus("error");
      return;
    }

    if (!accessToken) {
      setErrorMsg("No access token received from Google. Please try again.");
      setStatus("error");
      return;
    }

    setGoogleFitTokenFromCallback(accessToken, expiresIn)
      .then(() => {
        setStatus("success");
        // Redirect back to Settings after a short delay
        const returnPath = (() => { try { return localStorage.getItem("gfit_redirect_origin") ?? "/settings"; } catch { return "/settings"; } })();
        setTimeout(() => router.replace(returnPath), 1500);
      })
      .catch((err) => {
        setErrorMsg(String(err));
        setStatus("error");
      });
  }, [router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-bg px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-1 p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-focus" />
            <h1 className="text-lg font-semibold text-text">Connecting Google Fit…</h1>
            <p className="mt-1 text-sm text-text-muted">Saving your access token securely.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="mx-auto mb-4 h-10 w-10 text-green-500" />
            <h1 className="text-lg font-semibold text-text">Google Fit Connected!</h1>
            <p className="mt-1 text-sm text-text-muted">Your step count will now sync automatically. Returning to settings…</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
            <h1 className="text-lg font-semibold text-text">Connection Failed</h1>
            <p className="mt-2 text-sm text-text-muted">{errorMsg}</p>
            <button
              onClick={() => router.replace("/settings")}
              className="mt-4 rounded-lg bg-focus px-4 py-2 text-sm font-medium text-white"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
