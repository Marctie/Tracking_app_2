export interface IStreaming {
  success: boolean;
  message: string;
  data: {
    vehicleId: number;
    streamPath: string;
    startedAt: Date;
    expiresAt: Date;
    durationSeconds: number;
    urls: {
      hls: string;
      webRtc: string;
      rtsp: string;
      rtmp: string;
    };
    playerConfig: {
      recommendedPlayer: string;
      hls: {
        type: string;
        autoPlay: boolean;
        videoJsConfig: {
          additionalProp1: string;
          additionalProp2: string;
          additionalProp3: string;
        };
      };
      webRtc: {
        iceServers: string;
        codecPreference: string;
      };
    };
  };
}
