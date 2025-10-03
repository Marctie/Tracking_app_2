import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import * as L from 'leaflet';
import { VeiclePosition } from '../../models/veicle-position';
import { Veicles } from '../../models/veicles';
import { VeicleService } from '../../services/veicle-service';
import { MyMqttService } from '../../services/mymqtt-service';

@Component({
  selector: 'app-general-map',
  imports: [],
  template: `
    <div class="map-container">
      <div class="map-header">
        <h2>Mappa Veicoli in Tempo Reale</h2>
      </div>
      <!-- Container per la mappa Leaflet -->
      <div id="map"></div>
    </div>
  `,
  styles: ``,
})
export class GeneralMap implements OnInit, AfterViewInit, OnDestroy {
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

  private startAutoUpdate(): void {
    this.stopAutoUpdate();
    console.log('Avvio aggiornamento automatico ogni 5 secondi');
    this.autoUpdateInterval = setInterval(() => {
      console.log('Aggiornamento automatico posizioni veicoli...');
      this.loadVeicles();
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
      shadowUrl: 0, // Rimuove completamente l'ombra
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }

  private loadVeicles(): void {
    this.veicleService.getListVeicle().subscribe((response: any) => {
      const mqttPositions = this.mqttService.positionVeiclesList();
      console.log('Posizioni MQTT disponibili:', mqttPositions.length);
      const updatedVeicles = this.mergeVeiclesWithMqttData(response.items, mqttPositions);
      this.veicleList.set(updatedVeicles);
      console.log('Lista veicoli aggiornata con dati MQTT:', updatedVeicles.length);

      if (this.map) {
        this.addVeicleMarkers();
      }
    });
  }

  private mergeVeiclesWithMqttData(
    dbVeicles: Veicles[],
    mqttPositions: VeiclePosition[]
  ): Veicles[] {
    return dbVeicles.map((veicle: Veicles) => {
      const mqttPosition = mqttPositions.find(
        (position: VeiclePosition) => position.vehicleId === veicle.id
      );

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
      maxZoom: 15, // Limita lo zoom massimo per mantenere il focus su Roma
      minZoom: 4, // Limita lo zoom minimo per non allontanarsi troppo da Roma
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // Aggiunge i marker dei veicoli se i dati sono già caricati
    if (this.veicleList().length > 0) {
      this.addVeicleMarkers();
    }
  }

  private addVeicleMarkers(): void {
    this.clearMarkers();

    this.veicleList().forEach((veicle: Veicles) => {
      if (veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude) {
        this.addVeicleMarker(veicle);
      }
    });

    console.log(`Aggiunti ${this.markers.length} marker sulla mappa`);
  }

  private addVeicleMarker(veicle: Veicles): void {
    const position = veicle.lastPosition;
    const marker = L.marker([position.latitude, position.longitude]).addTo(this.map);

    const mqttPositions = this.mqttService.positionVeiclesList();
    const hasRecentMqttData = mqttPositions.some((mqttPos: VeiclePosition) => {
      if (mqttPos.vehicleId === veicle.id) {
        const mqttTime = new Date(mqttPos.timestamp);
        const dbTime = new Date(position.timestamp);
        return mqttTime >= dbTime;
      }
      return false;
    });

    const popupContent = `
      <div style="font-family: Arial, sans-serif;">
        <h4 style="margin: 0 0 10px 0; color: #007bff;">${veicle.licensePlate}</h4>
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
    this.markers.push(marker);
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

  public refreshVeicles(): void {
    console.log("Aggiornamento manuale richiesto dall'utente");
    this.loadVeicles();
    this.startAutoUpdate();
  }

  /**
   * Conta il numero di veicoli che hanno una posizione valida
   * Utile per le statistiche mostrate nell'interfaccia
   *
   * @returns Numero di veicoli con coordinate valide
   */
}
