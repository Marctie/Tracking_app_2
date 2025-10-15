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
        <p style="color: orange;">⚠️ Il browser non supporta l'accesso alla webcam</p>
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

        <!-- Video element sempre presente per ViewChild -->
        <div>
          <video
            #localVideo
            autoplay
            muted
            width="320"
            height="240"
            style="border: 1px solid #ccc; margin-top: 10px;"
            [style.display]="isLocalCameraActive() ? 'block' : 'none'"
          >
            Il tuo browser non supporta il tag video.
          </video>

          @if (!isLocalCameraActive()) {
          <div
            style="width: 320px; height: 240px; border: 1px solid #ccc; margin-top: 10px; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; color: #666;"
          >
            Webcam non attiva
          </div>
          }
        </div>
      </div>

      <!-- Sezione Stream Remoto -->
      <div>
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
      <div>
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
      <div>
        <h4>Player Video Remoto</h4>
        <video
          controls
          autoplay
          muted
          width="640"
          height="480"
          [src]="streamData()?.data?.urls?.hls"
        >
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

  private streamingService = inject(StreamingService);
  private statusSubscription?: Subscription;

  // Signals per streaming remoto
  isStreamActive = signal(false);
  streamData = signal<IStreaming | null>(null);
  streamError = signal<string | null>(null);
  streamStatus = signal<'idle' | 'starting' | 'active' | 'stopping' | 'error'>('idle');
  isLoading = signal(false);

  // Signals per webcam locale
  isLocalCameraActive = signal(false);
  localCameraError = signal<string | null>(null);

  constructor(@Inject(PLATFORM_ID) private _platform: Object) {}

  ngOnInit() {
    this.statusSubscription = this.streamingService.streamStatus$.subscribe((status) => {
      this.streamStatus.set(status);
      this.isLoading.set(status === 'starting' || status === 'stopping');
    });

    this.syncWithService();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();

    // Forza la pulizia delle risorse webcam se necessario
    if (this.isLocalCameraActive()) {
      this.stopLocalCamera();
    }
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

    // Verifica supporto browser
    if (!this.checkWebcamSupport()) {
      this.localCameraError.set("Il browser non supporta l'accesso alla webcam");
      return;
    }

    // Funzione per attendere che il video element sia disponibile
    const waitForVideoElement = (): Promise<HTMLVideoElement> => {
      return new Promise((resolve, reject) => {
        const checkElement = () => {
          if (this.localVideo?.nativeElement) {
            console.log('[TESTSTREAMCAM] Video element trovato');
            resolve(this.localVideo.nativeElement);
          } else {
            console.log('[TESTSTREAMCAM] Video element non ancora disponibile, riprovo...');
            setTimeout(checkElement, 100); // Riprova dopo 100ms
          }
        };

        // Timeout dopo 5 secondi
        setTimeout(() => {
          reject(new Error('Timeout: video element non trovato dopo 5 secondi'));
        }, 5000);

        checkElement();
      });
    };

    // Aspetta che il video element sia disponibile
    waitForVideoElement()
      .then((videoElement) => {
        console.log('[TESTSTREAMCAM] Iniziando cattura webcam...');
        return navigator.mediaDevices.getUserMedia({ video: true });
      })
      .then((mediaStream: MediaStream) => {
        console.log('[TESTSTREAMCAM] Webcam locale avviata con successo');

        // Verifica nuovamente che l'elemento sia ancora disponibile
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

        // Messaggi di errore più specifici
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
      // Verifica che il ViewChild sia disponibile
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
      // Forza comunque il reset dello stato
      this.isLocalCameraActive.set(false);
    }
  }

  // Metodo di utilità per verificare il supporto webcam
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

  // Getter per verificare se la webcam è supportata (da usare nel template se necessario)
  get isWebcamSupported(): boolean {
    return this.checkWebcamSupport();
  }
}
