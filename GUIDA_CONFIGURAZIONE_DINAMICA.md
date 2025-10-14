# 🔧 Configurazione Dinamica API - Guida per il Tutor

## 📋 Panoramica
Il progetto ora supporta la **configurazione dinamica delle API** senza necessità di ricompilazione. Il sistema carica automaticamente la configurazione da un file JSON esterno all'avvio dell'applicazione.

## 📁 File di Configurazione

### Posizione
```
public/assets/config.json
```

### Struttura
```json
{
  "apiBaseUrl": "http://10.0.90.9/stagepeluso/api",
  "mqttBrokerUrl": "wss://rabbitmq.test.intellitronika.com/ws",
  "environment": "development",
  "appVersion": "1.0.0",
  "features": {
    "realTimeUpdates": true,
    "satelliteView": true,
    "autoRefreshInterval": 5000
  },
  "api": {
    "endpoints": {
      "vehicles": "/Vehicles",
      "positions": "/positions", 
      "users": "/users",
      "auth": "/Auth"
    },
    "timeout": 30000,
    "retryAttempts": 3
  },
  "mqtt": {
    "hostname": "rabbitmq.test.intellitronika.com",
    "port": 443,
    "path": "/ws",
    "protocol": "wss",
    "username": "intellitronika",
    "password": "intellitronika",
    "keepalive": 120,
    "topics": {
      "vehicleStatus": "vehicles/+/status",
      "vehiclePosition": "vehicles/+/position"
    }
  },
  "map": {
    "defaultCenter": {
      "latitude": 41.9028,
      "longitude": 12.4964
    },
    "defaultZoom": 12,
    "maxZoom": 18,
    "minZoom": 4
  }
}
```

## 🚀 Come Cambiare gli URL delle API

### 1. **Modifica Rapida (Senza Ricompilazione)**
1. Apri il file `public/assets/config.json`
2. Modifica il campo `apiBaseUrl`:
   ```json
   {
     "apiBaseUrl": "https://nuovo-server.com/api"
   }
   ```
3. Salva il file
4. Ricarica l'applicazione nel browser (F5)
5. ✅ **L'app ora userà il nuovo URL automaticamente!**

### 2. **Configurazioni per Diversi Ambienti**

#### Sviluppo (Corrente)
```json
"apiBaseUrl": "http://10.0.90.9/stagepeluso/api"
```

#### Test
```json
"apiBaseUrl": "https://test-api.yourcompany.com/api"
```

#### Produzione 
```json
"apiBaseUrl": "https://production-api.yourcompany.com/api"
```

## 🔧 Parametri Configurabili

| Parametro | Descrizione | Esempio |
|-----------|-------------|---------|
| `apiBaseUrl` | URL base per tutte le API | `"https://api.example.com"` |
| `mqttBrokerUrl` | URL del broker MQTT | `"wss://mqtt.example.com/ws"` |
| `autoRefreshInterval` | Intervallo aggiornamento (ms) | `5000` (5 secondi) |
| `environment` | Ambiente di deployment | `"production"` |
| `features.realTimeUpdates` | Abilita aggiornamenti MQTT | `true/false` |
| `features.satelliteView` | Abilita vista satellite | `true/false` |

## 🏗️ Architettura Implementata

### 1. **ConfigService**
- Carica `config.json` all'avvio
- Fornisce accesso centralizzato alle configurazioni
- Gestisce fallback su valori di default

### 2. **APP_INITIALIZER**
- Garantisce che la configurazione sia caricata prima dell'avvio
- Blocca l'inizializzazione fino al caricamento completo

### 3. **Servizi Aggiornati**
- `VeicleService`: Usa URL dinamici da configurazione
- `UserService`: Endpoint login/logout configurabili
- `GeneralMap`: Intervallo di refresh configurabile

## 📋 Procedura di Deployment

### Per il Tutor - Cambio URL in Produzione:

1. **Compila l'applicazione una sola volta:**
   ```bash
   npm run build
   ```

2. **Deploya i file nella cartella `dist/`**

3. **Per ogni ambiente, modifica solo:**
   ```
   dist/assets/config.json
   ```

4. **Esempi di configurazione per ambiente:**

   **Sviluppo:**
   ```json
   {
     "apiBaseUrl": "http://localhost:3000/api",
     "environment": "development"
   }
   ```

   **Test:**
   ```json
   {
     "apiBaseUrl": "https://test-api.example.com/api",
     "environment": "test"
   }
   ```

   **Produzione:**
   ```json
   {
     "apiBaseUrl": "https://api.example.com/api",
     "environment": "production"
   }
   ```

## ⚡ Vantaggi della Soluzione

✅ **Nessuna Ricompilazione**: Cambi solo il file JSON  
✅ **Deploy Multipli**: Stesso codice, configurazioni diverse  
✅ **Configurazione Centralizzata**: Tutti i parametri in un posto  
✅ **Fallback Sicuro**: Valori di default se il file non viene trovato  
✅ **Hot Configuration**: Possibilità di ricaricare la config a runtime  

## 🔍 Verifica Configurazione

### Nel Browser Console:
```javascript
// Verifica configurazione attuale
console.log('Config caricata:', window.appConfig);

// Verifica URL API in uso
console.log('API Base URL:', configService.getApiBaseUrl());
```

### Log dell'Applicazione:
```
[CONFIG-SERVICE] Configurazione caricata: {environment: "development", ...}
[VEICLE-SERVICE] Chiamata API a: https://nuovo-server.com/api/Vehicles
[USER-SERVICE] Login URL: https://nuovo-server.com/api/Auth/login
```

## 🛠️ Troubleshooting

### Problema: L'app non carica la nuova configurazione
**Soluzione**: 
1. Verifica che il file `config.json` sia valido (usa un JSON validator)
2. Controlla i log del browser per errori di caricamento
3. Assicurati che il file sia accessibile via HTTP

### Problema: Errori di CORS con nuovo server
**Soluzione**: 
1. Configura CORS sul nuovo server API
2. Verifica che il nuovo server accetti richieste dal dominio dell'app

## 📞 Supporto
Per domande sulla configurazione, verifica i log del browser console e cerca messaggi che iniziano con `[CONFIG-SERVICE]` o `[VEICLE-SERVICE]`.