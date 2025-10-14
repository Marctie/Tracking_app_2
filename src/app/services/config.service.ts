import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AppConfig } from '../models/appconfig';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  private defaultConfig: AppConfig = {
    apiBaseUrl: 'http://localhost:3000/api',
    mqttBrokerUrl: 'ws://localhost:8083/mqtt',
    features: {
      realTimeUpdates: true,
      autoRefreshInterval: 5000,
    },
    api: {
      endpoints: {
        vehicles: '/vehicles',
        positions: '/positions',
        users: '/users',
        auth: '/auth',
        streamStart: '/streaming/start',
        streamStop: '/streaming/stop',
        streamStatus: '/streaming/status',
      },
      timeout: 30000,
      retryAttempts: 3,
    },
    map: {
      defaultCenter: {
        latitude: 41.9028,
        longitude: 12.4964,
      },
      defaultZoom: 12,
      maxZoom: 18,
      minZoom: 4,
    },
  };

  constructor(private http: HttpClient) {}

  /**
   * Carica la configurazione dal file config.json
   *  inizializzare l'app
   */
  loadConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>('/assets/config.json').pipe(
      tap((config) => {
        console.log('[CONFIG-SERVICE] Configurazione caricata:', config);
        this.configSubject.next(config);
      }),
      catchError((error) => {
        console.error(
          '[CONFIG-SERVICE] Errore nel caricamento configurazione, uso default:',
          error
        );
        this.configSubject.next(this.defaultConfig);
        return of(this.defaultConfig);
      })
    );
  }

  /**
   * Ottieni la configurazione corrente
   */
  getConfig(): AppConfig {
    const config = this.configSubject.value;
    if (!config) {
      console.warn('[CONFIG-SERVICE] Configurazione non ancora caricata, uso default');
      return this.defaultConfig;
    }
    return config;
  }

  /**
   * Ottieni l'URL base delle API
   */
  getApiBaseUrl(): string {
    return this.getConfig().apiBaseUrl;
  }

  /**
   * Ottieni l'URL completo per un endpoint
   */
  getApiUrl(endpoint: keyof AppConfig['api']['endpoints']): string {
    const config = this.getConfig();
    const baseUrl = config.apiBaseUrl.endsWith('/')
      ? config.apiBaseUrl.slice(0, -1)
      : config.apiBaseUrl;
    const endpointPath = config.api.endpoints[endpoint].startsWith('/')
      ? config.api.endpoints[endpoint]
      : '/' + config.api.endpoints[endpoint];

    const fullUrl = `${baseUrl}${endpointPath}`;
    console.log(`[CONFIG-SERVICE] URL costruito per ${endpoint}:`, fullUrl);
    return fullUrl;
  }

  /**
   * Ottieni l'URL del broker MQTT
   */
  getMqttBrokerUrl(): string {
    return this.getConfig().mqttBrokerUrl;
  }

  /**
   * Ottieni l'intervallo di auto-refresh
   */
  getAutoRefreshInterval(): number {
    return this.getConfig().features.autoRefreshInterval;
  }

  /**
   * Verifica se una feature è abilitata
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    const config = this.getConfig();
    return config.features[feature] as boolean;
  }

  /**
   * Ottieni la configurazione della mappa
   */
  getMapConfig() {
    return this.getConfig().map;
  }

  /**
   * Ricarica la configurazione (utile per hot-reload)
   */
  reloadConfig(): Observable<AppConfig> {
    console.log('[CONFIG-SERVICE] Ricaricamento configurazione...');
    return this.loadConfig();
  }

  /**
   * Aggiorna una specifica proprietà della configurazione (per testing)
   */
  updateConfig(updates: Partial<AppConfig>): void {
    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...updates };
    this.configSubject.next(newConfig);
    console.log('[CONFIG-SERVICE] Configurazione aggiornata:', newConfig);
  }
}
