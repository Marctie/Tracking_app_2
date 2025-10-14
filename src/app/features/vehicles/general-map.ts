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
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-general-map',
  imports: [],
  template: `
    <div class="map-container">
      <!-- Header della mappa con titolo e controlli -->
      <div class="map-header">
        <h2>Real-Time Vehicle Map</h2>
        <div class="header-controls">
          <div class="control-buttons">
            <div class="map-view-selector">
              <label class="view-selector-label">Vista Mappa:</label>
              <select
                class="view-selector-dropdown"
                [value]="currentMapView()"
                (change)="changeMapView($event)"
              >
                <option value="street">Street</option>
                <option value="satellite">Satellite</option>
                <option value="cycle">Cycling</option>
              </select>
            </div>
            <button class="mqtt-refresh-btn primary" (click)="refreshAllVehiclesWithMqtt()">
              Update Positions
            </button>
            <button class="mqtt-refresh-btn" (click)="backToDashboard()">
              Back to Dashboard
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

      <!-- Vehicle statistics with status counters -->
      <div class="stats-section">
        <div class="stats-grid">
          <!-- Total vehicles -->
          <div class="stat-card">
            <div class="stat-content">
              <span class="stat-label">Total Vehicles</span>
              <span class="stat-value">{{ veicleList().length }}</span>
            </div>
          </div>

          <!-- Vehicles with position -->
          <div class="stat-card">
            <div class="stat-content">
              <span class="stat-label">With Position</span>
              <span class="stat-value">{{ getVeiclesWithPosition() }}</span>
            </div>
          </div>

          <!-- Online/active vehicles -->
          <div class="stat-card online-status">
            <div class="stat-content">
              <span class="stat-label">Online</span>
              <span class="stat-value">{{ getVeiclesOnline() }}</span>
            </div>
          </div>

          <!-- Offline/inactive vehicles -->
          <div class="stat-card offline-status">
            <div class="stat-content">
              <span class="stat-label">Offline</span>
              <span class="stat-value">{{ getVeiclesOffline() }}</span>
            </div>
          </div>

          <div class="stat-card maintenance-status">
            <div class="stat-content">
              <span class="stat-label">Maintenance</span>
              <span class="stat-value">{{ getVeiclesMaintenance() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Container per la mappa Leaflet -->
      <div class="map-wrapper">
        <div id="map" class="leaflet-map"></div>
      </div>

      <!-- Toast Notification -->
      @if (showToast()) {
      <div class="toast-notification" [class]="'toast-' + toastType()">
        <div class="toast-content">
          <span class="toast-message">{{ toastMessage() }}</span>
          <button class="toast-close" (click)="hideToastNotification()">×</button>
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

    /* === SELETTORE VISTA MAPPA === */
    .map-view-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.9);
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #dee2e6;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .view-selector-label {
      font-size: 12px;
      font-weight: 500;
      color: #495057;
      white-space: nowrap;
    }

    .view-selector-dropdown {
      padding: 4px 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      background-color: white;
      font-size: 12px;
      color: #495057;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    }

    .view-selector-dropdown:hover {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .view-selector-dropdown:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
 
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

      .map-view-selector {
        padding: 4px 8px;
        gap: 6px;
      }

      .view-selector-label {
        font-size: 11px;
      }

      .view-selector-dropdown {
        font-size: 11px;
        padding: 3px 6px;
        min-width: 90px;
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

    /* === STILI TOAST NOTIFICATION === */
    .toast-notification {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 2000;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
      min-width: 300px;
      max-width: 400px;
    }

    .toast-success {
      background: linear-gradient(135deg, #28a745, #34ce57);
      color: white;
    }

    .toast-error {
      background: linear-gradient(135deg, #dc3545, #e74c3c);
      color: white;
    }

    .toast-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px 20px;
    }

    .toast-message {
      font-weight: 500;
      font-size: 14px;
      flex: 1;
    }

    .toast-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      margin-left: 15px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s ease;
    }

    .toast-close:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Responsive for toast on mobile */
    @media (max-width: 768px) {
      .toast-notification {
        top: 70px;
        right: 10px;
        left: 10px;
        min-width: auto;
        max-width: none;
      }
    }
  `,
})
export class GeneralMap implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private markers: L.Marker[] = []; // Array to track markers
  router = inject(Router);
  // Input to receive selected vehicle from parent component
  selectedVeicle = input<Veicles>();

  // Timer for configurable automatic update
  private autoUpdateInterval: any = null;

  // Service injection and signals for data
  private veicleService = inject(VeicleService); // Servizio per dati dal database
  public mqttService = inject(MyMqttService); // Servizio per dati MQTT (pubblico per template)
  private configService = inject(ConfigService); // Servizio per configurazione dinamica
  veicleList = signal<Veicles[]>([]);
  // Signal to manage toast notifications
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');

  // Layer management for map view (street, satellite, cycling)
  private currentBaseLayer!: L.TileLayer;
  private streetLayer!: L.TileLayer;
  private satelliteLayer!: L.TileLayer;
  private cycleLayer!: L.TileLayer;
  currentMapView = signal<'street' | 'satellite' | 'cycle'>('street');

  // Color map for vehicle states
  private statusColorMap: { [key: string]: string } = {
    active: '#28a745', // Green for active vehicles
    online: '#28a745',
    inactive: '#dc3545', // Red for inactive vehicles
    offline: '#dc3545', // Red for offline vehicles
    maintenance: '#ffc107', // Yellow for maintenance
    default: '#6c757d', // Gray for unknown states
  };

  constructor() {
    effect(() => {
      const selected = this.selectedVeicle();
      if (this.map && selected) {
        console.log(
          `Selected vehicle changed: ${selected.licensePlate} (Status: ${selected.status})`
        );
        this.addVeicleMarkers(true); // Preserve view when vehicle changes
      }
    });
  }

  ngOnInit(): void {
    // Load vehicle data
    this.loadVeicles();
    // Start automatic update every 5 seconds
    this.startAutoUpdate();

    this.mqttService.subscribeAndTrack('vehicles/+/status', (msg) => {
      const payload = JSON.parse(msg.payload.toString());
      console.log('MQTT message received (status):', payload);

      this.mqttService.ingestStatusMessage(msg);
    });
  }

  ngAfterViewInit(): void {
    // Configura le icone di Leaflet per evitare errori 404
    this.setupLeafletIcons();
    // Initialize map after view has been loaded
    this.initMap();
  }

  ngOnDestroy(): void {
    // Stop automatic update when component is destroyed
    // per evitare memory leak e chiamate API non necessarie
    this.stopAutoUpdate();
  }

  private startAutoUpdate(): void {
    this.stopAutoUpdate();

    // Ottieni l'intervallo di aggiornamento dalla configurazione
    const updateInterval = this.configService.getAutoRefreshInterval();
    console.log(`[GENERAL-MAP] Avvio aggiornamento automatico ogni ${updateInterval}ms`);

    this.autoUpdateInterval = setInterval(() => {
      console.log('[GENERAL-MAP] Esecuzione aggiornamento automatico posizioni veicoli');
      this.loadVeicles(true); // Preserve map view during auto-update
    }, updateInterval);
  }

  private stopAutoUpdate(): void {
    if (this.autoUpdateInterval) {
      console.log('Fermo aggiornamento automatico');
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
        // position: as you already do
        const p = mqttPositions.find((mp) => mp.vehicleId === v.id);
        let next = { ...v };

        if (p) {
          const tPos = new Date(p.timestamp).getTime();
          const tDb = new Date(v.lastPosition?.timestamp ?? 0).getTime();
          if (tPos > tDb) next.lastPosition = p;
        }
        const s = statusesById[v.id]?.status;
        if (s) next.status = this.normalizeStatus(s);

        return next;
      });

      this.veicleList.set(updatedVeicles);
      if (this.map) this.addVeicleMarkers(preserveMapView);
    });
  }

  private mergeVeiclesWithMqttData(
    dbVeicles: Veicles[],
    mqttPositions: VeiclePosition[],
    mqttStatuses: { vehicleId: number; status: string; timestamp: string | number }[]
  ): Veicles[] {
    return dbVeicles.map((v) => {
      let next = { ...v };

      const pos = mqttPositions.find((p) => p.vehicleId === v.id);
      if (pos) {
        const tPos = new Date(pos.timestamp).getTime();
        const tDb = new Date(v.lastPosition?.timestamp ?? 0).getTime();
        if (tPos > tDb) next.lastPosition = pos;
      }

      const st = mqttStatuses.find((s) => s.vehicleId === v.id);
      if (st?.status) {
        // se vuoi, puoi anche confrontare i timestamp se tieni un "statusUpdatedAt"
        next.status = st.status;
      }

      return next;
    });
  }
  private initMap(): void {
    // Centra la mappa su Roma con zoom fisso
    this.map = L.map('map').setView([41.9028, 12.4964], 12);

    // Inizializza i layer per le tre viste della mappa
    this.initMapLayers();

    // Aggiunge i marker dei veicoli
    if (this.veicleList().length > 0) {
      this.addVeicleMarkers();
    }
  }

  /**
   * Inizializza i layer per le tre viste della mappa
   */
  private initMapLayers(): void {
    // Layer stradale
    this.streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 4,
    });

    // Layer satellite
    this.satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        minZoom: 4,
      }
    );

    // Layer ciclabile
    this.cycleLayer = L.tileLayer(
      'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        minZoom: 4,
      }
    );

    // Imposta il layer predefinito (stradale)
    this.currentBaseLayer = this.streetLayer;
    this.currentBaseLayer.addTo(this.map);

    console.log('[GENERAL-MAP] Layer mappa inizializzati - Vista stradale attiva');
  }

  /**
   * Cambia la vista della mappa in base alla selezione
   */
  changeMapView(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newView = target.value as 'street' | 'satellite' | 'cycle';

    // Rimuove il layer attuale
    this.map.removeLayer(this.currentBaseLayer);

    // Seleziona e aggiunge il nuovo layer
    switch (newView) {
      case 'street':
        this.currentBaseLayer = this.streetLayer;
        console.log('[GENERAL-MAP] Passaggio a vista stradale');
        break;
      case 'satellite':
        this.currentBaseLayer = this.satelliteLayer;
        console.log('[GENERAL-MAP] Passaggio a vista satellite');
        break;
      case 'cycle':
        this.currentBaseLayer = this.cycleLayer;
        console.log('[GENERAL-MAP] Passaggio a vista ciclabile');
        break;
    }

    // Aggiunge il nuovo layer
    this.currentBaseLayer.addTo(this.map);

    // Aggiorna il signal
    this.currentMapView.set(newView);
  }

  private addVeicleMarkers(preserveCurrentView: boolean = false): void {
    this.clearMarkers();

    // Use selectedVeicle if available to show a single vehicle
    if (this.selectedVeicle()) {
      const selectedVeicle = this.selectedVeicle()!;

      if (
        selectedVeicle.lastPosition &&
        selectedVeicle.lastPosition.latitude &&
        selectedVeicle.lastPosition.longitude
      ) {
        this.addVeicleMarker(selectedVeicle);

        // Center map on selected vehicle only if view should not be preserved
        if (!preserveCurrentView) {
          const position = selectedVeicle.lastPosition;
          this.map.setView([position.latitude, position.longitude], 15);
        }

        console.log(
          `Showing selected vehicle: ${selectedVeicle.licensePlate} (Status: ${selectedVeicle.status})`
        );
      } else {
        console.warn('Selected vehicle does not have a valid position');
      }

      return;
    }

    // Altrimenti mostra tutti i veicoli disponibili
    this.veicleList().forEach((veicle) => {
      if (veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude) {
        this.addVeicleMarker(veicle);
      }
    });

    // Adjust view to include all markers only if current view should not be preserved
    if (this.markers.length > 0 && !preserveCurrentView) {
      const group = new L.FeatureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }

    console.log(`Aggiunti ${this.markers.length} marker sulla mappa`);
  }

  private addVeicleMarker(veicle: Veicles): void {
    const position = veicle.lastPosition;

    // Determine marker color based on vehicle status
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

    // Popup content with vehicle information and status
    const popupContent = `
      <div style="font-family: Arial, sans-serif; min-width: 250px;">
        <h4 style="margin: 0 0 10px 0; color: #007bff; text-align: center;">
           ${veicle.licensePlate}
        </h4>
       
        <!-- Vehicle status indicator -->
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
          <div><strong>Model:</strong> ${veicle.model}</div>
          <div><strong>Brand:</strong> ${veicle.brand}</div>
          <div><strong>Speed:</strong> ${position.speed} km/h</div>
          <div><strong>Direction:</strong> ${position.heading}°</div>
          <div><strong>Coordinates:</strong><br>
            &nbsp;&nbsp;Lat: ${position.latitude.toFixed(6)}<br>
            &nbsp;&nbsp;Lng: ${position.longitude.toFixed(6)}
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
            <strong>Last Update:</strong><br>
            ${this.formatDate(position.timestamp)}
          </div>
        </div>
      </div>
    `;

    // Simple popup - always stays open
    marker.bindPopup(popupContent, {
      closeButton: true, // Mostra la X per chiudere
      autoClose: false, // Non chiudere automaticamente
      closeOnClick: false, // Non chiudere al click mappa
    });

    this.markers.push(marker);
  }

  /**
   * Determines marker color based on vehicle status
   * @param status - The vehicle status
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

    console.log(`Unknown status: ${status}, using default color`);
    return this.statusColorMap['default'];
  }

  private clearMarkers(): void {
    // Save open popups before removing markers
    const openPopups: Array<{ content: string; latlng: L.LatLng }> = [];

    this.markers.forEach((marker) => {
      if (marker.isPopupOpen()) {
        const popup = marker.getPopup();
        if (popup) {
          openPopups.push({
            content: popup.getContent() as string,
            latlng: marker.getLatLng(),
          });
        }
      }
      this.map.removeLayer(marker);
    });

    this.markers = [];

    // Reopen popups that were open
    setTimeout(() => {
      openPopups.forEach((popupData) => {
        L.popup({
          closeButton: true,
          autoClose: false,
          closeOnClick: false,
        })
          .setLatLng(popupData.latlng)
          .setContent(popupData.content)
          .openOn(this.map);
      });
    }, 100);
  }

  /**
   * Chiude tutti i popup aperti sulla mappa
   */
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
   * Updates vehicle positions with latest MQTT data
   * Cerca solo nei servizi MQTT (localStorage commentato)
   */
  public refreshAllVehiclesWithMqtt(): void {
    const statusesById = this.mqttService.statusById();
    let updatedCount = 0;
    const updated = this.veicleList().map((v) => {
      const mqttPos = this.getMqttPositionFromService(v.id);
      const s = statusesById[v.id]?.status;

      return {
        ...v,
        status: s ? this.normalizeStatus(s) : v.status,
        lastPosition: mqttPos
          ? {
              ...(v.lastPosition ?? {}),
              latitude: mqttPos.latitude,
              longitude: mqttPos.longitude,
              speed: mqttPos.speed ?? 0,
              heading: mqttPos.heading ?? 0,
              timestamp: mqttPos.timestamp ?? mqttPos.time ?? Date.now(),
            }
          : v.lastPosition,
      };
    });
    // Mostra notifica toast basata sui risultati
    try {
      // Update markers on map preserving current view
      this.addVeicleMarkers(true);

      // Determina il messaggio e tipo di notifica
      if (updatedCount > 0) {
        const message = `Positions updated: ${updatedCount} vehicles`;
        this.showToastNotification(message, 'success');
      } else {
        const message = 'Update Successful';
        this.showToastNotification(message, 'success');
      }
    } catch (error) {
      console.error('[GENERAL-MAP] Error during marker update:', error);
      this.showToastNotification('Error during update', 'error');
    }

    this.veicleList.set(updated);
    this.addVeicleMarkers(true);
  }

  private showToastNotification(
    message: string,
    type: 'success' | 'error',
    duration: number = 3000
  ): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);

    // Auto-hide after specified duration
    setTimeout(() => {
      this.hideToastNotification();
    }, duration);
  }

  /**
   * Hides the toast notification
   */
  hideToastNotification(): void {
    this.showToast.set(false);
  }
  /**
   * Search for vehicle position in MQTT service signal
   * @param vehicleId - Vehicle ID to search for
   * @returns MQTT position if found, null otherwise
   */
  private getMqttPositionFromService(vehicleId: any): any {
    try {
      const mqttPositions = this.mqttService.positionVeiclesList();
      const position = mqttPositions.find((pos) => pos.vehicleId === vehicleId);

      if (position) {
        console.log(`Position found in service for vehicle ID ${vehicleId}`);
        return position;
      }

      console.log(`No position for vehicle ID ${vehicleId}`);
      return null;
    } catch (error) {
      console.error('Errore durante la ricerca ', error);
      return null;
    }
  }

  /**
   * COMMENTED METHOD - LocalStorage no longer used
   * Search for vehicle position in localStorage
   * @param vehicleId - Vehicle ID to search for
   * @returns MQTT position if found, null otherwise
   */
  /*
  private getMqttPositionFromLocalStorage(vehicleId: any): any {
    try {
      // Try first with vehicle ID as key
      let storedPosition = localStorage.getItem(vehicleId.toString());
 
      if (storedPosition) {
        const position = JSON.parse(storedPosition);
        console.log(`Position found in localStorage for vehicle ID ${vehicleId}`);
        return position;
      }
 
      // Se non trovato, prova con la lista generale MQTT
      const mqttListData = localStorage.getItem('lista');
      if (mqttListData) {
        const mqttList = JSON.parse(mqttListData);
        const position = mqttList.find((pos: any) => pos.vehicleId === vehicleId);
 
        if (position) {
          console.log(`Position found in MQTT list for vehicle ID ${vehicleId}`);
          return position;
        }
      }
 
      console.log(`No position in localStorage for vehicle ID ${vehicleId}`);
      return null;
    } catch (error) {
      console.error('Errore leggendo localStorage:', error);
      return null;
    }
  }
  */

  /**
   * Helper method to count vehicles by specific statuses (for debugging)
   * @param vehicles - Array of vehicles to analyze
   * @param statuses - Array of statuses to search for
   * @returns Count of vehicles matching the statuses
   */
  private countVehiclesByStatus(vehicles: Veicles[], statuses: string[]): number {
    return vehicles.filter((veicle) => {
      const status = veicle.status?.toLowerCase().trim() || '';
      // Use exact check instead of includes to avoid false positives
      return statuses.some((s) => status === s.toLowerCase());
    }).length;
  }

  /**
   * Counts the number of vehicles that have a valid position
   * Useful for statistics shown in the interface
   *
   * @returns Number of vehicles with valid coordinates
   */
  public getVeiclesWithPosition(): number {
    return this.veicleList().filter(
      (veicle) =>
        veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude
    ).length;
  }

  /**
   * Counts online/active vehicles (statuses that correspond to green colors)
   * @returns Number of online/active vehicles
   */
  public getVeiclesOnline(): number {
    return this.veicleList().filter((v) => this.normalizeStatus(v.status) === 'active').length;
  }

  public getVeiclesOffline(): number {
    return this.veicleList().filter((v) => {
      const s = this.normalizeStatus(v.status);
      return s === 'inactive';
    }).length;
  }

  /**
   * Counts vehicles in maintenance (statuses that correspond to yellow colors)
   * @returns Number of vehicles in maintenance
   */
  public getVeiclesMaintenance(): number {
    return this.veicleList().filter((veicle) => {
      const status = veicle.status?.toLowerCase().trim() || '';
      // Controllo esatto per manutenzione
      return status === 'maintenance' || status === 'Manutenzione';
    }).length;
  }

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
