import {
  Component,
  Input,
  inject,
  output,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  input,
} from '@angular/core';
import { Veicles } from '../../../models/veicles';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MyMqttService } from '../../../services/mymqtt-service';

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
            @if (selectedVeicle()){
            <div class="detail-row">
              <strong>Targa:</strong> {{ selectedVeicle()?.licensePlate }}
            </div>
            <div class="detail-row"><strong>Modello:</strong> {{ selectedVeicle()?.model }}</div>
            <div class="detail-row"><strong>Marca:</strong> {{ selectedVeicle()?.brand }}</div>
            <div class="detail-row"><strong>Stato:</strong> {{ selectedVeicle()?.status }}</div>
            <div class="detail-row">
              <strong>Creato il:</strong> {{ formatDate(selectedVeicle()!.createdAt) }}
            </div>
            @if(selectedVeicle()?.lastPosition){
            <strong>Ultima posizione:</strong>
            <div class="position-info">
              Lat: {{ selectedVeicle()?.lastPosition?.latitude }}<br />
              Lng: {{ selectedVeicle()?.lastPosition?.longitude }}
            </div>
            } }
            <button class="refresh-btn" (click)="refreshVeicles()">Aggiorna posizione</button>
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

.refresh-btn {
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 0.9rem;
    font-size: 0.9rem;
    cursor: pointer;
    margin-top: 1rem;
    transition: background-color 0.2s;
}

.refresh-btn:hover {
    background: #059669;
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
  selectedVeicle = input<Veicles>();
  hideModal = output<boolean>();

  // Servizi necessari
  private mqttService = inject(MyMqttService);

  // Elementi della mappa
  @ViewChild('leafletMap')
  private mapElement: ElementRef | undefined;
  private map!: L.Map;
  private markers: L.Marker[] = [];

  ngOnInit(): void {
    // Il modal riceve il veicolo selezionato dal dashboard
    console.log('Modal inizializzato con veicolo:', this.selectedVeicle()?.licensePlate);
  }

  ngAfterViewInit(): void {
    this.setupLeafletIcons();
    // Inizializza solo la mappa - NON caricare tutti i veicoli
    this.initMap();
  }

  // Metodo per configurare le icone e rimuovere l'ombra
  private setupLeafletIcons(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      // Icona SVG inline per evitare file esterni
      iconUrl:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjZGM2ZTI2Ii8+Cjwvc3ZnPg==',
      iconRetinaUrl:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjZGM2ZTI2Ii8+Cjwvc3ZnPg==',
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
    // Crea la mappa centrata su Roma
    this.map = L.map(this.mapElement?.nativeElement, {
      center: [41.9028, 12.4964],
      zoom: 6,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    // MOSTRA SOLO il veicolo selezionato dal dashboard (SelectedVeicle obj)
    this.showSelectedVehicleOnMap();
  }

  // Metodo elementare per mostrare il veicolo selezionato
   showSelectedVehicleOnMap(): void {
    console.log('Veicolo selezionato ricevuto:', this.selectedVeicle);
    // Controllo del veicolo selezionato
    if (!this.selectedVeicle) {
      console.log('ERRORE: Nessun veicolo selezionato!');
      return;
    }
    // Controllo se il veicolo ha una posizione
    if (!this.selectedVeicle()?.lastPosition) {
      console.log('ERRORE: Il veicolo non ha una posizione!');
      return;
    }
    const lat = this.selectedVeicle()?.lastPosition.latitude;
    const lng = this.selectedVeicle()?.lastPosition.longitude;
    if (!lat || !lng) {
      console.log('ERRORE: Coordinate non valide!', lat, lng);
      return;
    }
    console.log('Creo marker per:', this.selectedVeicle()?.licensePlate, 'a:', lat, lng);
    // Crea il marker del veicolo
    const marker = L.marker([lat, lng]).addTo(this.map);
    // Popup con info veicolo
    const popup = `
      <div>
        <h4>${this.selectedVeicle()?.licensePlate}</h4>
        <p><b>Modello:</b> ${this.selectedVeicle()?.model}</p>
        <p><b>Velocità:</b> ${this.selectedVeicle()?.lastPosition.speed} km/h</p>
        <p><b>Coordinate:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
      </div>
    `;

    marker.bindPopup(popup).openPopup();

    // Centra la mappa sul veicolo
    this.map.setView([lat, lng], 15);

    // Salva il marker per poterlo rimuovere in seguito
    this.markers.push(marker);
  }

  //Chiusura della modale col bottone X
  exitModal() {
    this.hideModal.emit(false);
  }
  //Chiusura della modale cliccando fuori dagli spazi
  onOverlayClick(event: MouseEvent): void {
    this.hideModal.emit(false);
  }
  //formattazione della data
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
  /**
   * Aggiorna la posizione del veicolo con i dati MQTT più recenti
   * Cerca prima nel signal del servizio MQTT, poi nel localStorage come fallback
   */
  public refreshVeicles(): void {
    console.log('Ricerca dati MQTT per veicolo:', this.selectedVeicle()?.licensePlate);

    if (!this.selectedVeicle()) {
      console.log('Nessun veicolo selezionato');
      return;
    }
    const vehicleId = this.selectedVeicle()?.id;

    // 1. Prima prova a cercare nel signal del servizio MQTT
    const mqttPosition = this.getMqttPositionFromService(vehicleId);

    // 2. Se non trovato, prova nel localStorage
    const localStoragePosition = !mqttPosition
      ? this.getMqttPositionFromLocalStorage(vehicleId)
      : null;

    // 3. Usa il dato più recente trovato
    const latestPosition = mqttPosition || localStoragePosition;

    if (latestPosition) {
      console.log('Trovata posizione MQTT aggiornata:', latestPosition);

      // Aggiorna anche il modello usato dal template: selectedVeicle.signal (compatibile con input() / signal APIs)
      const current = this.selectedVeicle?.();
      if (current) {
        const updatedVeicle: Veicles = {
          ...current,
          lastPosition: {
            ...(current.lastPosition ?? {}),
            latitude: latestPosition.latitude,
            longitude: latestPosition.longitude,
            speed: latestPosition.speed,
            timestamp: latestPosition.timestamp ?? latestPosition.time ?? Date.now(),
          },
        };

        // Supporta sia .set() che .update() delle API signal
        const sel: any = this.selectedVeicle;
        if (typeof sel.set === 'function') {
          sel.set(updatedVeicle);
        } else if (typeof sel.update === 'function') {
          sel.update(() => updatedVeicle);
        } else {
          // Fallback: muta l'oggetto corrente (utile se selectedVeicle è un plain object reference)
          Object.assign(current, updatedVeicle);
        }
      }

      this.updateMapWithMqttData(latestPosition);
    } else {
      console.log('Nessun dato MQTT trovato, uso posizione dal database');
      this.showSelectedVehicleOnMap();
    }
  }

  /**
   * Cerca la posizione del veicolo nel signal del servizio MQTT
   * @param vehicleId - ID del veicolo da cercare
   * @returns Posizione MQTT se trovata, null altrimenti
   */
  private getMqttPositionFromService(vehicleId: any): any {
    const mqttPositions = this.mqttService.positionVeiclesList();
    const position = mqttPositions.find((pos) => pos.vehicleId === vehicleId);

    if (position) {
      console.log('Posizione trovata nel signal MQTT service');
      return position;
    }

    console.log(' Nessuna posizione nel signal, provo localStorage...');
    return null;
  }

  /**
   * Cerca la posizione del veicolo nel localStorage
   * @param vehicleId - ID del veicolo da cercare
   * @returns Posizione MQTT se trovata, null altrimenti
   */
  private getMqttPositionFromLocalStorage(vehicleId: any): any {
    try {
      const storedPosition = localStorage.getItem(vehicleId.toString());
      if (storedPosition) {
        const position = JSON.parse(storedPosition);
        console.log('Posizione trovata in localStorage');
        return position;
      }
    } catch (error) {
      console.error('Errore leggendo localStorage:', error);
    }

    console.log('Nessuna posizione in localStorage');
    return null;
  }

  /**
   * Aggiorna la mappa con i dati MQTT
   * @param mqttPosition - Dati di posizione MQTT
   */
  updateMapWithMqttData(mqttPosition: any): void {
    // Rimuove i marker esistenti
    this.clearMarkers();

    const lat = mqttPosition.latitude;
    const lng = mqttPosition.longitude;

    console.log('Aggiornamento mappa con posizione MQTT:', lat, lng);

    // Crea nuovo marker con posizione MQTT
    const marker = L.marker([lat, lng]).addTo(this.map);

    // Popup con indicazione che i dati sono da MQTT
    const popup = `
      <div>
        <h4>${this.selectedVeicle()?.licensePlate}</h4>
        <p><b>Modello:</b> ${this.selectedVeicle()?.model}</p>
        <p><b>Velocità:</b> ${mqttPosition.speed || 'N/A'} km/h</p>
        <p><b>Coordinate:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
        <p><b>Ultimo aggiornamento:</b> ${new Date(mqttPosition.timestamp).toLocaleTimeString()}</p>
      </div>
    `;

    marker.bindPopup(popup).openPopup();

    // Centra la mappa sulla nuova posizione
    this.map.setView([lat, lng], 15);

    // Salva il marker
    this.markers.push(marker);

    console.log('🗺️ Mappa aggiornata con successo');
  }
  /**
   * Rimuove tutti i marker dalla mappa
   * Necessario prima di aggiungere nuovi marker per evitare duplicati
   */
  private clearMarkers(): void {
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
    console.log('🧹 Marker rimossi dalla mappa');
  }
}
