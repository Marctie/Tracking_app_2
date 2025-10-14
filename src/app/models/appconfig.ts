export interface AppConfig {
  apiBaseUrl: string;
  mqttBrokerUrl: string;
  features: {
    realTimeUpdates: boolean;
    autoRefreshInterval: number;
  };
  api: {
    endpoints: {
      vehicles: string;
      positions: string;
      users: string;
      auth: string;
      streamStart: string;
      streamStop: string;
      streamStatus: string;
    };
    timeout: number;
    retryAttempts: number;
  };
  map: {
    defaultCenter: {
      latitude: number;
      longitude: number;
    };
    defaultZoom: number;
    maxZoom: number;
    minZoom: number;
  };
}
