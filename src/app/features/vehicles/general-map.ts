import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  input,
  effect,
} from '@angular/core';
import * as L from 'leaflet';
import { VeiclePosition } from '../../models/veicle-position';
import { Veicles } from '../../models/veicles';
import { VeicleService } from '../../services/veicle-service';
import { MyMqttService } from '../../services/mymqtt-service';
import { Router } from '@angular/router';
import { VehicleCacheService } from '../../services/vehicle-cache.service';

@Component({
  selector: 'app-general-map',
  imports: [],
  template: `
    <div class="map-container">
      <!-- Header della mappa con titolo e controlli -->
      <div class="map-header">
        <h2>Mappa Veicoli in Tempo Reale</h2>
        <div class="header-controls">
          <div class="control-buttons">
            <button class="mqtt-refresh-btn primary" (click)="refreshAllVehiclesWithMqtt()">
              Aggiorna Posizioni
            </button>
            <div class="map-view-switch">
              <label class="switch-label">
                <input
                  type="checkbox"
                  class="switch-input"
                  [checked]="isSatelliteView()"
                  (change)="toggleMapView()"
                />
                <span class="switch-slider"></span>
                <span class="switch-text">{{ isSatelliteView() ? 'Satellite' : 'Stradale' }}</span>
              </label>
            </div>
            <button class="mqtt-refresh-btn" (click)="backToDashboard()">
              Torna alla Dashboard
            </button>
          </div>
        </div>
      </div>
      <!-- Descrizione funzionalità -->
      <!-- <div class="description">
        <p>
          Visualizzazione delle posizioni dei veicoli dal database con aggiornamenti MQTT in tempo
          reale. I marker colorati indicano lo stato di ogni veicolo.
        </p>
      </div> -->

      <!-- Statistiche veicoli con contatori per stato -->
      <div class="stats-section">
        <div class="stats-grid">
          <!-- Totale veicoli -->
          <div class="stat-card">
            <div class="stat-content">
              <span class="stat-label">Veicoli Totali</span>
              <span class="stat-value">{{ veicleList().length }}</span>
            </div>
          </div>

          <!-- Veicoli con posizione -->
          <div class="stat-card">
            <div class="stat-content">
              <span class="stat-label">Con Posizione</span>
              <span class="stat-value">{{ getVeiclesWithPosition() }}</span>
            </div>
          </div>

          <!-- Veicoli online/attivi -->
          <div class="stat-card online-status">
            <div class="stat-content">
              <span class="stat-label">Online</span>
              <span class="stat-value">{{ getVeiclesOnline() }}</span>
            </div>
          </div>

          <!-- Veicoli offline/inattivi -->
          <div class="stat-card offline-status">
            <div class="stat-content">
              <span class="stat-label">Offline</span>
              <span class="stat-value">{{ getVeiclesOffline() }}</span>
            </div>
          </div>

          <!-- Veicoli in manutenzione -->
           <div class="stat-card maintenance-status">
            <div class="stat-content">
              <span class="stat-label">Manutenzione</span>
              <span class="stat-value">{{ getVeiclesMaintenance() }}</span>
            </div>
          </div> 
        </div>
      </div>

      <!-- Container per la mappa Leaflet -->
      <div class="map-wrapper">
        <div id="map" class="leaflet-map"></div>
      </div>

      <!-- Toast Notifiche -->
      @if (showToast()) {
      <div
        class="toast-notification"
        [class.toast-success]="toastType() === 'success'"
        [class.toast-error]="toastType() === 'error'"
      >
        <div class="toast-content">
          <span class="toast-icon">
            {{ toastType() === 'success' ? '✓' : '✗' }}
          </span>
          <span class="toast-message">{{ toastMessage() }}</span>
        </div>
      </div>
      }
    </div>
  `,
  styles: `
    /* === STILI PRINCIPALI - FULLSCREEN === */
    .map-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      font-family: 'Arial', sans-serif;
      background: #f8f9fa;
      z-index: 1000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* === HEADER DELLA MAPPA - COMPATTO === */
    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-bottom: 2px solid #007bff;
      flex-shrink: 0;
      z-index: 1001;
    }

    .map-header h2 {
      color: #007bff;
      margin: 0;
      font-size: 20px;
      font-weight: bold;
    }

    .header-controls {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    }

    .auto-update-indicator {
      font-size: 12px;
      color: #28a745;
      background: linear-gradient(135deg, #d4edda, #c3e6cb);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid #c3e6cb;
      font-weight: 500;
    }

    .control-buttons {
      display: flex;
      gap: 10px;
    }

    /* === BOTTONI === */
    .mqtt-refresh-btn {
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .mqtt-refresh-btn.primary {
      background: linear-gradient(135deg, #28a745, #1e7e34);
      color: white;
    }

    .mqtt-refresh-btn.primary:hover {
      background: linear-gradient(135deg, #1e7e34, #155724);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    /* === DESCRIZIONE - NASCOSTA SU FULLSCREEN === */
    .description {
      display: none; /* Nascosta per massimizzare spazio mappa */
    }

    /* === SEZIONE STATISTICHE - COMPATTA === */
    .stats-section {
      padding: 10px 20px;
      background: white;
      border-bottom: 1px solid #dee2e6;
      flex-shrink: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
    }

    .stat-card {
      background: white;
      padding: 10px 15px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      border-left: 3px solid #007bff;
      transition: transform 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    /* Stili specifici per i diversi stati */
    .stat-card.online-status {
      border-left-color: #28a745;
    }

    .stat-card.online-status:hover {
      box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
    }

    .stat-card.offline-status {
      border-left-color: #dc3545;
    }

    .stat-card.offline-status:hover {
      box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
    }

    .stat-card.maintenance-status {
      border-left-color: #ffc107;
    }

    .stat-card.maintenance-status:hover {
      box-shadow: 0 4px 16px rgba(255, 193, 7, 0.3);
    }

    .stat-icon {
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 50%;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 12px;
      color: #6c757d;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #007bff;
    }

    /* === LEGENDA - NASCOSTA SU FULLSCREEN === */
    .legend-section {
      display: none; /* Nascosta per massimizzare spazio mappa */
    }

    .legend-section h4 {
      margin: 0 0 15px 0;
      color: #495057;
      font-size: 16px;
    }

    .legend-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 4px;
      background: #f8f9fa;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #333;
    }

    .legend-color.online { background-color: #28a745; }
    .legend-color.offline { background-color: #dc3545; }
    .legend-color.maintenance { background-color: #ffc107; }

    /* === MAPPA FULLSCREEN === */
    .map-wrapper {
      flex: 1;
      background: white;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .leaflet-map {
      flex: 1;
      width: 100%;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    /* === RESPONSIVE DESIGN FULLSCREEN === */
    @media (max-width: 768px) {
      .map-header {
        padding: 8px 15px;
      }

      .map-header h2 {
        font-size: 18px;
      }

      .stats-section {
        padding: 8px 15px;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
      }

      .stat-card {
        padding: 8px 10px;
        gap: 8px;
      }

      .mqtt-refresh-btn {
        padding: 8px 12px;
        font-size: 12px;
      }

      .control-buttons {
        gap: 5px;
      }
    }

    @media (max-width: 480px) {
      .map-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
        padding: 8px 10px;
      }

      .map-header h2 {
        font-size: 16px;
      }

      .header-controls {
        align-items: center;
      }

      .control-buttons {
        flex-direction: column;
        width: 100%;
      }

      .mqtt-refresh-btn {
        width: 100%;
        justify-content: center;
        padding: 10px;
        font-size: 11px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }

      .stat-card {
        padding: 6px 8px;
        gap: 6px;
      }

      .stat-content {
        gap: 2px;
      }

      .stat-label {
        font-size: 10px;
      }

      .stat-value {
        font-size: 16px;
      }

      .stats-section {
        padding: 6px 10px;
      }
    }

    /* SWITCH PER VISTA MAPPA NORMALE/SATELLITE */
    .map-view-switch {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .switch-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      font-size: 14px;
      color: #495057;
      font-weight: 500;
    }

    .switch-input {
      position: relative;
      width: 50px;
      height: 24px;
      appearance: none;
      background: #e9ecef;
      border-radius: 12px;
      outline: none;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #dee2e6;
    }

    .switch-input:checked {
      background: #007bff;
      border-color: #0056b3;
    }

    .switch-input::before {
      content: '';
      position: absolute;
      top: 1px;
      left: 1px;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .switch-input:checked::before {
      transform: translateX(26px);
    }

    .switch-text {
      min-width: 60px;
      color: #495057;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .switch-label:hover .switch-text {
      color: #007bff;
    }

    /* Responsivo per mobile */
    @media (max-width: 768px) {
      .control-buttons {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
      }

      .map-view-switch {
        justify-content: center;
      }

      .switch-label {
        justify-content: center;
        font-size: 13px;
      }
    }

    /* === EXTRA SMALL DEVICES === */
    @media (max-width: 320px) {
      .map-header h2 {
        font-size: 14px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 4px;
      }

      .stat-card {
        padding: 5px 6px;
      }

      .stat-value {
        font-size: 14px;
      }

      .mqtt-refresh-btn {
        padding: 8px;
        font-size: 10px;
      }
    }

    /* === TOAST NOTIFICHE === */
    .toast-notification {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      max-width: 400px;
      padding: 0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideInToast 0.3s ease-out;
      pointer-events: auto;
    }

    .toast-success {
      background: linear-gradient(135deg, #28a745, #20c997);
      border-left: 4px solid #155724;
    }

    .toast-error {
      background: linear-gradient(135deg, #dc3545, #e74c3c);
      border-left: 4px solid #721c24;
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      color: white;
    }

    .toast-icon {
      font-size: 20px;
      font-weight: bold;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
    }

    .toast-message {
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      flex: 1;
    }

    @keyframes slideInToast {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Responsivo per mobile */
    @media (max-width: 768px) {
      .toast-notification {
        top: 60px;
        right: 10px;
        left: 10px;
        min-width: auto;
        max-width: none;
      }

      .toast-content {
        padding: 12px 16px;
      }

      .toast-message {
        font-size: 13px;
      }
    }
  `,
})
export class GeneralMap implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private markers: L.Marker[] = []; // Array per tenere traccia dei marker
  router = inject(Router);

  // Layer management per switch mappa normale/satellite
  private currentBaseLayer!: L.TileLayer;
  private streetLayer!: L.TileLayer;
  private satelliteLayer!: L.TileLayer;
  isSatelliteView = signal(false); // Signal per gestire lo stato della vista

  // Input per ricevere il veicolo selezionato dal componente padre
  selectedVeicle = input<Veicles>();

  // Timer per l'aggiornamento automatico ogni 5 secondi
  private autoUpdateInterval: any = null;
  private readonly UPDATE_INTERVAL = 5000; // 5 secondi in millisecondi

  // Injection dei servizi e signal per i dati
  private veicleService = inject(VeicleService); // Servizio per dati dal database
  public mqttService = inject(MyMqttService); // Servizio per dati MQTT (pubblico per template)
  private cacheService = inject(VehicleCacheService); // Servizio per cache condivisa
  veicleList = signal<Veicles[]>([]);

  // Signal per gestire le notifiche toast
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');

  // Mappa dei colori per gli stati dei veicoli
  private statusColorMap: { [key: string]: string } = {
    active: '#28a745', // Verde per veicoli attivi
    inactive: '#dc3545', //Rosso per veicoli inattivi
    offline: '#dc3545', // Rosso per veicoli offline
    maintenance: '#ffc107', // Giallo per manutenzione
    default: '#6c757d', // Grigio per stati sconosciuti
  };
  constructor() {
    effect(() => {
      const selected = this.selectedVeicle();
      if (this.map && selected) {
        console.log(
          '[GENERAL-MAP] Veicolo selezionato cambiato:',
          selected.licensePlate,
          '- Stato:',
          selected.status
        );
        this.addVeicleMarkers(true); // Preserva la vista quando cambia il veicolo selezionato
      }
    });

    // Effect per aggiornamenti MQTT in tempo reale
    effect(() => {
      const mqttPositions = this.mqttService.positionVeiclesList();
      if (mqttPositions.length > 0 && this.veicleList().length > 0 && this.map) {
        console.log(
          '[GENERAL-MAP] Rilevato aggiornamento MQTT - aggiornamento marker preservando vista corrente'
        );
        // Aggiorna solo i marker senza modificare zoom e posizione della mappa
        this.updateMarkersWithMqttData();
      }
    });
  }

  ngOnInit(): void {
    // Carica i dati dei veicoli
    this.loadVeicles();
    //  Carica automaticamente tutte le posizioni all'apertura
    this.loadAllVehiclePositionsOnInit();
    // Avvia l'aggiornamento automatico ogni 5 secondi
    this.startAutoUpdate();
    // Effect per reagire ai cambiamenti del veicolo selezionato
  }

  ngAfterViewInit(): void {
    // Configura le icone di Leaflet per evitare errori 404
    this.setupLeafletIcons();
    // Inizializza la mappa dopo che la vista è stata caricata
    this.initMap();

    //  Dopo l'inizializzazione della mappa, carica e mostra tutti i veicoli
    this.loadAndShowAllVehiclesAfterMapInit();
  }

  ngOnDestroy(): void {
    // Ferma l'aggiornamento automatico quando il componente viene distrutto
    // per evitare memory leak e chiamate API non necessarie
    this.stopAutoUpdate();
  }

  private startAutoUpdate(): void {
    this.stopAutoUpdate();

    console.log('[GENERAL-MAP] Avvio aggiornamento automatico ogni 5 secondi');

    this.autoUpdateInterval = setInterval(() => {
      console.log('[GENERAL-MAP] Esecuzione aggiornamento automatico posizioni veicoli');
      this.loadVeicles(true); // Preserva la vista della mappa durante l'auto-update
    }, this.UPDATE_INTERVAL);
  }

  private stopAutoUpdate(): void {
    if (this.autoUpdateInterval) {
      console.log('[GENERAL-MAP] Aggiornamento automatico interrotto');
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
    }
  }

  private setupLeafletIcons(): void {
    // Soluzione semplice: usa icone SVG inline per evitare errori 404
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconUrl:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjMDA3YmZmIi8+Cjwvc3ZnPg==',
      iconRetinaUrl:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjMDA3YmZmIi8+Cjwvc3ZnPg==',
      shadowUrl: 0,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }

  private loadVeicles(preserveMapView: boolean = false): void {
    this.veicleService.getListVeicle(1, 1000).subscribe((response) => {
      const mqttPositions = this.mqttService.positionVeiclesList();
      const statusesById = this.mqttService.statusById(); // ← stati correnti

      const updatedVeicles = response.items.map((v) => {
        // posizione: come già fai
        const p = mqttPositions.find((mp) => mp.vehicleId === v.id);
        let next = { ...v };

        if (p) {
          const tPos = new Date(p.timestamp).getTime();
          const tDb = new Date(v.lastPosition?.timestamp ?? 0).getTime();
          if (tPos > tDb) next.lastPosition = p;
        }

        // ★ stato: prendi dal service e normalizza
        const s = statusesById[v.id]?.status;
        if (s) next.status = this.normalizeStatus(s);

        return next;
      });

      this.veicleList.set(updatedVeicles);
      if (this.map) this.addVeicleMarkers(preserveMapView);
    });
  }

  /**
   *  Carica automaticamente tutte le posizioni dei veicoli all'apertura
   * Questa funzione si aggiunge alle tue funzionalità esistenti senza modificarle
   */
  private loadAllVehiclePositionsOnInit(): void {
    console.log("[GENERAL-MAP] Caricamento automatico di tutte le posizioni all'apertura");

    // Controlla prima se ci sono dati precaricati dal login
    const preloadedData = this.checkPreloadedMapData();
    if (preloadedData) {
      console.log('[GENERAL-MAP] Utilizzo dati precaricati dal login:', preloadedData.items.length);
      this.processVehicleData(preloadedData.items);
      return;
    }

    // Se non ci sono dati precaricati, carica dal server
    console.log('[GENERAL-MAP] Nessun precaricamento trovato, caricamento dal server...');
    this.veicleService.getAllVeicles().subscribe({
      next: (response) => {
        console.log('[GENERAL-MAP] Caricati tutti i veicoli disponibili:', response.items.length);
        this.processVehicleData(response.items);
      },
      error: (error) => {
        console.error('[GENERAL-MAP] Errore nel caricamento dei veicoli:', error);
      },
    });
  }

  /**
   * Controlla se ci sono dati precaricati validi nel localStorage
   */
  private checkPreloadedMapData(): { items: any[]; totalCount: number } | null {
    try {
      const stored = localStorage.getItem('preloadedMapData');
      if (!stored) return null;

      const data = JSON.parse(stored);
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minuti di validità

      // Verifica se i dati sono ancora validi
      if (data.timestamp && now - data.timestamp < maxAge) {
        return data;
      } else {
        // Rimuovi dati scaduti
        localStorage.removeItem('preloadedMapData');
        return null;
      }
    } catch (error) {
      console.warn('[GENERAL-MAP] Errore lettura dati precaricati:', error);
      localStorage.removeItem('preloadedMapData');
      return null;
    }
  }

  /**
   * Processa i dati dei veicoli (da precaricamento o da server)
   */
  private processVehicleData(vehicles: any[]): void {
    // Integra con i dati MQTT esistenti
    const mqttPositions = this.mqttService.positionVeiclesList();
    const allVehiclesWithPositions = this.mergeVeiclesWithMqttData(vehicles, mqttPositions);

    // Filtra solo i veicoli che hanno posizioni valide per la visualizzazione
    const vehiclesWithValidPositions = allVehiclesWithPositions.filter(
      (vehicle) =>
        vehicle.lastPosition &&
        vehicle.lastPosition.latitude &&
        vehicle.lastPosition.longitude &&
        vehicle.lastPosition.latitude !== 0 &&
        vehicle.lastPosition.longitude !== 0
    );

    console.log('[GENERAL-MAP] Veicoli con posizioni valide:', vehiclesWithValidPositions.length);

    // Aggiorna la lista con tutti i veicoli (anche quelli senza posizione per le statistiche)
    this.veicleList.set(allVehiclesWithPositions);

    // Se la mappa è già inizializzata, mostra tutti i marker
    if (this.map && vehiclesWithValidPositions.length > 0) {
      console.log('[GENERAL-MAP] Visualizzazione di tutti i veicoli sulla mappa');
      this.showAllVehicleMarkersOnMap(vehiclesWithValidPositions);
    }

    // Log delle statistiche per debug
    console.log('[GENERAL-MAP] Statistiche caricamento iniziale:', {
      totaleVeicoli: allVehiclesWithPositions.length,
      conPosizione: vehiclesWithValidPositions.length,
      online: this.getVeiclesOnline(),
      offline: this.getVeiclesOffline(),
      manutenzione: this.getVeiclesMaintenance(),
    });

    // Salva i dati nella cache per uso futuro
    this.cacheService.saveMapData(allVehiclesWithPositions);

    // Sincronizza la cache dashboard con i dati aggiornati
    this.cacheService.syncDashboardFromMap(allVehiclesWithPositions);
  }

  /**
   *  Mostra tutti i veicoli sulla mappa con vista ottimale
   * Metodo di supporto per la visualizzazione iniziale
   */
  private showAllVehicleMarkersOnMap(vehicles: Veicles[]): void {
    // Pulisce i marker esistenti
    this.clearMarkers();

    // Aggiunge un marker per ogni veicolo con posizione valida
    vehicles.forEach((vehicle) => {
      if (vehicle.lastPosition && vehicle.lastPosition.latitude && vehicle.lastPosition.longitude) {
        this.addVeicleMarker(vehicle);
      }
    });

    // Centra la mappa per mostrare tutti i veicoli se ce ne sono più di uno
    if (this.markers.length > 1) {
      const group = new L.FeatureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.05)); // Padding ridotto per vista migliore
      console.log('[GENERAL-MAP] Vista centrata su tutti i veicoli:', this.markers.length);
    } else if (this.markers.length === 1) {
      // Se c'è solo un veicolo, centra su di esso
      const vehicle = vehicles[0];
      this.map.setView([vehicle.lastPosition.latitude, vehicle.lastPosition.longitude], 14);
      console.log('[GENERAL-MAP] Vista centrata su singolo veicolo');
    }

    console.log('[GENERAL-MAP] Marker visualizzati sulla mappa:', this.markers.length);
  }

  /**
   *  Carica e mostra tutti i veicoli dopo l'inizializzazione della mappa
   * Questo metodo viene chiamato dopo che la mappa è completamente inizializzata
   */
  private loadAndShowAllVehiclesAfterMapInit(): void {
    // Aspetta un momento per assicurarsi che la mappa sia completamente pronta
    setTimeout(() => {
      if (this.veicleList().length > 0) {
        // Se i veicoli sono già stati caricati in ngOnInit, mostrali sulla mappa
        const vehiclesWithValidPositions = this.veicleList().filter(
          (vehicle) =>
            vehicle.lastPosition &&
            vehicle.lastPosition.latitude &&
            vehicle.lastPosition.longitude &&
            vehicle.lastPosition.latitude !== 0 &&
            vehicle.lastPosition.longitude !== 0
        );

        if (vehiclesWithValidPositions.length > 0) {
          console.log(
            '[GENERAL-MAP] Mappa pronta - Visualizzazione veicoli caricati precedentemente'
          );
          this.showAllVehicleMarkersOnMap(vehiclesWithValidPositions);
        }
      } else {
        // Se i veicoli non sono ancora stati caricati, forzare il caricamento
        console.log('[GENERAL-MAP] Mappa pronta - Forzatura caricamento veicoli');
        this.loadAllVehiclePositionsOnInit();
      }
    }, 100);
  }

  private mergeVeiclesWithMqttData(
    dbVeicles: Veicles[],
    mqttPositions: VeiclePosition[]
  ): Veicles[] {
    return dbVeicles.map((veicle) => {
      const mqttPosition = mqttPositions.find((position) => position.vehicleId === veicle.id);

      if (mqttPosition) {
        const dbTimestamp = veicle.lastPosition?.timestamp
          ? new Date(veicle.lastPosition.timestamp)
          : new Date(0);
        const mqttTimestamp = new Date(mqttPosition.timestamp);

        // Aggiorna sia la posizione che lo stato se i dati MQTT sono più recenti
        if (mqttTimestamp > dbTimestamp) {
          console.log(
            '[GENERAL-MAP] Posizione aggiornata con dati MQTT per veicolo:',
            veicle.licensePlate
          );

          // Controlla se anche lo stato è cambiato
          if (mqttPosition.status && mqttPosition.status !== veicle.status) {
            console.log(
              '[GENERAL-MAP] Stato aggiornato per veicolo:',
              veicle.licensePlate,
              'da',
              veicle.status,
              'a',
              mqttPosition.status
            );
          }
          console.log(
            'Queta è la posizione relativa allo status del singolo veicolo',
            mqttPosition.status
          );
          return {
            ...veicle,
            lastPosition: mqttPosition,
            // Aggiorna lo stato solo se presente nei dati MQTT
            status: mqttPosition.status || veicle.status,
          };
        }
      }

      return veicle;
    });
  }

  private initMap(): void {
    // Centra la mappa su Roma con zoom fisso
    this.map = L.map('map').setView([41.9028, 12.4964], 12);

    // Inizializza i layer per normale e satellite
    this.initMapLayers();

    // Aggiunge i marker dei veicoli
    if (this.veicleList().length > 0) {
      this.addVeicleMarkers();
    }
  }

  private addVeicleMarkers(preserveCurrentView: boolean = false): void {
    this.clearMarkers();

    // Usa selectedVeicle se disponibile per mostrare un singolo veicolo
    if (this.selectedVeicle()) {
      const selectedVeicle = this.selectedVeicle()!;

      if (
        selectedVeicle.lastPosition &&
        selectedVeicle.lastPosition.latitude &&
        selectedVeicle.lastPosition.longitude
      ) {
        this.addVeicleMarker(selectedVeicle);

        // Centra la mappa sul veicolo selezionato solo se non si deve preservare la vista
        if (!preserveCurrentView) {
          const position = selectedVeicle.lastPosition;
          this.map.setView([position.latitude, position.longitude], 15);
        }

        console.log(
          '[GENERAL-MAP] Visualizzazione veicolo selezionato:',
          selectedVeicle.licensePlate,
          '- Stato:',
          selectedVeicle.status
        );
      } else {
        console.warn(
          '[GENERAL-MAP] Avviso: Il veicolo selezionato non ha coordinate di posizione valide'
        );
      }

      return;
    }

    // Altrimenti mostra tutti i veicoli disponibili
    this.veicleList().forEach((veicle) => {
      if (veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude) {
        this.addVeicleMarker(veicle);
      }
    });

    // Aggiusta la vista per includere tutti i marker solo se non si deve preservare la vista corrente
    if (this.markers.length > 0 && !preserveCurrentView) {
      const group = new L.FeatureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }

    console.log('[GENERAL-MAP] Marker aggiunti alla mappa:', this.markers.length);
  }

  /**
   * Aggiorna solo i marker sulla mappa con i dati MQTT senza modificare zoom e posizione
   * Questo metodo preserva SEMPRE la vista corrente della mappa
   */
  private updateMarkersWithMqttData(): void {
    const mqttPositions = this.mqttService.positionVeiclesList();
    const currentVehicles = this.veicleList();

    console.log('[GENERAL-MAP] Aggiornamento marker con dati MQTT - Preservando vista corrente');

    // Crea una versione temporanea dei veicoli con i dati MQTT per i marker
    const vehiclesWithMqtt = this.mergeVeiclesWithMqttData(currentVehicles, mqttPositions);

    // Pulisce i marker esistenti
    this.clearMarkers();

    // Aggiungi marker per il veicolo selezionato o tutti i veicoli
    if (this.selectedVeicle()) {
      const selectedVeicle = this.selectedVeicle()!;
      const updatedSelected = vehiclesWithMqtt.find((v) => v.id === selectedVeicle.id);

      if (
        updatedSelected &&
        updatedSelected.lastPosition &&
        updatedSelected.lastPosition.latitude &&
        updatedSelected.lastPosition.longitude
      ) {
        this.addVeicleMarker(updatedSelected);
        console.log(
          '[GENERAL-MAP] Marker aggiornato per veicolo selezionato:',
          updatedSelected.licensePlate
        );
      }
    } else {
      // Aggiungi marker per tutti i veicoli con posizione
      vehiclesWithMqtt.forEach((veicle) => {
        if (veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude) {
          this.addVeicleMarker(veicle);
        }
      });
      console.log('[GENERAL-MAP] Marker aggiornati per tutti i veicoli:', this.markers.length);
    }

    // IMPORTANTE: NON chiamare setView() o fitBounds() per preservare la vista corrente
  }

  private addVeicleMarker(veicle: Veicles): void {
    const position = veicle.lastPosition;

    // Determina il colore del marker basato sullo stato del veicolo
    const markerColor = this.getStatusColor(veicle.status);

    // Crea un'icona personalizzata con il colore appropriato
    const customIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div style="
          background-color: ${markerColor};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          font-weight: bold;
        ">
          
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -13],
    });
    // Crea il marker con l'icona personalizzata
    const marker = L.marker([position.latitude, position.longitude], {
      icon: customIcon,
    }).addTo(this.map);

    const mqttPositions = this.mqttService.positionVeiclesList();
    const hasRecentMqttData = mqttPositions.some((mqttPos) => {
      if (mqttPos.vehicleId === veicle.id) {
        const mqttTime = new Date(mqttPos.timestamp);
        const dbTime = new Date(position.timestamp);
        return mqttTime >= dbTime;
      }
      return false;
    });

    // Contenuto del popup con informazioni sul veicolo e il suo stato
    const popupContent = `
      <div style="font-family: Arial, sans-serif; min-width: 250px;">
        <h4 style="margin: 0 0 10px 0; color: #007bff; text-align: center;">
           ${veicle.licensePlate}
        </h4>
        
        <!-- Indicatore dello stato del veicolo -->
        <div style="
          background: ${markerColor}; 
          color: white; 
          padding: 6px 12px; 
          border-radius: 6px; 
          font-size: 12px; 
          margin-bottom: 12px;
          text-align: center;
          font-weight: bold;
          text-transform: uppercase;
        ">
          STATO: ${veicle.status}
        </div>
        
        <!-- Fonte dei dati -->
        <div style="
          color: white; 
          padding: 3px 8px; 
          border-radius: 3px; 
          font-size: 10px; 
          margin-bottom: 10px;
          text-align: center;
        ">
        </div>
        
        <div style="display: grid; gap: 6px;">
          <div><strong> Modello:</strong> ${veicle.model}</div>
          <div><strong> Marca:</strong> ${veicle.brand}</div>
          <div><strong> Velocità:</strong> ${position.speed} km/h</div>
          <div><strong> Direzione:</strong> ${position.heading}°</div>
          <div><strong> Coordinate:</strong><br>
            &nbsp;&nbsp;Lat: ${position.latitude.toFixed(6)}<br>
            &nbsp;&nbsp;Lng: ${position.longitude.toFixed(6)}
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
            <strong> Ultimo aggiornamento:</strong><br>
            ${this.formatDate(position.timestamp)}
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    this.markers.push(marker);
  }

  /**
   * Determina il colore del marker basato sullo stato del veicolo
   * @param status - Lo stato del veicolo
   * @returns Il colore esadecimale corrispondente allo stato
   */
  private getStatusColor(status: string): string {
    const normalizedStatus = status?.toLowerCase().trim() || 'unknown';

    if (this.statusColorMap[normalizedStatus]) {
      return this.statusColorMap[normalizedStatus];
    }

    for (const [key, color] of Object.entries(this.statusColorMap)) {
      if (normalizedStatus.includes(key)) {
        return color;
      }
    }

    // Ritorna il colore di default se nessuna corrispondenza
    console.log(
      '[GENERAL-MAP] Stato veicolo non riconosciuto:',
      status,
      '- Applicazione colore di default'
    );
    return this.statusColorMap['default'];
  }

  private clearMarkers(): void {
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
    private normalizeStatus(s: string): string {
    const v = (s ?? '').toLowerCase().trim();
    if (v === 'online') return 'active';
    if (v === 'offline') return 'inactive';
    return v;
  }

  /**
   * Aggiorna le posizioni dei veicoli con i dati MQTT più recenti
   * Cerca solo nei servizi MQTT (localStorage commentato)
   */
  public refreshAllVehiclesWithMqtt(): void {
    console.log('[GENERAL-MAP] Inizio processo di aggiornamento veicoli con dati MQTT');

    const currentVehicles = this.veicleList();
    let updatedCount = 0;

    // Itera attraverso tutti i veicoli e cerca aggiornamenti MQTT
    const updatedVehicles = currentVehicles.map((vehicle) => {
      // Prende i dati solo dal servizio MQTT
      const mqttPosition = this.getMqttPositionFromService(vehicle.id);

      // LOCALSTORAGE COMMENTATO - usa solo MQTT Service
      // const localStoragePosition = !mqttPosition
      //   ? this.getMqttPositionFromLocalStorage(vehicle.id)
      //   : null;

      // Usa solo i dati MQTT (no localStorage)
      const latestPosition = mqttPosition; // || localStoragePosition;

      if (latestPosition) {
        console.log('[GENERAL-MAP] Posizione MQTT aggiornata per veicolo:', vehicle.licensePlate);
        updatedCount++;

        // Crea il veicolo aggiornato con la nuova posizione
        return {
          ...vehicle,
          lastPosition: {
            ...(vehicle.lastPosition ?? {}),
            latitude: latestPosition.latitude,
            longitude: latestPosition.longitude,
            speed: latestPosition.speed || 0,
            heading: latestPosition.heading || 0,
            timestamp: latestPosition.timestamp ?? latestPosition.time ?? Date.now(),
          },
        };
      }

      // Restituisce il veicolo originale se non ci sono aggiornamenti MQTT
      return vehicle;
    });

    // Aggiorna la lista dei veicoli con i dati MQTT
    this.veicleList.set(updatedVehicles);

    console.log(
      '[GENERAL-MAP] Aggiornamento MQTT completato -',
      updatedCount,
      'veicoli aggiornati su',
      currentVehicles.length,
      'totali'
    );

    // Mostra notifica toast basata sui risultati
    try {
      // Aggiorna i marker sulla mappa preservando la vista corrente
      this.addVeicleMarkers(true);

      // Determina il messaggio e tipo di notifica
      if (updatedCount > 0) {
        const message = `Posizioni aggiornate: ${updatedCount} veicoli`;
        this.showToastNotification(message, 'success');
      } else {
        const message = 'Nessun aggiornamento disponibile';
        this.showToastNotification(message, 'success');
      }
    } catch (error) {
      console.error('[GENERAL-MAP] Errore durante aggiornamento marker:', error);
      this.showToastNotification("Errore durante l'aggiornamento", 'error');
    }
  }

  /**
   * Cerca la posizione del veicolo nel signal del servizio MQTT
   * @param vehicleId - ID del veicolo da cercare
   * @returns Posizione MQTT se trovata, null altrimenti
   */
  private getMqttPositionFromService(vehicleId: any): any {
    try {
      const mqttPositions = this.mqttService.positionVeiclesList();
      const position = mqttPositions.find((pos) => pos.vehicleId === vehicleId);

      if (position) {
        console.log(`Posizione trovata nel service per veicolo ID ${vehicleId}`);
        return position;
      }

      console.log(`Nessuna posizione per veicolo ID ${vehicleId}`);
      return null;
    } catch (error) {
      console.error('Errore durante la ricerca ', error);
      return null;
    }
  }

  /**
   * METODO COMMENTATO - LocalStorage non più utilizzato
   * Cerca la posizione del veicolo nel localStorage
   * @param vehicleId - ID del veicolo da cercare
   * @returns Posizione MQTT se trovata, null altrimenti
   */
  /*
  private getMqttPositionFromLocalStorage(vehicleId: any): any {
    try {
      // Prova prima con l'ID del veicolo come chiave
      let storedPosition = localStorage.getItem(vehicleId.toString());

      if (storedPosition) {
        const position = JSON.parse(storedPosition);
        console.log(`Posizione trovata in localStorage per veicolo ID ${vehicleId}`);
        return position;
      }

      // Se non trovato, prova con la lista generale MQTT
      const mqttListData = localStorage.getItem('lista');
      if (mqttListData) {
        const mqttList = JSON.parse(mqttListData);
        const position = mqttList.find((pos: any) => pos.vehicleId === vehicleId);

        if (position) {
          console.log(`Posizione trovata nella lista MQTT per veicolo ID ${vehicleId}`);
          return position;
        }
      }

      console.log(`Nessuna posizione in localStorage per veicolo ID ${vehicleId}`);
      return null;
    } catch (error) {
      console.error('Errore leggendo localStorage:', error);
      return null;
    }
  }
  */

  /**
   * Metodo helper per contare veicoli per stati specifici (per debugging)
   * @param vehicles - Array di veicoli da analizzare
   * @param statuses - Array di stati da cercare
   * @returns Conteggio dei veicoli che corrispondono agli stati
   */
  private countVehiclesByStatus(vehicles: Veicles[], statuses: string[]): number {
    return vehicles.filter((veicle) => {
      const status = veicle.status?.toLowerCase().trim() || '';
      // Usa controllo esatto invece di includes per evitare false positive
      return statuses.some((s) => status === s.toLowerCase());
    }).length;
  }

  /**
   * Conta il numero di veicoli che hanno una posizione valida
   * Utile per le statistiche mostrate nell'interfaccia
   *
   * @returns Numero di veicoli con coordinate valide
   */
   public getVeiclesWithPosition(): number {
    return this.veicleList().filter(
      (veicle) =>
        veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude
    ).length;
  }

  /**
   * Conta i veicoli online/attivi (stati che corrispondono ai colori verdi)
   * @returns Numero di veicoli online/attivi
   */
   public getVeiclesOnline(): number {
    return this.veicleList().filter((v) => this.normalizeStatus(v.status) === 'active').length;
  }

  /**
   * Conta i veicoli offline/inattivi (stati che corrispondono ai colori rossi)
   * @returns Numero di veicoli offline/inattivi
   */
 

  public getVeiclesOffline(): number {
    return this.veicleList().filter((v) => {
      const s = this.normalizeStatus(v.status);
      return s === 'inactive';
    }).length;
  }

  /**
   * Conta i veicoli in manutenzione (stati che corrispondono ai colori gialli)
   * @returns Numero di veicoli in manutenzione
   */
 public getVeiclesMaintenance(): number {
    return this.veicleList().filter((veicle) => {
      const status = veicle.status?.toLowerCase().trim() || '';
      // Controllo esatto per manutenzione
      return status === 'maintenance' || status === 'Manutenzione';
    }).length;
  }

  backToDashboard() {
    console.log('[GENERAL-MAP] Ritorno alla dashboard con cache sincronizzata');

    // // Assicura che la cache dashboard sia aggiornata con i dati correnti
    // const currentVehicles = this.veicleList();
    // if (currentVehicles.length > 0) {
    //   this.cacheService.syncDashboardFromMap(currentVehicles);
    // }

    this.router.navigate(['/dashboard']);
  }

  /**
   * Inizializza i layer per la mappa (normale e satellite)
   */
  private initMapLayers(): void {
    // Layer stradale (OpenStreetMap)
    this.streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 4,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    // Layer satellite (Esri World Imagery)
    this.satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        minZoom: 4,
        attribution:
          '&copy; <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
      }
    );

    // Imposta il layer predefinito (stradale)
    this.currentBaseLayer = this.streetLayer;
    this.currentBaseLayer.addTo(this.map);

    console.log('[GENERAL-MAP] Layer mappa inizializzati - Modalità stradale attiva');
  }

  /**
   * Cambia la vista della mappa tra normale e satellite
   */
  toggleMapView(): void {
    // Rimuove il layer attuale
    this.map.removeLayer(this.currentBaseLayer);

    // Cambia il layer e aggiorna lo stato
    if (this.isSatelliteView()) {
      // Passa alla vista stradale
      this.currentBaseLayer = this.streetLayer;
      this.isSatelliteView.set(false);
      console.log('[GENERAL-MAP] Cambio a vista stradale');
    } else {
      // Passa alla vista satellite
      this.currentBaseLayer = this.satelliteLayer;
      this.isSatelliteView.set(true);
      console.log('[GENERAL-MAP] Cambio a vista satellite');
    }

    // Aggiunge il nuovo layer
    this.currentBaseLayer.addTo(this.map);
  }

  /**
   * Mostra una notifica toast
   */
  private showToastNotification(
    message: string,
    type: 'success' | 'error',
    duration: number = 3000
  ): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);

    // Auto-nascondi dopo la durata specificata
    setTimeout(() => {
      this.hideToastNotification();
    }, duration);
  }

  /**
   * Nasconde la notifica toast
   */
  private hideToastNotification(): void {
    this.showToast.set(false);
  }
}
