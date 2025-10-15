# 🎥 Guida Implementazione Streaming API

## 📋 Overview

Hai ora a disposizione un sistema completo per testare le API di streaming del tuo backend. Il sistema include:

1. **StreamingService** - Service per gestire le chiamate API
2. **StreamingTestComponent** - Componente UI per testare lo streaming
3. **Integrazione nel Modal** - Il componente è già integrato nel modal dei veicoli

## 🚀 Come Utilizzare

### 1. **Avvio Streaming**

Vai al dashboard, clicca su "Show Details" di un veicolo, scorri in basso e vedrai la sezione "🎥 Video Streaming Test".

### 2. **Test delle API**

Il componente fornisce 3 bottoni principali:

- **🎬 Start Stream** - Avvia lo streaming per il veicolo selezionato
- **⏹️ Stop Stream** - Ferma lo streaming
- **🔍 Check Status** - Verifica lo stato dello streaming

### 3. **Informazioni Stream**

Una volta avviato, vedrai:

- ID del veicolo
- Timestamp di inizio e scadenza
- Durata in secondi
- URLs per HLS, WebRTC, RTSP, RTMP
- Configurazione del player

### 4. **Test Player HTML5**

Se viene restituito un URL HLS valido, apparirà automaticamente un player video per testare il stream.

## 🔧 Configurazione API

### Endpoints Configurati (in \`config.json\`):

```json
{
  "api": {
    "endpoints": {
      "streamStart": "/api/Streaming/start",
      "streamStop": "/api/Streaming/stop",
      "streamStatus": "/api/Streaming/status"
    }
  }
}
```

### Parametri API:

**POST /api/Streaming/start**

- \`vehicleId\` (number) - ID del veicolo
- \`durationSeconds\` (number, optional) - Durata stream (default: 300s)

**POST /api/Streaming/stop**

- \`vehicleId\` (number) - ID del veicolo

**GET /api/Streaming/status**

- \`vehicleId\` (number) - ID del veicolo

## 🧪 Testing Manuale

### Scenario di Test:

1. Apri il dashboard
2. Seleziona un veicolo
3. Clicca "Show Details"
4. Scorri fino a "Video Streaming Test"
5. Clicca "Start Stream"
6. Verifica che il backend risponda con i dati stream
7. Se tutto funziona, vedrai le informazioni dello stream
8. Testa il player video (se HLS disponibile)
9. Clicca "Stop Stream" per terminare

### Debug:

- Apri DevTools Console per vedere i log dettagliati
- Tutti i messaggi sono prefissi con \`[STREAMING-SERVICE]\` o \`[STREAMING-TEST]\`
- Verifica le chiamate API nella tab Network

## 🔍 Struttura Response Attesa

```typescript
interface IStreaming {
  success: boolean;
  message: string;
  data: {
    vehicleId: number;
    streamPath: string;
    startedAt: Date;
    expiresAt: Date;
    durationSeconds: number;
    urls: {
      hls: string; // Per HTML5 video
      webRtc: string; // Per WebRTC
      rtsp: string; // Per VLC/player esterni
      rtmp: string; // Per player Flash/etc
    };
    playerConfig: {
      recommendedPlayer: string;
      hls: {
        type: string;
        autoPlay: boolean;
        videoJsConfig: object;
      };
      webRtc: {
        iceServers: string;
        codecPreference: string;
      };
    };
  };
}
```

## ⚡ Integrazione Personalizzata

Se vuoi usare il service direttamente nel tuo codice:

```typescript
import { StreamingService } from './services/streaming.service';

@Component({...})
export class MyComponent {
  private streamingService = inject(StreamingService);

  startVideo(vehicleId: number) {
    this.streamingService.startStreaming(vehicleId, 600).subscribe({
      next: (response) => {
        console.log('Stream started:', response);
        // Usa response.data.urls.hls per il video player
      },
      error: (error) => {
        console.error('Stream error:', error);
      }
    });
  }

  stopVideo(vehicleId: number) {
    this.streamingService.stopStreaming(vehicleId).subscribe({
      next: () => console.log('Stream stopped'),
      error: (error) => console.error('Stop error:', error)
    });
  }
}
```

## 🎯 Player Video Avanzati

Per la produzione, considera l'uso di:

### **HLS.js** (Raccomandato per HLS)

```bash
npm install hls.js
```

```typescript
import Hls from 'hls.js';

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(streamUrl);
  hls.attachMedia(videoElement);
}
```

### **Video.js** (Player completo)

```bash
npm install video.js
```

### **WebRTC** (Per streaming real-time)

Usa le API WebRTC native del browser con gli ICE servers forniti dalla response.

## 🛠️ Troubleshooting

### Problemi Comuni:

1. **Errore 404** - Verifica che gli endpoints nel backend siano implementati
2. **CORS Error** - Configura CORS nel backend per le chiamate streaming
3. **Video non si carica** - Controlla che l'URL HLS sia accessibile
4. **Timeout** - Aumenta il timeout nelle configurazioni (\`config.json\`)

### Log da Controllare:

- Console browser per errori JavaScript
- Network tab per status code HTTP
- Backend logs per errori server-side

## 📱 Responsive Design

Il componente è già responsive e funziona su:

- Desktop
- Tablet
- Mobile

## 🔒 Sicurezza

**Note di Sicurezza:**

- Gli URL di streaming dovrebbero essere temporanei (con scadenza)
- Implementa autenticazione per le API streaming
- Considera token JWT per proteggere gli stream
- Usa HTTPS per tutti gli streaming

---

## 🎉 Conclusione

Ora hai tutto il necessario per testare e implementare lo streaming video nella tua applicazione! Il sistema è modulare e può essere facilmente esteso in base alle tue esigenze specifiche.

Buon testing! 🚀
