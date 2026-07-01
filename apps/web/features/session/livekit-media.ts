import type { LocalParticipant, ScreenShareCaptureOptions } from "livekit-client";

export type LocalMediaSource = "microphone" | "camera" | "screen";

export type LocalMediaParticipant = Pick<
  LocalParticipant,
  | "isMicrophoneEnabled"
  | "isCameraEnabled"
  | "isScreenShareEnabled"
  | "setMicrophoneEnabled"
  | "setCameraEnabled"
  | "setScreenShareEnabled"
>;

const screenShareOptions: ScreenShareCaptureOptions = {
  audio: true,
  systemAudio: "include",
};

export function isLocalMediaSourceEnabled(
  participant: LocalMediaParticipant,
  source: LocalMediaSource,
) {
  if (source === "microphone") return participant.isMicrophoneEnabled;
  if (source === "camera") return participant.isCameraEnabled;
  return participant.isScreenShareEnabled;
}

export async function setLocalMediaSourceEnabled(
  participant: LocalMediaParticipant,
  source: LocalMediaSource,
  enabled: boolean,
) {
  if (source === "microphone") {
    return participant.setMicrophoneEnabled(enabled);
  }

  if (source === "camera") {
    return participant.setCameraEnabled(enabled);
  }

  return participant.setScreenShareEnabled(enabled, enabled ? screenShareOptions : undefined);
}
