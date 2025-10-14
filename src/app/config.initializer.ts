import { APP_INITIALIZER } from '@angular/core';
import { ConfigService } from './services/config.service';

/**
 * Factory function per inizializzare la configurazione
 
 */
export function configInitializerFactory(configService: ConfigService): () => Promise<any> {
  return (): Promise<any> => {
    console.log('[CONFIG-INITIALIZER] Inizializzazione configurazione...');

    return new Promise((resolve, reject) => {
      configService.loadConfig().subscribe({
        next: (config) => {
          console.log(
            '[CONFIG-INITIALIZER] Configurazione caricata con successo:',
          );
          resolve(config);
        },
        error: (error) => {
          console.error('[CONFIG-INITIALIZER] Errore nel caricamento configurazione:', error);
          //
          resolve(null);
        },
      });
    });
  };
}

/**
 * Provider per l'inizializzazione della configurazione
 * Da aggiungere in main.ts o app.config.ts
 */
export const CONFIG_INITIALIZER_PROVIDER = {
  provide: APP_INITIALIZER,
  useFactory: configInitializerFactory,
  deps: [ConfigService],
  multi: true,
};
