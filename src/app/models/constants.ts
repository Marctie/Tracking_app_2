import { IMqttServiceOptions } from "ngx-mqtt";

export const BASEURL = 'http://10.0.90.9/stagepeluso';
export const LOGINURL = 'http://10.0.90.9/stagepeluso/api/Auth/login';
export const LOGOUTURL = 'http://10.0.90.9/stagepeluso/api/Auth/logout';
export const VEICLEURL = 'http://10.0.90.9/stagepeluso/api/Vehicles';

export const MQTT_SERVICE_OPTIONS: IMqttServiceOptions={
    keepalive: 120,
    port: 8883, 
    path: '/ws', // Path per WebSocket
    protocol: 'wss', // WebSocket Secure per HTTPS o 'ws' per HTTP
    username: 'intellitronika',
    password: 'intellitronika',
    hostname: 'rabbitmq.test.intellitronika.com'
};
 