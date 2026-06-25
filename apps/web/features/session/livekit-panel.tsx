"use client";

import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";
import { useEffect, useState } from "react";

type TokenState =
  | { status: "loading" }
  | { status: "ready"; token: string; serverUrl: string }
  | { status: "failed"; message: string };

export function LiveKitPanel({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<TokenState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function loadToken() {
      try {
        const response = await fetch(`/api/livekit/token?sessionId=${sessionId}`);
        if (!response.ok) {
          throw new Error("The local LiveKit server is not running.");
        }
        const data = (await response.json()) as { token: string; serverUrl: string };
        if (!cancelled) setState({ status: "ready", token: data.token, serverUrl: data.serverUrl });
      } catch {
        if (!cancelled) {
          setState({
            status: "failed",
            message:
              "Video unavailable. The local LiveKit server is not running. The collaborative board is still available.",
          });
        }
      }
    }
    void loadToken();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.status === "loading") {
    return <div className="drawi-panel p-4 text-sm text-[var(--ink-2)]">Connecting media...</div>;
  }

  if (state.status === "failed") {
    return (
      <div className="drawi-panel border-[var(--warning)] p-4 text-sm text-[var(--ink-1)]">
        {state.message}
      </div>
    );
  }

  return (
    <div className="drawi-panel overflow-hidden p-2">
      <LiveKitRoom token={state.token} serverUrl={state.serverUrl} connect>
        <RoomAudioRenderer />
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
