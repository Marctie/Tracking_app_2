import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/features/auth/auth-interceptor';
import { MqttModule, MqttService, IMqttServiceOptions } from 'ngx-mqtt';
import { CONFIG_INITIALIZER_PROVIDER } from './app/config.initializer';
import { ConfigService } from './app/services/config.service';
import { mqttConfigFactory } from './app/services/mqtt-config.factory';

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    CONFIG_INITIALIZER_PROVIDER, // ← Carica prima la configurazione
    // MQTT con configurazione dinamica
    {
      provide: MqttService,
      useFactory: (configService: ConfigService) => {
        const mqttOptions = mqttConfigFactory(configService);
        return new MqttService(mqttOptions);
      },
      deps: [ConfigService],
    },
  ],
});
