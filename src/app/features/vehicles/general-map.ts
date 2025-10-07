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
          <!-- <div class="stat-card maintenance-status">
            <div class="stat-content">
              <span class="stat-label">Manutenzione</span>
              <span class="stat-value">{{ getVeiclesMaintenance() }}</span>
            </div>
          </div> -->
        </div>
      </div>

      <!-- Container per la mappa Leaflet -->
      <div class="map-wrapper">
        <div id="map" class="leaflet-map"></div>
      </div>
    </div>
  `,
  styles: `
    /* === STILI PRINCIPALI === */
    .map-container {
      margin: 0 auto;
      padding: 20px;
      font-family: 'Arial', sans-serif;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 123, 255, 0.1);
      border: 2px solid #007bff;
      height:40%;
    }

    /* === HEADER DELLA MAPPA === */
    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .map-header h2 {
      color: #007bff;
      margin: 0;
      font-size: 24px;
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

    /* === DESCRIZIONE === */
    .description {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #007bff;
    }

    .description p {
      margin: 0;
      color: #495057;
      line-height: 1.5;
    }

    /* === SEZIONE STATISTICHE === */
    .stats-section {
      margin-bottom: 20px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 15px;
      border-left: 4px solid #007bff;
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

    /* === LEGENDA === */
    .legend-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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

    /* === MAPPA === */
    .map-wrapper {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .leaflet-map {
      height: 500px;
      width: 100%;
      border-radius: 8px;
      border: 2px solid #dee2e6;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }

    /* === RESPONSIVE DESIGN === */
    @media (max-width: 768px) {
      .map-container {
        margin: 10px;
        padding: 15px;
      }

      .map-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 15px;
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
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .legend-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .leaflet-map {
        height: 400px;
      }
    }

    @media (max-width: 480px) {
      .map-header h2 {
        font-size: 20px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .legend-grid {
        grid-template-columns: 1fr;
      }

      .leaflet-map {
        height: 350px;
      }

      .stat-card {
        padding: 15px;
      }

      .stat-icon {
        font-size: 20px;
        width: 35px;
        height: 35px;
      }

      .stat-value {
        font-size: 18px;
      }
    }
  `,
})
export class GeneralMap implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private markers: L.Marker[] = []; // Array per tenere traccia dei marker
  router = inject(Router);
  // Input per ricevere il veicolo selezionato dal componente padre
  selectedVeicle = input<Veicles>();

  // Timer per l'aggiornamento automatico ogni 5 secondi
  private autoUpdateInterval: any = null;
  private readonly UPDATE_INTERVAL = 5000; // 5 secondi in millisecondi

  // Injection dei servizi e signal per i dati
  private veicleService = inject(VeicleService); // Servizio per dati dal database
  public mqttService = inject(MyMqttService); // Servizio per dati MQTT (pubblico per template)
  veicleList = signal<Veicles[]>([]);

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
          `Veicolo selezionato cambiato: ${selected.licensePlate} (Stato: ${selected.status})`
        );
        this.addVeicleMarkers(true); // Preserva la vista quando cambia il veicolo selezionato
      }
    });
  }

  ngOnInit(): void {
    // Carica i dati dei veicoli
    this.loadVeicles();
    // Avvia l'aggiornamento automatico ogni 5 secondi
    this.startAutoUpdate();
    // Effect per reagire ai cambiamenti del veicolo selezionato
  }

  ngAfterViewInit(): void {
    // Configura le icone di Leaflet per evitare errori 404
    this.setupLeafletIcons();
    // Inizializza la mappa dopo che la vista è stata caricata
    this.initMap();
  }

  ngOnDestroy(): void {
    // Ferma l'aggiornamento automatico quando il componente viene distrutto
    // per evitare memory leak e chiamate API non necessarie
    this.stopAutoUpdate();
  }

  private startAutoUpdate(): void {
    this.stopAutoUpdate();

    console.log('Avvio aggiornamento automatico ogni 5 secondi');

    this.autoUpdateInterval = setInterval(() => {
      console.log('Aggiornamento automatico posizioni veicoli...');
      this.loadVeicles(true); // Preserva la vista della mappa durante l'auto-update
    }, this.UPDATE_INTERVAL);
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
    console.log('🗺️ Caricamento TUTTI i veicoli per mappa generale');

    // Per la mappa generale, richiediamo TUTTI i veicoli con pageSize molto alto
    this.veicleService.getListVeicle(1, 1000).subscribe((response) => {
      console.log(
        '✅ Veicoli caricati:',
        response.items.length,
        'di',
        response.totalCount,
        'totali'
      );

      const mqttPositions = this.mqttService.positionVeiclesList();
      console.log('Posizioni MQTT disponibili:', mqttPositions.length);

      // COPILOT DA CANCELLARE
      console.log('📡 === ANALISI COMPLETA DATI MQTT ===');
      if (mqttPositions.length > 0) {
        mqttPositions.forEach((mqttData, index) => {
          console.log(`📍 MQTT ${index + 1}:`, {
            vehicleId: mqttData.vehicleId,
            tutte_le_proprietà: Object.keys(mqttData),
            dati_completi: mqttData,
          });

          // Cerca qualsiasi proprietà che potrebbe contenere lo stato
          Object.keys(mqttData).forEach((key) => {
            if (
              key.toLowerCase().includes('status') ||
              key.toLowerCase().includes('state') ||
              key.toLowerCase().includes('stato')
            ) {
              console.log(`🔍 Possibile campo stato trovato: ${key} = ${(mqttData as any)[key]}`);
            }
          });
        });
      } else {
        console.log('📡 ❌ Nessun dato MQTT ricevuto');
      }
      console.log('📡 === FINE ANALISI MQTT ===');

      const updatedVeicles = this.mergeVeiclesWithMqttData(response.items, mqttPositions);

      this.veicleList.set(updatedVeicles);
      console.log('Lista veicoli aggiornata con dati MQTT:', updatedVeicles.length);

      if (this.map) {
        this.addVeicleMarkers(preserveMapView);
      }
    });
  }
  //FINE COPILOT DA CANCELLARE

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

        if (mqttTimestamp > dbTimestamp) {
          console.log(`Aggiornamento posizione per ${veicle.licensePlate} con dati MQTT`);

          return {
            ...veicle,
            lastPosition: mqttPosition,
          };
        }
      }

      return veicle;
    });
  }

  private initMap(): void {
    // Centra la mappa su Roma con zoom fisso
    this.map = L.map('map').setView([41.9028, 12.4964], 12);

    // Aggiunge il layer delle tile di OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 15, // zoom massimo
      minZoom: 4, // zoom minimo
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

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
          `Mostrato veicolo selezionato: ${selectedVeicle.licensePlate} (Stato: ${selectedVeicle.status})`
        );
      } else {
        console.warn('Il veicolo selezionato non ha una posizione valida');
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

    console.log(`Aggiunti ${this.markers.length} marker sulla mappa`);
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
    // Normalizza lo stato a lowercase per il confronto
    const normalizedStatus = status?.toLowerCase().trim() || 'unknown';

    // Cerca una corrispondenza diretta
    if (this.statusColorMap[normalizedStatus]) {
      return this.statusColorMap[normalizedStatus];
    }

    // Cerca corrispondenze parziali per stati compositi
    for (const [key, color] of Object.entries(this.statusColorMap)) {
      if (normalizedStatus.includes(key)) {
        return color;
      }
    }

    // Ritorna il colore di default se nessuna corrispondenza
    console.log(`Stato sconosciuto: ${status}, uso colore di default`);
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

  /**
   * Aggiorna le posizioni dei veicoli con i dati MQTT più recenti
   * Cerca solo nei servizi MQTT (localStorage commentato)
   */
  public refreshAllVehiclesWithMqtt(): void {
    console.log('Inizio aggiornamento di tutti i veicoli con dati MQTT');

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
        console.log(`Posizione aggiornata trovata per ${vehicle.licensePlate}:`, latestPosition);
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
      `Aggiornamento completato. ${updatedCount} veicoli aggiornati su ${currentVehicles.length}`
    );

    // Aggiorna i marker sulla mappa preservando la vista corrente
    this.addVeicleMarkers(true);
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
    return this.veicleList().filter((veicle) => {
      const status = veicle.status?.toLowerCase().trim() || '';
      // Controllo esatto per evitare che "inactive" venga riconosciuto come "active"
      return status === 'online' || status === 'active';
    }).length;
  }

  /**
   * Conta i veicoli offline/inattivi (stati che corrispondono ai colori rossi)
   * @returns Numero di veicoli offline/inattivi
   */
  public getVeiclesOffline(): number {
    return this.veicleList().filter((veicle) => {
      const status = veicle.status?.toLowerCase().trim() || '';
      // Controllo esatto per stati offline/inattivi
      return status === 'offline' || status === 'inactive';
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
      return status === 'maintenance' || status === 'manutenzione';
    }).length;
  }

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
