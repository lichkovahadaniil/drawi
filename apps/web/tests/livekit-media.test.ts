import { TrackSource } from "livekit-server-sdk";
import { describe, expect, it, vi } from "vitest";
import {
  isLocalMediaSourceEnabled,
  type LocalMediaParticipant,
  setLocalMediaSourceEnabled,
} from "../features/session/livekit-media";
import {
  createDrawiLiveKitGrant,
  DRAWI_LIVEKIT_PUBLISH_SOURCES,
} from "../features/session/livekit-token";

function createLocalParticipantStub(): LocalMediaParticipant {
  return {
    isMicrophoneEnabled: false,
    isCameraEnabled: true,
    isScreenShareEnabled: false,
    setMicrophoneEnabled: vi.fn(async () => undefined),
    setCameraEnabled: vi.fn(async () => undefined),
    setScreenShareEnabled: vi.fn(async () => undefined),
  };
}

describe("LiveKit media controls", () => {
  it("reads the real LiveKit local participant media state", () => {
    const participant = createLocalParticipantStub();

    expect(isLocalMediaSourceEnabled(participant, "microphone")).toBe(false);
    expect(isLocalMediaSourceEnabled(participant, "camera")).toBe(true);
    expect(isLocalMediaSourceEnabled(participant, "screen")).toBe(false);
  });

  it("toggles microphone, camera, and screen share through LiveKit participant methods", async () => {
    const participant = createLocalParticipantStub();

    await setLocalMediaSourceEnabled(participant, "microphone", true);
    await setLocalMediaSourceEnabled(participant, "camera", false);
    await setLocalMediaSourceEnabled(participant, "screen", true);
    await setLocalMediaSourceEnabled(participant, "screen", false);

    expect(participant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(participant.setCameraEnabled).toHaveBeenCalledWith(false);
    expect(participant.setScreenShareEnabled).toHaveBeenNthCalledWith(1, true, {
      audio: true,
      systemAudio: "include",
    });
    expect(participant.setScreenShareEnabled).toHaveBeenNthCalledWith(2, false, undefined);
  });
});

describe("LiveKit token grant", () => {
  it("allows lesson participants to publish mic, camera, and screen share tracks only", () => {
    const grant = createDrawiLiveKitGrant("lesson-room");

    expect(grant).toMatchObject({
      room: "lesson-room",
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });
    expect(grant.canPublishSources).toEqual([
      TrackSource.MICROPHONE,
      TrackSource.CAMERA,
      TrackSource.SCREEN_SHARE,
      TrackSource.SCREEN_SHARE_AUDIO,
    ]);
    expect(DRAWI_LIVEKIT_PUBLISH_SOURCES).toEqual(grant.canPublishSources);
  });
});
