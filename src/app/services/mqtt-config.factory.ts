import { ConfigService } from './config.service';
import { IMqttServiceOptions } from 'ngx-mqtt';

/**
 * Factory function per creare le opzioni di configurazione MQTT
 * dinamicamente dal ConfigService
 */
export function mqttConfigFactory(configService: ConfigService): IMqttServiceOptions {
  const mqttOptions = configService.getMqttServiceOptions();
  console.log('[MQTT-CONFIG-FACTORY] Opzioni MQTT caricate:', mqttOptions);
  return mqttOptions as IMqttServiceOptions;
}
