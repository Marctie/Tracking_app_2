import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import * as L from 'leaflet';
import { VeicleService } from '../../services/veicle-service';
import { MyMqttService } from '../../services/mymqtt-service';
import { Veicles } from '../../models/veicles';
import { VeiclePosition } from '../../models/veicle-position';

/**
 * Componente per la visualizzazione dei veicoli su mappa in tempo reale
 *
 * Funzionalità principali:
 * - Visualizza veicoli su mappa Leaflet centrata su Roma
 * - Combina dati dal database con aggiornamenti MQTT in tempo reale
 * - Aggiornamento automatico ogni 5 secondi
 * - Zoom fisso sulla zona di Roma
 * - Indicatori visivi per distinguere dati MQTT vs Database
 *
 * Flusso dati:
 * 1. Carica veicoli dal database tramite VeicleService
 * 2. Verifica se esistono posizioni più recenti via MQTT tramite MyMqttService
 * 3. Combina i due set di dati privilegiando i timestamp più recenti
 * 4. Aggiorna i marker sulla mappa ogni 5 secondi automaticamente
 */
@Component({
  selector: 'app-mappatest',
  imports: [],
  template: `
    <div class="map-container">
      <div class="map-header">
        <h2>Mappa Veicoli in Tempo Reale</h2>
        <div class="header-controls">
          <span class="auto-update-indicator">🔄 Aggiornamento automatico ogni 5s</span>
          <button class="refresh-btn" (click)="refreshVeicles()">🔄 Aggiorna Ora</button>
        </div>
      </div>
      <p>
        Visualizzazione delle posizioni dei veicoli dal database + aggiornamenti MQTT in tempo reale
      </p>

      <!-- Statistiche veicoli con info MQTT -->
      <div class="stats">
        <span class="stat-item">
          🚗 Veicoli totali: <strong>{{ veicleList().length }}</strong>
        </span>
        <span class="stat-item">
          📍 Con posizione: <strong>{{ getVeiclesWithPosition() }}</strong>
        </span>
        <span class="stat-item">
          📡 Posizioni MQTT: <strong>{{ mqttService.positionVeiclesList().length }}</strong>
        </span>
      </div>

      <!-- Container per la mappa Leaflet -->
      <div id="map"></div>
    </div>
  `,
  styles: `
    .map-container {
      padding: 20px;
      font-family: Arial, sans-serif;
      height:100%;
    }

    .map-container h2 {
      color: #007bff;
      margin: 0;
    }

    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .auto-update-indicator {
      font-size: 12px;
      color: #28a745;
      background-color: #d4edda;
      padding: 4px 8px;
      border-radius: 3px;
      border: 1px solid #c3e6cb;
    }

    .refresh-btn {
      padding: 8px 16px;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    .refresh-btn:hover {
      background-color: #218838;
    }

    .stats {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 5px;
      border-left: 4px solid #007bff;
    }

    .stat-item {
      color: #666;
      font-size: 14px;
    }

    .stat-item strong {
      color: #007bff;
    }

    .map-container p {
      color: #666;
      margin-bottom: 15px;
    }

    /* Contenitore della mappa con dimensioni fisse */
    #map { 
      height: 400px; 
      width: 100%;
      border: 2px solid #007bff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  `,
})
export class Mappatest implements AfterViewInit, OnInit, OnDestroy {
  private map!: L.Map;
  private markers: L.Marker[] = []; // Array per tenere traccia dei marker

  // Timer per l'aggiornamento automatico ogni 5 secondi
  private autoUpdateInterval: any = null;
  private readonly UPDATE_INTERVAL = 5000; // 5 secondi in millisecondi

  // Injection dei servizi e signal per i dati
  private veicleService = inject(VeicleService); // Servizio per dati dal database
  public mqttService = inject(MyMqttService); // Servizio per dati MQTT (pubblico per template)
  veicleList = signal<Veicles[]>([]);

  ngOnInit(): void {
    // Carica i dati dei veicoli
    this.loadVeicles();

    // Avvia l'aggiornamento automatico ogni 5 secondi
    this.startAutoUpdate();
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

  /**
   * Avvia l'aggiornamento automatico delle posizioni dei veicoli
   * Viene chiamato ogni 5 secondi per aggiornare i dati in tempo reale
   */
  private startAutoUpdate(): void {
    // Se esiste già un timer, lo fermiamo prima di crearne uno nuovo
    this.stopAutoUpdate();

    console.log('🚀 Avvio aggiornamento automatico ogni 5 secondi');

    // Crea un nuovo timer che si ripete ogni 5 secondi
    this.autoUpdateInterval = setInterval(() => {
      console.log('🔄 Aggiornamento automatico posizioni veicoli...');
      this.loadVeicles(); // Ricarica i dati dal server
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Ferma l'aggiornamento automatico delle posizioni
   * Utile per evitare memory leak quando il componente viene distrutto
   */
  private stopAutoUpdate(): void {
    if (this.autoUpdateInterval) {
      console.log('⏹️ Fermo aggiornamento automatico');
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
      shadowUrl: null, // Rimuove completamente l'ombra
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }

  /**
   * Carica i veicoli dal database e li combina con le posizioni MQTT aggiornate
   * Questo metodo unisce i dati statici (database) con quelli dinamici (MQTT)
   */
  private loadVeicles(): void {
    console.log('📂 Caricamento veicoli dal database...');

    // Carica i veicoli dal servizio database
    this.veicleService.getListVeicle().subscribe((response) => {
      console.log('✅ Veicoli dal database:', response.items.length);

      // Ottieni le posizioni MQTT aggiornate
      const mqttPositions = this.mqttService.positionVeiclesList();
      console.log('📡 Posizioni MQTT disponibili:', mqttPositions.length);

      // Combina i dati del database con le posizioni MQTT aggiornate
      const updatedVeicles = this.mergeVeiclesWithMqttData(response.items, mqttPositions);

      // Aggiorna il signal con i dati combinati
      this.veicleList.set(updatedVeicles);
      console.log('🔄 Lista veicoli aggiornata con dati MQTT:', updatedVeicles.length);

      // Se la mappa è già inizializzata, aggiorna i marker
      if (this.map) {
        this.addVeicleMarkers();
      }
    });
  }

  /**
   * Combina i dati dei veicoli dal database con le posizioni MQTT più recenti
   * Se un veicolo ha una posizione MQTT più recente, la usa al posto di quella del database
   *
   * @param dbVeicles - Array dei veicoli dal database
   * @param mqttPositions - Array delle posizioni MQTT aggiornate
   * @returns Array dei veicoli con posizioni aggiornate
   */
  private mergeVeiclesWithMqttData(
    dbVeicles: Veicles[],
    mqttPositions: VeiclePosition[]
  ): Veicles[] {
    return dbVeicles.map((veicle) => {
      // Cerca se esiste una posizione MQTT per questo veicolo
      const mqttPosition = mqttPositions.find((position) => position.vehicleId === veicle.id);

      if (mqttPosition) {
        // Se esiste una posizione MQTT, verifica se è più recente
        const dbTimestamp = veicle.lastPosition?.timestamp
          ? new Date(veicle.lastPosition.timestamp)
          : new Date(0);
        const mqttTimestamp = new Date(mqttPosition.timestamp);

        if (mqttTimestamp > dbTimestamp) {
          console.log(`🔄 Aggiornamento posizione per ${veicle.licensePlate} con dati MQTT`);

          // Crea una copia del veicolo con la posizione MQTT aggiornata
          return {
            ...veicle,
            lastPosition: mqttPosition,
          };
        }
      }

      // Se non c'è una posizione MQTT più recente, mantieni quella del database
      return veicle;
    });
  }

  private initMap(): void {
    // Centra la mappa su Roma con zoom fisso
    // Coordinate di Roma: Latitudine 41.9028, Longitudine 12.4964
    // Zoom level 12 per vedere bene la zona metropolitana di Roma
    this.map = L.map('map').setView([41.9028, 12.4964], 12);

    // Aggiunge il layer delle tile di OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 15, // Limita lo zoom massimo per mantenere il focus su Roma
      minZoom: 4, // Limita lo zoom minimo per non allontanarsi troppo da Roma
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // Aggiunge i marker dei veicoli se i dati sono già caricati
    if (this.veicleList().length > 0) {
      this.addVeicleMarkers();
    }
  }

  /**
   * Aggiunge marker per tutti i veicoli che hanno una posizione valida
   * Rimuove prima i marker esistenti per evitare duplicati
   */
  private addVeicleMarkers(): void {
    // Rimuove marker esistenti per evitare duplicati
    this.clearMarkers();

    // Aggiunge marker per ogni veicolo con posizione valida
    this.veicleList().forEach((veicle) => {
      if (veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude) {
        this.addVeicleMarker(veicle);
      }
    });

    // NOTA: Non chiamiamo fitMapToMarkers() per mantenere lo zoom fisso su Roma
    // La mappa rimane centrata su Roma indipendentemente dalla posizione dei veicoli
    console.log(`📍 Aggiunti ${this.markers.length} marker sulla mappa (zoom fisso su Roma)`);
  }

  /**
   * Aggiunge un marker per un singolo veicolo sulla mappa
   * Include informazioni dettagliate nel popup e indica se i dati sono dal database o MQTT
   *
   * @param veicle - Il veicolo per cui creare il marker
   */
  private addVeicleMarker(veicle: Veicles): void {
    const position = veicle.lastPosition;

    // Crea marker personalizzato per il veicolo
    const marker = L.marker([position.latitude, position.longitude]).addTo(this.map);

    // Determina la fonte dei dati (database vs MQTT)
    const mqttPositions = this.mqttService.positionVeiclesList();
    const hasRecentMqttData = mqttPositions.some((mqttPos) => {
      if (mqttPos.vehicleId=== veicle.id) {
        const mqttTime = new Date(mqttPos.timestamp);
        const dbTime = new Date(position.timestamp);
        return mqttTime >= dbTime;
      }
      return false;
    });

    const dataSource = hasRecentMqttData ? '📡 MQTT' : '💾 Database';
    const sourceColor = hasRecentMqttData ? '#10b981' : '#6b7280';

    // Crea popup con informazioni dettagliate del veicolo
    const popupContent = `
      <div style="font-family: Arial, sans-serif;">
        <h4 style="margin: 0 0 10px 0; color: #007bff;">${veicle.licensePlate}</h4>
        <div style="background: ${sourceColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-bottom: 8px;">
          ${dataSource}
        </div>
        <p style="margin: 5px 0;"><strong>Modello:</strong> ${veicle.model}</p>
        <p style="margin: 5px 0;"><strong>Marca:</strong> ${veicle.brand}</p>
        <p style="margin: 5px 0;"><strong>Stato:</strong> ${veicle.status}</p>
        <p style="margin: 5px 0;"><strong>Velocità:</strong> ${position.speed} km/h</p>
        <p style="margin: 5px 0;"><strong>Direzione:</strong> ${position.heading}°</p>
        <p style="margin: 5px 0;"><strong>Coordinate:</strong><br>
          Lat: ${position.latitude.toFixed(6)}<br>
          Lng: ${position.longitude.toFixed(6)}
        </p>
        <p style="margin: 5px 0;"><strong>Ultimo aggiornamento:</strong><br>
          ${this.formatDate(position.timestamp)}
        </p>
      </div>
    `;

    marker.bindPopup(popupContent);

    // Aggiunge il marker all'array per il tracking
    this.markers.push(marker);
  }

  /**
   * Rimuove tutti i marker dalla mappa
   * Necessario per evitare duplicati quando si aggiornano le posizioni
   */
  private clearMarkers(): void {
    // Rimuove tutti i marker dalla mappa
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = []; // Resetta l'array dei marker
  }

  /**
   * Centra automaticamente la mappa per mostrare tutti i marker
   * NOTA: Attualmente non utilizzato per mantenere zoom fisso su Roma
   */
  private fitMapToMarkers(): void {
    // Crea un gruppo con tutti i marker per centrare la vista
    const group = new L.FeatureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  /**
   * Formatta una data per la visualizzazione in formato italiano
   *
   * @param date - La data da formattare
   * @returns Stringa formattata in italiano (gg/mm/aaaa hh:mm:ss)
   */
  private formatDate(date: Date): string {
    // Formatta la data in italiano
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
   * Metodo pubblico per ricaricare manualmente i dati
   * Combina i dati del database con quelli MQTT e riavvia il timer automatico
   * Utile quando l'utente clicca il pulsante "Aggiorna Ora"
   */
  public refreshVeicles(): void {
    console.log("🔄 Aggiornamento manuale richiesto dall'utente");

    // Ricarica i dati (che include la combinazione con MQTT)
    this.loadVeicles();

    // Riavvia il timer automatico per sincronizzare il timing
    this.startAutoUpdate();
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
}
