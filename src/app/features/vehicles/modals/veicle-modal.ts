import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  output,
  OnInit,
  signal,
  AfterViewInit,
  DestroyRef,
  ViewChild,
  ElementRef,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Veicles } from '../../../models/veicles';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { VeicleService } from '../../../services/veicle-service';

@Component({
  selector: 'app-veiclemodal',
  imports: [CommonModule],
  template: `
    <!-- <div class="modal-overlay" (click)="onOverlayClick($event)"> -->
    <div class="modal-overlay">
      <!-- <div class="alert-container" (click)="$event.stopPropagation()"> -->
      <div class="alert-container">
        <h1 class="alert-title">{{ titolo }}</h1>
        <p class="alert-text">{{ testo }}</p>
        <div class="modal-body">
          <div class="map-container">
            <div id="map" #leafletMap></div>
          </div>

          <div class="details-container">
            <p>Dettagli del veicolo</p>
            @if (selectedVeicle){
            <div class="detail-row"><strong>Targa:</strong> {{ selectedVeicle.licensePlate }}</div>
            <div class="detail-row"><strong>Modello:</strong> {{ selectedVeicle.model }}</div>
            <div class="detail-row"><strong>Marca:</strong> {{ selectedVeicle.brand }}</div>
            <div class="detail-row"><strong>Stato:</strong> {{ selectedVeicle.status }}</div>
            <div class="detail-row">
              <strong>Creato il:</strong> {{ formatDate(selectedVeicle.createdAt) }}
            </div>
            @if(selectedVeicle.lastPosition){
            <strong>Ultima posizione:</strong>
            <div class="position-info">
              Lat: {{ selectedVeicle.lastPosition.latitude }}<br />
              Lng: {{ selectedVeicle.lastPosition.longitude }}
            </div>
            } }
            <button class="refresh-btn" (click)="refreshVeicles()">🔄 Aggiorna Posizione</button>
          </div>
          <!-- </div>  -->
        </div>
        <div class="actions">
          <button class="blackbtn" (click)="exitModal()">Chiudi</button>
        </div>
      </div>
      <!-- </div> -->
    </div>
  `,
  styles: `

tr{
font-size:20px;
}

.detail-row {
  margin-bottom: 12px;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.detail-row strong {
  color: #2563eb;
  margin-right: 8px;
}

.position-info {
  font-size: 0.9em;
  color: #6b7280;
  margin-top: 4px;
}


.modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.10);
    z-index: 99;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    box-sizing: border-box;
}

.alert-container {
    background: var(--card-bg, #fff);
    color: var(--text, #0f172a);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
    z-index: 100;
    width: 80%;
    max-width: 1000px;
    font-family: var(--font-family, Inter, 'Segoe UI', Roboto, Arial, sans-serif);
    box-sizing: border-box;
}

.alert-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: var(--accent, #2563eb);
    font-weight: 600;
}

.alert-text {
    margin: 0 0 1rem 0;
    color: var(--muted, #6b7280);
    font-size: 0.98rem;
}

.modal-body {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: flex-start;
}

/* left: map, right: details */
.map-container {
    flex: 1.4;
    min-height: 280px;
    background: #f8fafc;
    border-radius: 8px;
    padding: 0.75rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #334155;
    border: 1px dashed rgba(15,23,42,0.06);
}

.details-container {
    flex: 1;
    min-height: 280px;
    background: #fff;
    border-radius: 8px;
    padding: 0.75rem;
    box-sizing: border-box;
    color: #0f172a;
    border: 1px solid rgba(15,23,42,0.04);
    overflow: auto;
}

/* actions */
.actions {
    text-align: right;
}

/* buttons */
.blackbtn {
    background: var(--text, #0f172a);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 0.9rem;
    font-size: 0.95rem;
    cursor: pointer;
}

/* responsive */
@media (max-width: 700px) {
    .modal-body {
        flex-direction: column;
    }
    .map-container, .details-container {
        min-height: 180px;
    }
}
    `,
})
export class VeicleModal implements OnInit, AfterViewInit {
  @Input() titolo: string = '';
  @Input() testo: string = 'testo da mostrare ';
  @Input() selectedVeicle: Veicles | null = null;
  hideModal = output<boolean>();
  router = inject(Router);
  veicleList = signal<Veicles[]>([]);
  private veicleService = inject(VeicleService);
  destroy = inject(DestroyRef);
  @ViewChild('leafletMap')
  private mapElement: ElementRef | undefined;

  private map!: L.Map;
  private markers: L.Marker[] = []; // Array per tenere traccia dei marker

  ngOnInit(): void {
    // Il modal riceve il veicolo selezionato dal dashboard
    // Non serve caricare tutti i veicoli qui
    console.log('Modal inizializzato con veicolo:', this.selectedVeicle?.licensePlate);
  }

  ngAfterViewInit(): void {
    // Configura le icone di Leaflet per evitare errori 404
    this.setupLeafletIcons();

    // Inizializza solo la mappa - NON caricare tutti i veicoli
    this.initMap();
  }

  // Metodo per configurare le icone e rimuovere l'ombra
  private setupLeafletIcons(): void {
    // Rimuove la funzione che cerca automaticamente le icone
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    // Configura le icone per evitare errori 404
    L.Icon.Default.mergeOptions({
      // Icona SVG inline per evitare file esterni
      iconUrl:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjZGM2ZTI2Ii8+Cjwvc3ZnPg==',
      iconRetinaUrl:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjZGM2ZTI2Ii8+Cjwvc3ZnPg==',
      // IMPORTANTE: Rimuove completamente l'ombra per evitare errore 404
      shadowUrl: null,
      shadowSize: null,
      shadowAnchor: null,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    console.log('Icone Leaflet configurate - nessun errore 404 per marker-shadow.png');
  }

  initMap(): void {
    // Crea la mappa centrata sull'Italia
    this.map = L.map(this.mapElement?.nativeElement, {
      center: [41.9028, 12.4964],
      zoom: 6,
    });

    // Aggiunge le tile della mappa
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // MOSTRA SOLO il veicolo selezionato dal dashboard
    this.showSelectedVehicleOnMap();
  }

  // Metodo elementare per mostrare il veicolo selezionato
  private showSelectedVehicleOnMap(): void {
    console.log('Veicolo selezionato ricevuto:', this.selectedVeicle);

    // Controllo se abbiamo un veicolo selezionato
    if (!this.selectedVeicle) {
      console.log('ERRORE: Nessun veicolo selezionato!');
      return;
    }

    // Controllo se il veicolo ha una posizione
    if (!this.selectedVeicle.lastPosition) {
      console.log('ERRORE: Il veicolo non ha una posizione!');
      return;
    }

    const lat = this.selectedVeicle.lastPosition.latitude;
    const lng = this.selectedVeicle.lastPosition.longitude;

    // Controllo se le coordinate sono valide
    if (!lat || !lng) {
      console.log('ERRORE: Coordinate non valide!', lat, lng);
      return;
    }

    console.log('Creo marker per:', this.selectedVeicle.licensePlate, 'a:', lat, lng);

    // Crea il marker del veicolo
    const marker = L.marker([lat, lng]).addTo(this.map);

    // Popup semplice con info veicolo
    const popup = `
      <div>
        <h4>🚗 ${this.selectedVeicle.licensePlate}</h4>
        <p><b>Modello:</b> ${this.selectedVeicle.model}</p>
        <p><b>Velocità:</b> ${this.selectedVeicle.lastPosition.speed} km/h</p>
        <p><b>Coordinate:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
      </div>
    `;

    marker.bindPopup(popup).openPopup();

    // Centra la mappa sul veicolo
    this.map.setView([lat, lng], 15);

    // Salva il marker per poterlo rimuovere in seguito
    this.markers.push(marker);
  }

  exitModal() {
    this.hideModal.emit(false);
  }

  onOverlayClick(event: MouseEvent): void {
    this.hideModal.emit(false);
  }

  formatDate(data: string | Date): string {
    if (!data) return '';
    const d = new Date(data);
    if (isNaN(d.getTime())) return String(data);
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  // Metodo semplice per aggiornare la posizione (se necessario)
  public refreshVeicles(): void {
    console.log('Aggiornamento posizione per:', this.selectedVeicle?.licensePlate);
    // Rimuove marker esistenti
    this.clearMarkers();
    // Mostra di nuovo il veicolo aggiornato
    this.showSelectedVehicleOnMap();
  }

  // Rimuove tutti i marker dalla mappa
  private clearMarkers(): void {
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }
}
