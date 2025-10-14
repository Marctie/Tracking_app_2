import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/features/auth/auth-interceptor';
import { MQTT_SERVICE_OPTIONS } from './app/models/constants';
import { MqttModule } from 'ngx-mqtt';
import { CONFIG_INITIALIZER_PROVIDER } from './app/config.initializer';


bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(MqttModule.forRoot(MQTT_SERVICE_OPTIONS)),
    CONFIG_INITIALIZER_PROVIDER // ← Aggiunto provider per configurazione dinamica
  ]
});
