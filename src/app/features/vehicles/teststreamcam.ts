import {
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { StreamingService } from '../../services/streaming.service';
import { IStreaming } from '../../models/stream';
import { Subscription } from 'rxjs';

// Dichiara hls.js per TypeScript
declare var Hls: any;

@Component({
  selector: 'app-teststreamcam',
  imports: [CommonModule],
  template: `
    <div>
      <h3>Test Stream Camera</h3>
      <div>
        <p>Stato: {{ getStatusText() }}</p>

        @if (streamError()) {
        <p>Errore: {{ streamError() }}</p>
        }
      </div>

      <!-- Sezione Webcam Locale -->
      <div>
        <h4>Webcam Locale</h4>
        @if (!isWebcamSupported) {
        <p style="color: orange;">Il browser non supporta l'accesso alla webcam</p>
        } @else {
        <button (click)="startLocalCamera()" [disabled]="isLocalCameraActive()">
          Avvia Webcam
        </button>
        <button (click)="stopLocalCamera()" [disabled]="!isLocalCameraActive()">
          Ferma Webcam
        </button>
        } @if (localCameraError()) {
        <p style="color: red;">Errore Webcam: {{ localCameraError() }}</p>
        }

        <div>
          <video
            #localVideo
            autoplay
            muted
            width="320"
            height="240"
            style="border: 1px solid #ccc; margin-top: 10px;"
            [style.display]="isLocalCameraActive() ? 'block' : 'none'"
          ></video>

          @if (!isLocalCameraActive()) {
          <div
            style="width: 320px; height: 240px; border: 1px solid #ccc; margin-top: 10px; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; color: #666;"
          >
            Webcam non attiva
          </div>
          }
        </div>
      </div>

      <!-- Sezione HLS Test Stream -->
      <div
        style="margin-top: 20px; padding: 20px; border: 2px solid #007bff; border-radius: 10px; background: #f8f9fa;"
      >
        <h4 style="color: #007bff;">Test HLS Stream (Mux)</h4>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">
          Stream di test da Mux per verificare il player HLS con hls.js
        </p>

        <div style="margin-bottom: 15px;">
          <button
            (click)="startTestHlsStream()"
            [disabled]="isTestHlsActive()"
            style="margin-right: 10px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; font-weight: 500;"
          >
            Avvia Test HLS
          </button>

          <button
            (click)="stopTestHlsStream()"
            [disabled]="!isTestHlsActive()"
            style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; font-weight: 500;"
          >
            Ferma Test HLS
          </button>
        </div>

        @if (testHlsError()) {
        <div
          style="padding: 10px; background: #f8d7da; color: #721c24; border-radius: 6px; margin-bottom: 10px;"
        >
          {{ testHlsError() }}
        </div>
        } @if (hlsPlayerStatus()) {
        <div
          style="padding: 10px; background: #d1ecf1; color: #0c5460; border-radius: 6px; margin-bottom: 10px;"
        >
          {{ hlsPlayerStatus() }}
        </div>
        }

        <!-- Player HLS Test -->
        <div style="margin-top: 15px;">
          <video
            #hlsTestVideo
            controls
            muted
            width="800"
            height="450"
            style="border: 2px solid #007bff; border-radius: 10px; background: #000; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
            [style.display]="isTestHlsActive() ? 'block' : 'none'"
          >
            Il tuo browser non supporta il player video HTML5.
          </video>

          @if (!isTestHlsActive()) {
          <div
            style="width: 800px; height: 450px; border: 2px dashed #007bff; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #6c757d;"
          >
            <div style="font-size: 1.2rem; font-weight: 500;">Player HLS Test</div>
            <div style="font-size: 0.9rem; margin-top: 5px;">
              Premi "Avvia Test HLS" per iniziare
            </div>
          </div>
          }
        </div>

        @if (isTestHlsActive()) {
        <div
          style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #dee2e6;"
        >
          <h5 style="margin: 0 0 10px 0; color: #495057; font-size: 1rem;">
            Configurazione HLS Player:
          </h5>
          <pre
            style="margin: 0; font-family: 'Courier New', monospace; font-size: 0.85rem; color: #6c757d; background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;"
            >{{ getHlsConfig() }}</pre
          >

          <div style="margin-top: 10px; font-size: 0.85rem; color: #6c757d;">
            <strong>URL Stream:</strong> {{ getTestStreamUrl() }}
          </div>
        </div>
        }
      </div>

      <!-- Sezione Stream Remoto -->
      <div style="margin-top: 20px;">
        <h4>Stream Remoto</h4>
        <button (click)="startStream()" [disabled]="isLoading() || isStreamActive()">
          @if (isLoading() && streamStatus() === 'starting') { Avvio... } @else { Avvia Stream }
        </button>

        <button (click)="stopStream()" [disabled]="!isStreamActive() || isLoading()">
          @if (isLoading() && streamStatus() === 'stopping') { Fermando... } @else { Ferma Stream }
        </button>

        <button (click)="checkStatus()" [disabled]="isLoading()">Controlla Stato</button>
      </div>

      @if (streamData()) {
      <div style="margin-top: 20px;">
        <h4>Informazioni Stream</h4>
        <p>ID Veicolo: {{ streamData()?.data?.vehicleId }}</p>
        <p>Avviato: {{ formatDate(streamData()?.data?.startedAt) }}</p>
        <p>Scade: {{ formatDate(streamData()?.data?.expiresAt) }}</p>
        <p>Durata: {{ streamData()?.data?.durationSeconds }}s</p>

        @if (streamData()?.data?.urls?.hls) {
        <div>
          <h5>URL HLS:</h5>
          <a [href]="streamData()?.data?.urls?.hls" target="_blank">
            {{ streamData()?.data?.urls?.hls }}
          </a>
        </div>
        } @if (streamData()?.data?.urls?.webRtc) {
        <div>
          <h5>URL WebRTC:</h5>
          <p>{{ streamData()?.data?.urls?.webRtc }}</p>
        </div>
        } @if (streamData()?.data?.urls?.rtsp) {
        <div>
          <h5>URL RTSP:</h5>
          <p>{{ streamData()?.data?.urls?.rtsp }}</p>
        </div>
        }
      </div>
      } @if (streamData()?.data?.urls?.hls && isStreamActive()) {
      <div style="margin-top: 20px;">
        <h4>Player Video Remoto</h4>
        <video controls autoplay width="640" height="480" [src]="streamData()?.data?.urls?.hls">
          Il tuo browser non supporta il tag video.
        </video>
      </div>
      }
    </div>
  `,
})
export class TestStreamCamComponent implements OnInit, OnDestroy {
  vehicleId = input.required<number>();

  @ViewChild('localVideo', { static: false }) localVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('hlsTestVideo', { static: false }) hlsTestVideo?: ElementRef<HTMLVideoElement>;

  private streamingService = inject(StreamingService);
  private statusSubscription?: Subscription;

  // HLS player instance
  private hlsPlayer: any = null;

  // Signals per streaming remoto
  isStreamActive = signal(false);
  streamData = signal<IStreaming | null>(null);
  streamError = signal<string | null>(null);
  streamStatus = signal<'idle' | 'starting' | 'active' | 'stopping' | 'error'>('idle');
  isLoading = signal(false);

  // Signals per webcam locale
  isLocalCameraActive = signal(false);
  localCameraError = signal<string | null>(null);

  // Signals per HLS test
  isTestHlsActive = signal(false);
  testHlsError = signal<string | null>(null);
  hlsPlayerStatus = signal<string | null>(null);

  // URL stream di test Mux
  private readonly TEST_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  // Configurazione HLS
  private readonly HLS_CONFIG = {
    debug: true,
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 90,
  };

  constructor(@Inject(PLATFORM_ID) private _platform: Object) {}

  ngOnInit() {
    this.statusSubscription = this.streamingService.streamStatus$.subscribe((status) => {
      this.streamStatus.set(status);
      this.isLoading.set(status === 'starting' || status === 'stopping');
    });

    this.syncWithService();
    this.loadHlsLibrary();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();

    // Pulizia risorse
    if (this.isLocalCameraActive()) {
      this.stopLocalCamera();
    }

    if (this.isTestHlsActive()) {
      this.stopTestHlsStream();
    }
  }

  private async loadHlsLibrary() {
    try {
      if (typeof Hls === 'undefined') {
        console.log('[HLS] Caricamento hls.js...');

        // Carica hls.js dinamicamente
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = () => {
          console.log('[HLS] hls.js caricato con successo');
          this.hlsPlayerStatus.set('Libreria HLS caricata');
        };
        script.onerror = () => {
          console.error('[HLS] Errore nel caricamento di hls.js');
          this.testHlsError.set('Errore nel caricamento della libreria HLS');
        };
        document.head.appendChild(script);
      } else {
        console.log('[HLS] hls.js già disponibile');
        this.hlsPlayerStatus.set('Libreria HLS disponibile');
      }
    } catch (error) {
      console.error('[HLS] Errore inizializzazione:', error);
      this.testHlsError.set("Errore nell'inizializzazione HLS");
    }
  }

  // Metodi per HLS Test Stream
  startTestHlsStream() {
    if (this.isTestHlsActive() || !isPlatformBrowser(this._platform)) return;

    console.log('[HLS-TEST] Avvio stream di test:', this.TEST_STREAM_URL);

    this.testHlsError.set(null);
    this.hlsPlayerStatus.set('Inizializzazione player...');

    // Aspetta che il video element sia disponibile
    setTimeout(() => {
      if (!this.hlsTestVideo?.nativeElement) {
        this.testHlsError.set('Video element non trovato');
        return;
      }

      const video = this.hlsTestVideo.nativeElement;

      try {
        if (typeof Hls === 'undefined') {
          this.testHlsError.set('Libreria hls.js non caricata. Riprova tra qualche secondo.');
          return;
        }

        if (Hls.isSupported()) {
          console.log('[HLS-TEST] HLS supportato, creazione player...');

          // Crea player HLS con configurazione
          this.hlsPlayer = new Hls(this.HLS_CONFIG);

          // Event listeners per debugging
          this.hlsPlayer.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('[HLS-TEST] Media attached');
            this.hlsPlayerStatus.set('Media collegato');
          });

          this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('[HLS-TEST] Manifest parsed');
            this.hlsPlayerStatus.set('Manifest caricato');
            video
              .play()
              .then(() => {
                this.isTestHlsActive.set(true);
                this.hlsPlayerStatus.set('Riproduzione avviata');
              })
              .catch((err) => {
                console.error('[HLS-TEST] Errore play:', err);
                this.testHlsError.set("Errore nell'avvio della riproduzione");
              });
          });

          this.hlsPlayer.on(Hls.Events.ERROR, (event: any, data: any) => {
            console.error('[HLS-TEST] Errore HLS:', data);
            this.testHlsError.set(`Errore HLS: ${data.type} - ${data.details}`);

            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  this.hlsPlayerStatus.set('Errore di rete fatale');
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  this.hlsPlayerStatus.set('Errore media fatale');
                  break;
                default:
                  this.hlsPlayerStatus.set('Errore fatale sconosciuto');
                  break;
              }
            }
          });

          // Collega video e carica stream
          this.hlsPlayer.attachMedia(video);
          this.hlsPlayer.loadSource(this.TEST_STREAM_URL);

          this.hlsPlayerStatus.set('Caricamento stream...');
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari supporto nativo
          console.log('[HLS-TEST] Usando supporto HLS nativo');
          video.src = this.TEST_STREAM_URL;
          video
            .play()
            .then(() => {
              this.isTestHlsActive.set(true);
              this.hlsPlayerStatus.set('Riproduzione nativa avviata');
            })
            .catch((err) => {
              console.error('[HLS-TEST] Errore play nativo:', err);
              this.testHlsError.set('Errore nella riproduzione nativa');
            });
        } else {
          this.testHlsError.set('HLS non supportato da questo browser');
        }
      } catch (error) {
        console.error('[HLS-TEST] Errore generale:', error);
        this.testHlsError.set("Errore nell'inizializzazione del player");
      }
    }, 100);
  }

  stopTestHlsStream() {
    if (!this.isTestHlsActive()) return;

    console.log('[HLS-TEST] Fermando stream di test');

    try {
      if (this.hlsPlayer) {
        this.hlsPlayer.destroy();
        this.hlsPlayer = null;
        console.log('[HLS-TEST] Player HLS distrutto');
      }

      if (this.hlsTestVideo?.nativeElement) {
        const video = this.hlsTestVideo.nativeElement;
        video.pause();
        video.src = '';
        video.load();
      }

      this.isTestHlsActive.set(false);
      this.testHlsError.set(null);
      this.hlsPlayerStatus.set('Player fermato');
    } catch (error) {
      console.error('[HLS-TEST] Errore nello stop:', error);
      this.testHlsError.set('Errore nel fermare il player');
    }
  }

  // Metodi di utilità per HLS
  getHlsConfig(): string {
    return JSON.stringify(this.HLS_CONFIG, null, 2);
  }

  getTestStreamUrl(): string {
    return this.TEST_STREAM_URL;
  }

  private syncWithService() {
    this.isStreamActive.set(this.streamingService.getIsStreamActive());
    this.streamData.set(this.streamingService.getCurrentStreamData());
    this.streamError.set(this.streamingService.getStreamError());
  }

  startStream() {
    if (this.isLoading() || this.isStreamActive()) return;
    console.log('[TESTSTREAMCAM] Avvio stream per veicolo:', this.vehicleId());
    this.streamError.set(null);
    this.streamingService.startStreaming(this.vehicleId(), 300).subscribe({
      next: (response) => {
        console.log('[TESTSTREAMCAM] Stream avviato:', response);
        this.streamData.set(response);
        this.isStreamActive.set(true);
      },
      error: (error) => {
        console.error('[TESTSTREAMCAM] Errore avvio stream:', error);
        this.streamError.set(error.message || 'Impossibile avviare lo stream');
      },
    });
  }

  stopStream() {
    if (!this.isStreamActive() || this.isLoading()) return;
    console.log('[TESTSTREAMCAM] Fermando stream per veicolo:', this.vehicleId());
    this.streamingService.stopStreaming(this.vehicleId()).subscribe({
      next: (response) => {
        console.log('[TESTSTREAMCAM] Stream fermato:', response);
        this.streamData.set(null);
        this.isStreamActive.set(false);
        this.streamError.set(null);
      },
      error: (error) => {
        console.error('[TESTSTREAMCAM] Errore nel fermare lo stream:', error);
        this.streamError.set(error.message || 'Impossibile fermare lo stream');
      },
    });
  }

  checkStatus() {
    console.log('[TESTSTREAMCAM] Controllo stato stream per veicolo:', this.vehicleId());

    this.streamingService.getStreamingStatus(this.vehicleId()).subscribe({
      next: (response) => {
        console.log('[TESTSTREAMCAM] Stato stream:', response);
        this.syncWithService();
      },
      error: (error) => {
        console.error('[TESTSTREAMCAM] Errore controllo stato:', error);
        this.streamError.set(error.message || 'Impossibile controllare lo stato');
      },
    });
  }

  getStatusText(): string {
    switch (this.streamStatus()) {
      case 'idle':
        return 'Inattivo';
      case 'starting':
        return 'Avvio in corso...';
      case 'active':
        return 'Attivo';
      case 'stopping':
        return 'Fermando...';
      case 'error':
        return 'Errore';
      default:
        return 'Sconosciuto';
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/D';

    try {
      const d = new Date(date);
      return d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Data Non Valida';
    }
  }

  // Metodi per la gestione della webcam locale
  startLocalCamera() {
    if (this.isLocalCameraActive()) return;
    console.log('[TESTSTREAMCAM] Avvio webcam locale');
    this.localCameraError.set(null);

    if (!this.checkWebcamSupport()) {
      this.localCameraError.set("Il browser non supporta l'accesso alla webcam");
      return;
    }

    const waitForVideoElement = (): Promise<HTMLVideoElement> => {
      return new Promise((resolve, reject) => {
        const checkElement = () => {
          if (this.localVideo?.nativeElement) {
            console.log('[TESTSTREAMCAM] Video element trovato');
            resolve(this.localVideo.nativeElement);
          } else {
            console.log('[TESTSTREAMCAM] Video element non ancora disponibile, riprovo...');
            setTimeout(checkElement, 100);
          }
        };
        setTimeout(() => {
          reject(new Error('Timeout: video element non trovato dopo 5 secondi'));
        }, 5000);
        checkElement();
      });
    };

    waitForVideoElement()
      .then((videoElement) => {
        console.log('[TESTSTREAMCAM] Iniziando cattura webcam...');
        return navigator.mediaDevices.getUserMedia({ video: true });
      })
      .then((mediaStream: MediaStream) => {
        console.log('[TESTSTREAMCAM] Webcam locale avviata con successo');
        if (this.localVideo?.nativeElement) {
          const videoElement = this.localVideo.nativeElement;
          videoElement.srcObject = mediaStream;

          return videoElement.play().then(() => {
            this.isLocalCameraActive.set(true);
            console.log('[TESTSTREAMCAM] Video playback avviato');
          });
        } else {
          throw new Error('Video element non più disponibile');
        }
      })
      .catch((error) => {
        console.error("[TESTSTREAMCAM] Errore nell'avvio della webcam locale:", error);
        let errorMessage = 'Impossibile accedere alla webcam';
        if (error.message?.includes('Timeout')) {
          errorMessage = 'Elemento video non trovato. Prova a ricaricare la pagina.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Accesso alla webcam negato. Controlla le impostazioni del browser.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Nessuna webcam trovata.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Webcam in uso da un'altra applicazione.";
        } else {
          errorMessage += ': ' + error.message;
        }
        this.localCameraError.set(errorMessage);
      });
  }

  stopLocalCamera() {
    if (!this.isLocalCameraActive()) return;
    console.log('[TESTSTREAMCAM] Fermando webcam locale');
    try {
      if (this.localVideo?.nativeElement) {
        const videoElement = this.localVideo.nativeElement;
        videoElement.pause();

        const stream = videoElement.srcObject as MediaStream;
        if (stream) {
          const tracks = stream.getVideoTracks();
          tracks.forEach((track) => track.stop());
          console.log('[TESTSTREAMCAM] Fermate', tracks.length, 'tracce video');
        }

        videoElement.srcObject = null;
      } else {
        console.warn('[TESTSTREAMCAM] Video element non disponibile durante lo stop');
      }

      this.isLocalCameraActive.set(false);
      this.localCameraError.set(null);
      console.log('[TESTSTREAMCAM] Webcam locale fermata');
    } catch (error) {
      console.error('[TESTSTREAMCAM] Errore nel fermare la webcam locale:', error);
      this.localCameraError.set('Errore nel fermare la webcam');
      this.isLocalCameraActive.set(false);
    }
  }

  private checkWebcamSupport(): boolean {
    if (!isPlatformBrowser(this._platform)) {
      console.log('[TESTSTREAMCAM] Non in ambiente browser');
      return false;
    }

    if (!('mediaDevices' in navigator)) {
      console.log('[TESTSTREAMCAM] mediaDevices non supportato');
      return false;
    }

    if (!navigator.mediaDevices.getUserMedia) {
      console.log('[TESTSTREAMCAM] getUserMedia non supportato');
      return false;
    }

    return true;
  }

  get isWebcamSupported(): boolean {
    return this.checkWebcamSupport();
  }
}
