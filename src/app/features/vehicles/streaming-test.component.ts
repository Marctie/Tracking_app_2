import {
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreamingService } from '../../services/streaming.service';
import { IStreaming } from '../../models/stream';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-streaming-test',
  imports: [CommonModule],
  template: `
    <div class="streaming-test-container">
      <h3>Video Streaming Test da Vedere</h3>

      <div class="status-section">
        <div class="status-indicator" [class]="getStatusClass()">
          <span class="status-dot"></span>
          <span class="status-text">{{ getStatusText() }}</span>
        </div>

        @if (streamError()) {
        <div class="error-message">Error: {{ streamError() }}</div>
        }
      </div>

      <!-- Control Buttons -->
      <div class="controls-section">
        <button
          class="btn start-btn"
          (click)="startStream()"
          [disabled]="isLoading() || isStreamActive()"
          [class.loading]="isLoading() && streamStatus() === 'starting'"
        >
          @if (isLoading() && streamStatus() === 'starting') {
          <span class="spinner"></span> Avvio... } @else { 🎬 Avvia Stream }
        </button>

        <button
          class="btn stop-btn"
          (click)="stopStream()"
          [disabled]="!isStreamActive() || isLoading()"
          [class.loading]="isLoading() && streamStatus() === 'stopping'"
        >
          @if (isLoading() && streamStatus() === 'stopping') {
          <span class="spinner"></span> Fermando... } @else { ⏹️ Ferma Stream }
        </button>

        <button class="btn status-btn" (click)="checkStatus()" [disabled]="isLoading()">
          🔍 Controlla Stato
        </button>
      </div>

      <!-- Stream Info -->
      @if (streamData()) {
      <div class="stream-info">
        <h4>📡 Informazioni Stream</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>ID Veicolo:</label>
            <span>{{ streamData()?.data?.vehicleId }}</span>
          </div>
          <div class="info-item">
            <label>Avviato alle:</label>
            <span>{{ formatDate(streamData()?.data?.startedAt) }}</span>
          </div>
          <div class="info-item">
            <label>Scade alle:</label>
            <span>{{ formatDate(streamData()?.data?.expiresAt) }}</span>
          </div>
          <div class="info-item">
            <label>Durata:</label>
            <span>{{ streamData()?.data?.durationSeconds }}s</span>
          </div>
        </div>

        <!-- Stream URLs -->
        <div class="urls-section">
          <h5>📺 URL Stream:</h5>
          <div class="url-list">
            @if (streamData()?.data?.urls?.hls) {
            <div class="url-item">
              <label>HLS:</label>
              <a [href]="streamData()?.data?.urls?.hls" target="_blank" class="url-link">
                {{ streamData()?.data?.urls?.hls }}
              </a>
            </div>
            } @if (streamData()?.data?.urls?.webRtc) {
            <div class="url-item">
              <label>WebRTC:</label>
              <span class="url-text">{{ streamData()?.data?.urls?.webRtc }}</span>
            </div>
            } @if (streamData()?.data?.urls?.rtsp) {
            <div class="url-item">
              <label>RTSP:</label>
              <span class="url-text">{{ streamData()?.data?.urls?.rtsp }}</span>
            </div>
            }
          </div>
        </div>

        <!-- Video Player HLS -->
        @if (streamData()?.data?.urls?.hls && isStreamActive()) {
        <div class="video-player-section">
          <h5>📺 Player Video Stream</h5>
          <div class="video-container">
            <video
              #videoPlayer
              controls
              autoplay
              muted
              class="hls-video-player"
              width="800"
              height="450"
              [src]="streamData()?.data?.urls?.hls"
              (loadstart)="onVideoLoadStart()"
              (loadeddata)="onVideoLoaded()"
              (error)="onVideoError($event)"
              (canplay)="onVideoCanPlay()"
            >
              Il tuo browser non supporta il player video HTML5.
              <p>
                Prova ad aprire l'URL direttamente:
                <a [href]="streamData()?.data?.urls?.hls" target="_blank">
                  {{ streamData()?.data?.urls?.hls }}
                </a>
              </p>
            </video>

            <div class="video-controls-info">
              <p class="video-note">
                <strong>Note:</strong> Questo è un player HLS nativo. Se il video non si carica,
                potrebbe essere necessario un player HLS specializzato come hls.js per una migliore
                compatibilità cross-browser.
              </p>

              @if (videoStatus()) {
              <div class="video-status">
                <span class="status-indicator" [class]="videoStatus()">
                  {{ getVideoStatusText() }}
                </span>
              </div>
              }
            </div>
          </div>
        </div>
        }
      </div>
      }
    </div>
  `,
  styles: `
    .streaming-test-container {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 2px solid #e9ecef;
      margin: 20px 0;
    }

    h3 {
      color: #495057;
      margin-bottom: 20px;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .status-section {
      margin-bottom: 20px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 500;
      margin-bottom: 10px;
    }

    .status-indicator.idle {
      background: #e9ecef;
      color: #6c757d;
    }

    .status-indicator.starting,
    .status-indicator.stopping {
      background: #fff3cd;
      color: #856404;
    }

    .status-indicator.active {
      background: #d1edff;
      color: #0c5460;
    }

    .status-indicator.error {
      background: #f8d7da;
      color: #721c24;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .error-message {
      padding: 10px;
      background: #f8d7da;
      color: #721c24;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .controls-section {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .start-btn {
      background: #28a745;
      color: white;
    }

    .start-btn:hover:not(:disabled) {
      background: #218838;
    }

    .stop-btn {
      background: #dc3545;
      color: white;
    }

    .stop-btn:hover:not(:disabled) {
      background: #c82333;
    }

    .status-btn {
      background: #17a2b8;
      color: white;
    }

    .status-btn:hover:not(:disabled) {
      background: #138496;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .stream-info {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
      margin-bottom: 20px;
    }

    h4, h5 {
      color: #495057;
      margin-bottom: 15px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .info-item label {
      font-weight: 600;
      color: #6c757d;
      font-size: 0.85rem;
      text-transform: uppercase;
    }

    .info-item span {
      color: #495057;
      font-weight: 500;
    }

    .urls-section, .player-config {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
    }

    .url-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .url-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .url-item label {
      font-weight: 600;
      color: #6c757d;
      font-size: 0.85rem;
    }

    .url-link {
      color: #007bff;
      text-decoration: none;
      word-break: break-all;
      font-size: 0.9rem;
    }

    .url-link:hover {
      text-decoration: underline;
    }

    .url-text {
      color: #495057;
      font-family: monospace;
      font-size: 0.85rem;
      word-break: break-all;
    }

    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f8f9fa;
    }

    .config-item:last-child {
      border-bottom: none;
    }

    .config-item label {
      font-weight: 500;
      color: #6c757d;
    }

    .video-player-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
      margin-top: 20px;
    }

    .video-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .hls-video-player {
      width: 100%;
      max-width: 800px;
      height: auto;
      border-radius: 8px;
      background: #000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .video-controls-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .video-note {
      margin: 0;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 6px;
      color: #1565c0;
      font-size: 0.9rem;
      border-left: 4px solid #2196f3;
    }

    .video-status {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .video-status .status-indicator {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .video-status .status-indicator.loading {
      background: #fff3cd;
      color: #856404;
    }

    .video-status .status-indicator.ready {
      background: #d1edff;
      color: #0c5460;
    }

    .video-status .status-indicator.playing {
      background: #d4edda;
      color: #155724;
    }

    .video-status .status-indicator.error {
      background: #f8d7da;
      color: #721c24;
    }

    .video-player-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }

    .test-video {
      width: 100%;
      max-width: 640px;
      height: auto;
      border-radius: 8px;
      background: #000;
    }

    .video-note {
      margin-top: 15px;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 6px;
      color: #1565c0;
      font-size: 0.9rem;
      margin-bottom: 0;
    }

    @media (max-width: 768px) {
      .streaming-test-container {
        padding: 15px;
        margin: 15px 0;
      }

      .controls-section {
        flex-direction: column;
      }

      .btn {
        justify-content: center;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .config-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
    }
  `,
})
export class StreamingTestComponent implements OnInit, OnDestroy {
  vehicleId = input.required<number>();

  @ViewChild('videoPlayer', { static: false }) videoPlayer?: ElementRef<HTMLVideoElement>;

  private streamingService = inject(StreamingService);
  private statusSubscription?: Subscription;

  // Signals per streaming
  isStreamActive = signal(false);
  streamData = signal<IStreaming | null>(null);
  streamError = signal<string | null>(null);
  streamStatus = signal<'idle' | 'starting' | 'active' | 'stopping' | 'error'>('idle');
  isLoading = signal(false);

  // Signals per video player
  videoStatus = signal<'loading' | 'ready' | 'playing' | 'error' | null>(null);

  ngOnInit() {
    // Sottoscrizione al status del servizio
    this.statusSubscription = this.streamingService.streamStatus$.subscribe((status) => {
      this.streamStatus.set(status);
      this.isLoading.set(status === 'starting' || status === 'stopping');
    });

    // Sincronizza con il service
    this.syncWithService();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
  }

  private syncWithService() {
    this.isStreamActive.set(this.streamingService.getIsStreamActive());
    this.streamData.set(this.streamingService.getCurrentStreamData());
    this.streamError.set(this.streamingService.getStreamError());
  }

  startStream() {
    if (this.isLoading() || this.isStreamActive()) return;

    console.log('[STREAMING-TEST] Avvio stream per veicolo:', this.vehicleId());

    this.streamError.set(null);
    this.videoStatus.set(null);

    this.streamingService.startStreaming(this.vehicleId(), 300).subscribe({
      next: (response) => {
        console.log('[STREAMING-TEST] Stream avviato con successo:', response);
        this.streamData.set(response);
        this.isStreamActive.set(true);
      },
      error: (error) => {
        console.error('[STREAMING-TEST] Errore avvio stream:', error);
        this.streamError.set(error.message || 'Impossibile avviare lo stream');
        this.videoStatus.set('error');
      },
    });
  }

  stopStream() {
    if (!this.isStreamActive() || this.isLoading()) return;

    console.log('[STREAMING-TEST] Fermando stream per veicolo:', this.vehicleId());

    this.streamingService.stopStreaming(this.vehicleId()).subscribe({
      next: (response) => {
        console.log('[STREAMING-TEST] Stream fermato con successo:', response);
        this.streamData.set(null);
        this.isStreamActive.set(false);
        this.streamError.set(null);
        this.videoStatus.set(null);
      },
      error: (error) => {
        console.error('[STREAMING-TEST] Errore nel fermare lo stream:', error);
        this.streamError.set(error.message || 'Impossibile fermare lo stream');
      },
    });
  }

  checkStatus() {
    console.log('[STREAMING-TEST] Controllo stato stream per veicolo:', this.vehicleId());

    this.streamingService.getStreamingStatus(this.vehicleId()).subscribe({
      next: (response) => {
        console.log('[STREAMING-TEST] Stato stream ricevuto:', response);
        this.syncWithService();
      },
      error: (error) => {
        console.error('[STREAMING-TEST] Errore nel controllo dello stato:', error);
        this.streamError.set(error.message || 'Impossibile controllare lo stato');
      },
    });
  }

  // Metodi per gestire gli eventi del video player
  onVideoLoadStart() {
    console.log('[VIDEO-PLAYER] Inizio caricamento video');
    this.videoStatus.set('loading');
  }

  onVideoLoaded() {
    console.log('[VIDEO-PLAYER] Video caricato con successo');
    this.videoStatus.set('ready');
  }

  onVideoCanPlay() {
    console.log('[VIDEO-PLAYER] Video pronto per la riproduzione');
    this.videoStatus.set('playing');
  }

  onVideoError(event: any) {
    console.error('[VIDEO-PLAYER] Errore nel video:', event);
    this.videoStatus.set('error');

    // Aggiungi informazioni specifiche sull'errore video
    const videoError = event.target?.error;
    if (videoError) {
      let errorMessage = 'Errore nel player video';
      switch (videoError.code) {
        case 1:
          errorMessage = "Riproduzione video interrotta dall'utente";
          break;
        case 2:
          errorMessage = 'Errore di rete durante il caricamento del video';
          break;
        case 3:
          errorMessage = 'Errore di decodifica video';
          break;
        case 4:
          errorMessage = 'Formato video non supportato';
          break;
        default:
          errorMessage = `Errore video sconosciuto (codice: ${videoError.code})`;
      }
      this.streamError.set(errorMessage);
    }
  }

  getVideoStatusText(): string {
    switch (this.videoStatus()) {
      case 'loading':
        return 'Caricamento video...';
      case 'ready':
        return 'Video pronto';
      case 'playing':
        return 'Video in riproduzione';
      case 'error':
        return 'Errore video';
      default:
        return '';
    }
  }

  getStatusClass(): string {
    return this.streamStatus();
  }

  getStatusText(): string {
    switch (this.streamStatus()) {
      case 'idle':
        return 'Stream Inattivo';
      case 'starting':
        return 'Avvio Stream...';
      case 'active':
        return 'Stream Attivo';
      case 'stopping':
        return 'Fermo Stream...';
      case 'error':
        return 'Errore Stream';
      default:
        return 'Stato Sconosciuto';
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
}
