import { Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreamingService } from '../../services/streaming.service';
import { IStreaming } from '../../models/stream';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-streaming-test',
  imports: [CommonModule],
  template: `
    <div class="streaming-test-container">
      <h3>Video Streaming Test</h3>

      <!-- Status Indicator -->
      <div class="status-section">
        <div class="status-indicator" [class]="getStatusClass()">
          <span class="status-dot"></span>
          <span class="status-text">{{ getStatusText() }}</span>
        </div>

        @if (streamError()) {
        <div class="error-message">marco non funziona {{ streamError() }}</div>
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
          <span class="spinner"></span> Starting... } @else { Start Stream }
        </button>

        <button
          class="btn stop-btn"
          (click)="stopStream()"
          [disabled]="!isStreamActive() || isLoading()"
          [class.loading]="isLoading() && streamStatus() === 'stopping'"
        >
          @if (isLoading() && streamStatus() === 'stopping') {
          <span class="spinner"></span> Stopping... } @else { ⏹ Stop Stream }
        </button>

        <button class="btn status-btn" (click)="checkStatus()" [disabled]="isLoading()">
          Check Status
        </button>
      </div>

      <!-- Stream Info -->
      @if (streamData()) {
      <div class="stream-info">
        <h4>Stream Information</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>Vehicle ID:</label>
            <span>{{ streamData()?.data?.vehicleId }}</span>
          </div>
          <div class="info-item">
            <label>Started At:</label>
            <span>{{ formatDate(streamData()?.data?.startedAt) }}</span>
          </div>
          <div class="info-item">
            <label>Expires At:</label>
            <span>{{ formatDate(streamData()?.data?.expiresAt) }}</span>
          </div>
          <div class="info-item">
            <label>Duration:</label>
            <span>{{ streamData()?.data?.durationSeconds }}s</span>
          </div>
        </div>

        <!-- Stream URLs -->
        <div class="urls-section">
          <h5>Stream URLs:</h5>
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

        <!-- Player Configuration -->
        @if (streamData()?.data?.playerConfig) {
        <div class="player-config">
          <h5>Player Config:</h5>
          <div class="config-item">
            <label>Recommended Player:</label>
            <span>{{ streamData()?.data?.playerConfig?.recommendedPlayer }}</span>
          </div>
          @if (streamData()?.data?.playerConfig?.hls) {
          <div class="config-item">
            <label>HLS AutoPlay:</label>
            <span>{{ streamData()?.data?.playerConfig?.hls?.autoPlay ? 'Yes' : 'No' }}</span>
          </div>
          }
        </div>
        }
      </div>
      }

      <!-- Test Video Player (se disponibile HLS) -->
      @if (streamData()?.data?.urls?.hls && isStreamActive()) {
      <div class="video-player-section">
        <h4>Test Player</h4>
        <video
          #videoPlayer
          class="test-video"
          controls
          autoplay
          muted
          [src]="streamData()?.data?.urls?.hls"
        >
          Your browser does not support the video tag.
        </video>
        <p class="video-note">
          💡 <strong>Note:</strong> This is a basic HTML5 video player. For production, consider
          using specialized HLS players like Video.js or HLS.js
        </p>
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

  private streamingService = inject(StreamingService);
  private statusSubscription?: Subscription;

  // Signals
  isStreamActive = signal(false);
  streamData = signal<IStreaming | null>(null);
  streamError = signal<string | null>(null);
  streamStatus = signal<'idle' | 'starting' | 'active' | 'stopping' | 'error'>('idle');
  isLoading = signal(false);

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

    console.log('[STREAMING-TEST] Starting stream for vehicle:', this.vehicleId());

    this.streamError.set(null);

    this.streamingService.startStreaming(this.vehicleId(), 300).subscribe({
      next: (response) => {
        console.log('[STREAMING-TEST] Stream started:', response);
        this.streamData.set(response);
        this.isStreamActive.set(true);
      },
      error: (error) => {
        console.error('[STREAMING-TEST] Start stream error:', error);
        this.streamError.set(error.message || 'Failed to start stream');
      },
    });
  }

  stopStream() {
    if (!this.isStreamActive() || this.isLoading()) return;

    console.log('[STREAMING-TEST] Stopping stream for vehicle:', this.vehicleId());

    this.streamingService.stopStreaming(this.vehicleId()).subscribe({
      next: (response) => {
        console.log('[STREAMING-TEST] Stream stopped:', response);
        this.streamData.set(null);
        this.isStreamActive.set(false);
        this.streamError.set(null);
      },
      error: (error) => {
        console.error('[STREAMING-TEST] Stop stream error:', error);
        this.streamError.set(error.message || 'Failed to stop stream');
      },
    });
  }

  checkStatus() {
    console.log('[STREAMING-TEST] Checking stream status for vehicle:', this.vehicleId());

    this.streamingService.getStreamingStatus(this.vehicleId()).subscribe({
      next: (response) => {
        console.log('[STREAMING-TEST] Stream status:', response);
        // Aggiorna lo stato basato sulla risposta
        this.syncWithService();
      },
      error: (error) => {
        console.error('[STREAMING-TEST] Status check error:', error);
        this.streamError.set(error.message || 'Failed to check status');
      },
    });
  }

  getStatusClass(): string {
    return this.streamStatus();
  }

  getStatusText(): string {
    switch (this.streamStatus()) {
      case 'idle':
        return 'Stream Inactive';
      case 'starting':
        return 'Starting Stream...';
      case 'active':
        return 'Stream Active';
      case 'stopping':
        return 'Stopping Stream...';
      case 'error':
        return 'Stream Error';
      default:
        return 'Unknown Status';
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';

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
      return 'Invalid Date';
    }
  }
}
