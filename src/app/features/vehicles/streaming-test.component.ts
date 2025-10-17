import { Component, ViewChild, ElementRef, input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-streaming-test',
  imports: [CommonModule],
  template: `
    <div class="streaming-container">
      <!-- Intestazione del componente -->
      <h2>HLS Video Streaming Player</h2>

      <!-- Informazioni sul veicolo -->
      <p class="vehicle-info">
        Vehicle ID: <strong>{{ vehicleId() }}</strong>
      </p>

      <!-- Sezione del player video -->
      <div class="video-section">
        <div class="video-wrapper">
          <video
            #hlsVideo
            class="hls-player"
            controls
            autoplay
            muted
            width="800"
            height="450"
            poster=""
          ></video>
        </div>
      </div>

      <!-- Sezione controlli del player -->
      <div class="controls-section">
        <!-- Pulsante per avviare lo streaming -->
        <button class="btn btn-primary">Avvia Stream</button>

        <!-- Pulsante per fermare lo streaming -->
        <button class="btn btn-danger">Stop</button>
      </div>

      <!-- Sezione informazioni stream -->
      <!-- <div class="info-section">
        <div class="info-card">
          <h3>Informazioni Stream</h3> -->

      <!-- URL dello stream corrente -->
      <!-- <div class="info-item">
            <label>URL Stream:</label>
            <span class="url-text">Nessun stream attivo</span>
          </div> -->

      <!-- Stato della connessione -->
      <!-- <div class="info-item">
            <label>Stato:</label>
            <span class="status-badge">Disconnesso</span>
          </div> -->

      <!-- Qualità del video -->
      <!-- <div class="info-item">
            <label>Qualità:</label>
            <span>Auto</span>
          </div>
        </div>
      </div> -->

      <!-- Sezione impostazioni del player -->
      <!-- <div class="settings-section">
        <div class="settings-card">
          <h3>Impostazioni Player</h3> -->

      <!-- Controllo del volume -->
      <!-- <div class="setting-item">
            <label>Volume:</label>
            <input type="range" min="0" max="100" value="50" class="volume-slider" />
          </div> -->

      <!-- Opzione autoplay -->
      <!-- <div class="setting-item">
            <label>Autoplay:</label>
            <input type="checkbox" checked />
          </div> -->

      <!-- Opzione mute -->
      <!-- <div class="setting-item">
            <label>Muted:</label>
            <input type="checkbox" checked />
          </div>
        </div> -->
      <!-- </div> -->
    </div>
  `,
  styles: `
    /* Container principale del componente */
    .streaming-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Stili per l'intestazione principale */
    h2 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
      font-size: 2rem;
      font-weight: 600;
    }

    /* Informazioni sul veicolo */
    .vehicle-info {
      text-align: center;
      margin-bottom: 20px;
      color: #666;
      font-size: 1.1rem;
    }

    /* Sezione contenente il player video */
    .video-section {
      margin-bottom: 30px;
      text-align: center;
    }

    /* Wrapper per il player video con stili decorativi */
    .video-wrapper {
      display: inline-block;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      background: #000;
    }

    /* Stili per l'elemento video HTML5 */
    .hls-player {
      width: 100%;
      max-width: 800px;
      height: auto;
      display: block;
    }

    /* Sezione contenente i controlli del player */
    .controls-section {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }

    /* Stili base per tutti i pulsanti - Coerenti con lo stile del progetto */
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      font-size: clamp(0.875rem, 2.5vw, 1rem);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
    }

    /* Pulsante primario (Avvia) - Verde */
    .btn-primary {
      background: #10b981;
      color: white;
    }

    /* Effetto hover per pulsante primario */
    .btn-primary:hover {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(16, 185, 129, 0.15);
    }

    /* Pulsante secondario (Pausa) - Blu */
    .btn-secondary {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
    }

    /* Effetto hover per pulsante secondario */
    .btn-secondary:hover {
      background: linear-gradient(135deg, #0056b3, #004085);
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(0, 123, 255, 0.15);
    }

    /* Pulsante di pericolo (Stop) - Rosso */
    .btn-danger {
      background: #dc3545;
      color: white;
    }

    /* Effetto hover per pulsante di pericolo */
    .btn-danger:hover {
      background: #c82333;
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(220, 53, 69, 0.15);
    }

    /* Layout per le sezioni informazioni e impostazioni */
    .info-section,
    .settings-section {
      margin-bottom: 30px;
    }

    /* Card contenenti informazioni e impostazioni */
    .info-card,
    .settings-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      border: 1px solid #e1e8ed;
    }

    /* Stili per i titoli delle sezioni */
    h3 {
      color: #2c3e50;
      margin: 0 0 20px 0;
      font-size: 1.25rem;
      font-weight: 600;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }

    /* Layout per gli elementi informativi e di impostazione */
    .info-item,
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f8f9fa;
    }

    /* Rimozione del bordo per l'ultimo elemento */
    .info-item:last-child,
    .setting-item:last-child {
      border-bottom: none;
    }

    /* Stili per le etichette */
    label {
      font-weight: 500;
      color: #5a6c7d;
      font-size: 0.95rem;
    }

    /* Stili per il testo degli URL */
    .url-text {
      font-family: 'Courier New', monospace;
      color: #7f8c8d;
      font-size: 0.9rem;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Badge per lo stato della connessione */
    .status-badge {
      background: #e74c3c;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    /* Slider per il controllo del volume */
    .volume-slider {
      width: 150px;
      height: 6px;
      border-radius: 3px;
      background: #ddd;
      outline: none;
      -webkit-appearance: none;
    }

    /* Thumb del volume slider per browser WebKit */
    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3498db;
      cursor: pointer;
    }

    /* Thumb del volume slider per browser Mozilla */
    .volume-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3498db;
      cursor: pointer;
      border: none;
    }

    /* Stili per le checkbox */
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #3498db;
      cursor: pointer;
    }

    /* Design responsive per tablet */
    @media (max-width: 768px) {
      .streaming-container {
        padding: 15px;
      }

      h2 {
        font-size: 1.5rem;
      }

      .controls-section {
        flex-direction: column;
        align-items: center;
      }

      .btn {
        width: 200px;
        justify-content: center;
        padding: 14px 20px;
      }

      .info-item,
      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .url-text {
        max-width: 100%;
        word-break: break-all;
      }
    }

    /* Design responsive per mobile */
    @media (max-width: 480px) {
      .hls-player {
        width: 100%;
      }

      .video-wrapper {
        width: 100%;
      }

      .btn {
        width: 100%;
        padding: 16px 20px;
        font-size: 1rem;
      }
    }
  `,
})
export class StreamingTestComponent {
  //qui prende id veicolo dal componente padre
  vehicleId = input.required<number>();
  //view child per controllare il player video
  @ViewChild('hlsVideo', { static: false }) hlsVideo?: ElementRef<HTMLVideoElement>;

  constructor() {}
}
