"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useConnectionState,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import {
  CircleCheck,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
  WifiOff,
} from "lucide-react";
import { ConnectionState, Track } from "livekit-client";
import { useEffect, useState, type ReactNode } from "react";
import {
  isLocalMediaSourceEnabled,
  type LocalMediaSource,
  setLocalMediaSourceEnabled,
} from "./livekit-media";

type TokenState =
  | { status: "loading" }
  | { status: "ready"; token: string; serverUrl: string }
  | { status: "failed"; message: string };
type CameraTrackRef = ReturnType<
  typeof useTracks<[{ source: Track.Source.Camera; withPlaceholder: true }]>
>[number];
type PublishedCameraTrackRef = CameraTrackRef & {
  publication: NonNullable<CameraTrackRef["publication"]>;
};

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

  if (state.status === "loading")
    return <MediaStatus message="Connecting media..." tone="pending" />;

  if (state.status === "failed") return <MediaStatus message={state.message} tone="failed" />;

  return <ConnectedLiveKitPanel token={state.token} serverUrl={state.serverUrl} />;
}

function ConnectedLiveKitPanel({ token, serverUrl }: { token: string; serverUrl: string }) {
  const [deviceError, setDeviceError] = useState<string | null>(null);

  return (
    <LiveKitRoom
      className="contents"
      token={token}
      serverUrl={serverUrl}
      connect
      audio={false}
      video={false}
      connectOptions={{ autoSubscribe: true }}
      options={{ adaptiveStream: true, dynacast: true }}
      onMediaDeviceFailure={(_, kind) => {
        setDeviceError(
          kind
            ? `${kind} permission was blocked. Check browser permissions and try again.`
            : "Media permission was blocked. Check browser permissions and try again.",
        );
      }}
      onError={(error) => setDeviceError(error.message)}
    >
      <RoomAudioRenderer />
      <LessonMediaRail deviceError={deviceError} />
    </LiveKitRoom>
  );
}

function LessonMediaRail({ deviceError }: { deviceError: string | null }) {
  const connectionState = useConnectionState();
  const trackRefs = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 gap-3 overflow-x-auto pb-1">
        {trackRefs.length ? (
          trackRefs.map((trackRef) => (
            <ParticipantStripTile
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              trackRef={trackRef}
            />
          ))
        ) : (
          <div className="flex h-24 min-w-44 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--ink-2)]">
            Waiting for participants
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ConnectionPill state={connectionState} />
        <StartAudio
          className="drawi-button secondary min-h-10 px-3 py-2 text-xs"
          label="Enable audio"
        />
        <LessonCallControls deviceError={deviceError} />
      </div>
    </div>
  );
}

function ParticipantStripTile({ trackRef }: { trackRef: CameraTrackRef }) {
  const participantName = trackRef.participant.name ?? trackRef.participant.identity;
  const videoTrackRef = getPublishedVideoTrack(trackRef);

  return (
    <article className="relative h-24 min-w-44 overflow-hidden rounded-[8px] bg-[var(--ink-0)] text-white shadow-[2px_3px_0_rgba(32,32,29,0.12)]">
      {videoTrackRef ? (
        <VideoTrack
          trackRef={videoTrackRef}
          className="h-full w-full object-cover"
          muted={trackRef.participant.isLocal}
        />
      ) : (
        <div className="grid h-full place-items-center bg-[linear-gradient(135deg,rgba(255,254,250,0.16),rgba(255,254,250,0.04))]">
          <span className="grid size-11 place-items-center rounded-full bg-white/15 text-base font-black">
            {participantName.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/52 px-2.5 py-1.5 text-xs font-bold">
        <span className="truncate">{participantName}</span>
        <span className="inline-flex items-center gap-1 text-white/82">
          {trackRef.participant.isMicrophoneEnabled ? (
            <Mic className="size-3" />
          ) : (
            <MicOff className="size-3" />
          )}
        </span>
      </div>
    </article>
  );
}

function getPublishedVideoTrack(trackRef: CameraTrackRef): PublishedCameraTrackRef | null {
  const { publication } = trackRef;
  if (!publication || publication.isMuted) return null;
  return {
    participant: trackRef.participant,
    publication,
    source: trackRef.source,
  };
}

function LessonCallControls({ deviceError }: { deviceError: string | null }) {
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    lastMicrophoneError,
    lastCameraError,
  } = useLocalParticipant();
  const [busySource, setBusySource] = useState<LocalMediaSource | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const canShareScreen =
    typeof navigator === "undefined" ? true : Boolean(navigator.mediaDevices?.getDisplayMedia);

  async function toggleSource(source: LocalMediaSource) {
    setBusySource(source);
    setControlError(null);
    try {
      const nextEnabled = !isLocalMediaSourceEnabled(localParticipant, source);
      await setLocalMediaSourceEnabled(localParticipant, source, nextEnabled);
    } catch (error) {
      setControlError(error instanceof Error ? error.message : "Could not update media device.");
    } finally {
      setBusySource(null);
    }
  }

  const micError = lastMicrophoneError?.message;
  const cameraError = lastCameraError?.message;
  const visibleError = controlError ?? deviceError ?? micError ?? cameraError;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MediaToggleButton
        label={isMicrophoneEnabled ? "Mute mic" : "Unmute mic"}
        active={isMicrophoneEnabled}
        busy={busySource === "microphone"}
        onClick={() => void toggleSource("microphone")}
        icon={isMicrophoneEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
      />
      <MediaToggleButton
        label={isCameraEnabled ? "Stop camera" : "Start camera"}
        active={isCameraEnabled}
        busy={busySource === "camera"}
        onClick={() => void toggleSource("camera")}
        icon={isCameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
      />
      {canShareScreen ? (
        <MediaToggleButton
          label={isScreenShareEnabled ? "Stop share" : "Share screen"}
          active={isScreenShareEnabled}
          busy={busySource === "screen"}
          onClick={() => void toggleSource("screen")}
          icon={<MonitorUp className="size-4" />}
        />
      ) : null}
      {visibleError ? (
        <span className="max-w-64 text-pretty text-xs font-semibold leading-5 text-[var(--danger)]">
          {visibleError}
        </span>
      ) : null}
    </div>
  );
}

function MediaToggleButton({
  label,
  active,
  busy,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  busy: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`drawi-button secondary min-h-10 px-3 py-2 text-xs ${active ? "bg-[var(--ink-0)] text-[var(--canvas)] hover:bg-[var(--ink-1)]" : ""}`}
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      title={label}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}

function ConnectionPill({ state }: { state: ConnectionState }) {
  const connected = state === ConnectionState.Connected;
  const reconnecting =
    state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting;
  const label = connected ? "Live" : reconnecting ? "Reconnecting" : state;
  const Icon = connected ? CircleCheck : reconnecting ? Loader2 : WifiOff;

  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-[var(--surface-muted)] px-3 text-xs font-black uppercase tracking-[0.08em] text-[var(--ink-1)]">
      <Icon className={`size-4 ${reconnecting ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function MediaStatus({ message, tone }: { message: string; tone: "pending" | "failed" }) {
  const failed = tone === "failed";

  return (
    <div
      className={`flex min-h-24 items-center gap-3 rounded-[8px] px-4 py-3 text-sm font-semibold ${failed ? "bg-[rgba(169,67,63,0.08)] text-[var(--danger)]" : "bg-[var(--surface-muted)] text-[var(--ink-2)]"}`}
    >
      {failed ? <PhoneOff className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
      {message}
    </div>
  );
}
