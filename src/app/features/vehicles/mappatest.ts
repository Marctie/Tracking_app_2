import { Component, OnInit, AfterViewInit, inject, signal } from '@angular/core';
import * as L from 'leaflet';
import { VeicleService } from '../../services/veicle-service';
import { Veicles } from '../../models/veicles';
import { VeiclePosition } from '../../models/veicle-position';

@Component({
  selector: 'app-mappatest',
  imports: [],
  template: `
    <div class="map-container">
      <!-- <div class="map-header">
        <h2>Mappa Veicoli in Tempo Reale</h2>
        <button class="refresh-btn" (click)="refreshVeicles()">🔄 Aggiorna Posizioni</button>
      </div> -->
      <p>Visualizzazione delle posizioni dei veicoli dal database</p>

      <!-- Statistiche veicoli -->
      <!-- <div class="stats">
        <span class="stat-item">
          Veicoli totali: <strong>{{ veicleList().length }}</strong>
        </span>
        <span class="stat-item">
          Con posizione: <strong>{{ getVeiclesWithPosition() }}</strong>
        </span>
      </div> -->

      <!-- Container per la mappa Leaflet -->
      <div id="map"></div>
    </div>
  `,
  styles: `
    .map-container {
      padding: 20px;
      font-family: Arial, sans-serif;
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
export class Mappatest implements AfterViewInit, OnInit {
  private map!: L.Map;
  private markers: L.Marker[] = []; // Array per tenere traccia dei marker

  // Injection del servizio e signal per i dati
  private veicleService = inject(VeicleService);
  veicleList = signal<Veicles[]>([]);

  ngOnInit(): void {
    // Carica i dati dei veicoli
    this.loadVeicles();
  }

  ngAfterViewInit(): void {
    // Configura le icone di Leaflet per evitare errori 404
    this.setupLeafletIcons();

    // Inizializza la mappa dopo che la vista è stata caricata
    this.initMap();
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

  private loadVeicles(): void {
    // Carica i veicoli dal servizio
    this.veicleService.getListVeicle().subscribe((response) => {
      this.veicleList.set(response.items);
      console.log('Veicoli caricati:', this.veicleList());

      // Se la mappa è già inizializzata, aggiorna i marker
      if (this.map) {
        this.addVeicleMarkers();
      }
    });
  }

  private initMap(): void {
    // Centra la mappa sull'Italia (Roma)
    this.map = L.map('map').setView([41.9028, 12.4964], 6);

    // Aggiunge il layer delle tile di OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // Aggiunge i marker dei veicoli se i dati sono già caricati
    if (this.veicleList().length > 0) {
      this.addVeicleMarkers();
    }
  }

  private addVeicleMarkers(): void {
    // Rimuove marker esistenti
    this.clearMarkers();

    // Aggiunge marker per ogni veicolo con posizione
    this.veicleList().forEach((veicle) => {
      if (veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude) {
        this.addVeicleMarker(veicle);
      }
    });

    // Centra la mappa sui marker se ce ne sono
    if (this.markers.length > 0) {
      this.fitMapToMarkers();
    }
  }

  private addVeicleMarker(veicle: Veicles): void {
    const position = veicle.lastPosition;

    // Crea marker personalizzato per il veicolo
    const marker = L.marker([position.latitude, position.longitude]).addTo(this.map);

    // Crea popup con informazioni dettagliate del veicolo
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

    // Aggiunge il marker all'array per il tracking
    this.markers.push(marker);
  }

  private clearMarkers(): void {
    // Rimuove tutti i marker dalla mappa
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  private fitMapToMarkers(): void {
    // Crea un gruppo con tutti i marker per centrare la vista
    const group = new L.FeatureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

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

  // Metodo pubblico per ricaricare i dati (utile per aggiornamenti)
  public refreshVeicles(): void {
    this.loadVeicles();
  }

  // Metodo per contare i veicoli con posizione
  public getVeiclesWithPosition(): number {
    return this.veicleList().filter(
      (veicle) =>
        veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude
    ).length;
  }
}
