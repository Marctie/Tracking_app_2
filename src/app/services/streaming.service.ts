import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ConfigService } from './config.service';
import { IStreaming } from '../models/stream';

@Injectable({
  providedIn: 'root',
})
export class StreamingService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  // Signals per gestire lo stato dello streaming
  isStreamActive = signal(false);
  currentStreamData = signal<IStreaming | null>(null);
  streamError = signal<string | null>(null);

  // Subject per notificare cambiamenti di stato
  private streamStatusSubject = new BehaviorSubject<
    'idle' | 'starting' | 'active' | 'stopping' | 'error'
  >('idle');
  streamStatus$ = this.streamStatusSubject.asObservable();

  constructor() {}

  /** Avvia lo streaming per un veicolo specifico
   */
  startStreaming(vehicleId: number, durationSeconds?: number): Observable<IStreaming> {
    const url = this.configService.getApiUrl('streamStart');

    let params = new HttpParams().set('vehicleId', vehicleId.toString());

    if (durationSeconds) {
      params = params.set('durationSeconds', durationSeconds.toString());
    }

    console.log('[STREAMING-SERVICE] Starting stream for vehicle:', vehicleId);
    console.log('[STREAMING-SERVICE] URL:', `${url}?${params.toString()}`);

    this.streamStatusSubject.next('starting');
    this.streamError.set(null);

    return new Observable<IStreaming>((observer) => {
      this.http.post<IStreaming>(url, {}, { params }).subscribe({
        next: (response) => {
          console.log('[STREAMING-SERVICE] Stream started successfully:', response);

          this.currentStreamData.set(response);
          this.isStreamActive.set(true);
          this.streamStatusSubject.next('active');

          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('[STREAMING-SERVICE] Error starting stream:', error);

          this.streamError.set(error.message || 'Failed to start streaming');
          this.streamStatusSubject.next('error');
          this.isStreamActive.set(false);

          observer.error(error);
        },
      });
    });
  }

  /**
   * Ferma lo streaming per un veicolo specifico
   * Observable con la conferma di stop
   */
  stopStreaming(vehicleId: number): Observable<any> {
    const url = this.configService.getApiUrl('streamStop');
    const params = new HttpParams().set('vehicleId', vehicleId.toString());

    console.log('[STREAMING-SERVICE] Stopping stream for vehicle:', vehicleId);

    this.streamStatusSubject.next('stopping');

    return new Observable((observer) => {
      this.http.post(url, {}, { params }).subscribe({
        next: (response) => {
          console.log('[STREAMING-SERVICE] Stream stopped successfully:', response);

          this.currentStreamData.set(null);
          this.isStreamActive.set(false);
          this.streamStatusSubject.next('idle');
          this.streamError.set(null);

          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('[STREAMING-SERVICE] Error stopping stream:', error);

          this.streamError.set(error.message || 'Failed to stop streaming');
          this.streamStatusSubject.next('error');

          observer.error(error);
        },
      });
    });
  }

  /**
   * Verifica lo stato dello streaming per un veicolo
   * Observable con lo stato dello streaming
   */
  getStreamingStatus(vehicleId: number): Observable<any> {
    const url = this.configService.getApiUrl('streamStatus');
    const params = new HttpParams().set('vehicleId', vehicleId.toString());

    console.log('[STREAMING-SERVICE] Checking stream status for vehicle:', vehicleId);

    return this.http.get(url, { params });
  }

  /**
   * Reset dello stato del service
   */
  resetStreamingState(): void {
    this.isStreamActive.set(false);
    this.currentStreamData.set(null);
    this.streamError.set(null);
    this.streamStatusSubject.next('idle');
    console.log('[STREAMING-SERVICE] State reset');
  }

  getCurrentStreamData(): IStreaming | null {
    return this.currentStreamData();
  }

  getIsStreamActive(): boolean {
    return this.isStreamActive();
  }

  getStreamError(): string | null {
    return this.streamError();
  }
}
