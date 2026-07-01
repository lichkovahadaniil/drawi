import { TrackSource, type VideoGrant } from "livekit-server-sdk";

export const DRAWI_LIVEKIT_PUBLISH_SOURCES = [
  TrackSource.MICROPHONE,
  TrackSource.CAMERA,
  TrackSource.SCREEN_SHARE,
  TrackSource.SCREEN_SHARE_AUDIO,
];

export function createDrawiLiveKitGrant(roomName: string): VideoGrant {
  return {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canPublishSources: DRAWI_LIVEKIT_PUBLISH_SOURCES,
  };
}
