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
  signal,
} from '@angular/core';
import { Veicles } from '../../../models/veicles';
import { VeiclePosition } from '../../../models/veicle-position';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MyMqttService } from '../../../services/mymqtt-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-veiclemodal',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="alert-container" (click)="$event.stopPropagation()">
        <h1 class="alert-title">{{ titolo }}</h1>
        <p class="alert-text">{{ testo }}</p>
        <div class="modal-body">
          <div class="map-container">
            <div id="map" #leafletMap></div>
          </div>
          <div class="details-container" style="text-align: left;">
            @if (selectedVeicle()){
            <div class="detail-row">
              <strong>Targa:</strong> {{ selectedVeicle()?.licensePlate }}
            </div>
            <div class="detail-row"><strong>Modello:</strong> {{ selectedVeicle()?.model }}</div>
            <div class="detail-row"><strong>Marca:</strong> {{ selectedVeicle()?.brand }}</div>
            <div class="detail-row"><strong>Stato:</strong> {{ selectedVeicle()?.status }}</div>
            <div class="detail-row">
              <strong>Velocità:</strong> {{ this.selectedVeicle()?.lastPosition?.speed }}km/h
            </div>
            <div class="detail-row">
              <strong>Creato il:</strong> {{ formatDate(selectedVeicle()!.createdAt) }}
            </div>
            <div style="text-align: center;">
              <!-- Dropdown Storico Posizioni -->
              <div class="position-history-section">
                <h4>Storico Posizioni</h4>
                <select
                  class="position-history-dropdown"
                  [(ngModel)]="selectedHistoryPosition"
                  (change)="onPositionHistoryChange()"
                >
                  <option value="">-- Seleziona una posizione dal registro --</option>
                  @for (position of positionHistory(); track position.timestamp.getTime()) {
                  <option [value]="position.timestamp.getTime()">
                    {{ formatPositionHistoryOption(position) }}
                  </option>
                  }
                </select>
                @if (selectedHistoryPosition) {
                <div class="selected-position-details">
                  @for (position of positionHistory(); track position.timestamp.getTime()) { @if
                  (position.timestamp.getTime().toString() === selectedHistoryPosition) {
                  <div class="history-position-info">
                    <div>
                      <strong>Data & Ora</strong>
                      <span>{{ formatDate(position.timestamp) }}</span>
                      <span class="time-ago">{{ getTimeAgo(position.timestamp) }}</span>
                    </div>
                    <div>
                      <strong>Coordinate GPS</strong>
                      <span>{{ position.latitude }}, {{ position.longitude }}</span>
                    </div>
                    <div>
                      <strong>Velocità</strong>
                      <span>{{ position.speed || 0 }} km/h</span>
                    </div>
                    @if (position.heading !== undefined) {
                    <div>
                      <strong>Direzione</strong>
                      <span>{{ position.heading }}°</span>
                    </div>
                    }
                  </div>
                  } }
                </div>
                <br />

                } @if(selectedVeicle()?.lastPosition){
                <strong>Ultima posizione:</strong>
                <div class="position-info">
                  Lat: {{ selectedVeicle()?.lastPosition?.latitude }}<br />
                  Lng: {{ selectedVeicle()?.lastPosition?.longitude }}
                </div>
                }
              </div>
              <br />

              <button class="refresh-btn" (click)="refreshVeicles()">Aggiorna posizione</button>
            </div>
            }
          </div>
          <!--</div>-->
        </div>
        <div class="actions">
          <button class="blackbtn" (click)="close()">Chiudi</button>
        </div>
      </div>
      <!--</div>-->
    </div>
  `,
  styles: `
/* Animazioni per l'apertura e chiusura */
@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
}

@keyframes overlayIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

tr {
  font-size: 20px;
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

/* Overlay che copre tutto lo schermo con sfondo semi-trasparente */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 1rem;
  animation: overlayIn 0.3s ease-out;
}

/* Container principale della modale - centrato e responsivo */
.alert-container {
  background: var(--card-bg, #fff);
  color: var(--text, #0f172a);
  padding: 2rem;
  border-radius: 16px;
  z-index: 1000;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  font-family: var(--font-family, Inter, 'Segoe UI', Roboto, Arial, sans-serif);
  box-sizing: border-box;
  overflow-y: auto;

  //ombra 
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 10px 20px -5px rgba(0, 0, 0, 0.1);
  
  /* Animazione di entrata */
  animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Animazione di uscita (da applicare via JavaScript se necessario) */
.alert-container.closing {
  animation: modalOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.alert-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--accent, #2563eb);
  font-weight: 600;
  text-align: center;
}

.alert-text {
  margin: 0 0 1.5rem 0;
  color: var(--muted, #6b7280);
  font-size: 1rem;
  text-align: center;
}

.modal-body {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  align-items: flex-start;
}

/* Mappa a sinistra */
.map-container {
  flex: 1.4;
  min-height: 350px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 1rem;
  box-sizing: border-box;
  display: flex !important;
  align-items: center;
  justify-content: center;
  color: #334155;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  visibility: visible !important;
  opacity: 1 !important;
}

/* Dettagli a destra */
.details-container {
  flex: 1;
  min-height: 350px;
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  box-sizing: border-box;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Azioni */
.actions {
  text-align: center;
  margin-top: 1rem;
}

/* Pulsanti */
.blackbtn {
  background: var(--text, #0f172a);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.blackbtn:hover {
  background: #374151;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.refresh-btn {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.refresh-btn:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Stili per lo storico posizioni - Tema coerente con il progetto */
.position-history-section {
  padding:10px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border-top: 2px solid #e5e7eb;
}

.position-history-section h4 {
  color: var(--accent, #2563eb);
  font-weight: 600;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.position-history-section h4:before {
  font-size: 1.2rem;
}

.position-history-dropdown {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  background: var(--card-bg, #fff);
  color: var(--text, #0f172a);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-family: inherit;
}

.position-history-dropdown:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.1);
}

.position-history-dropdown:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.selected-position-details {
  margin-top: 1rem;
  padding: 1.25rem;
  background: var(--card-bg, #fff);
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  border-left: 4px solid #2563eb;
}

.selected-position-details:hover {
  box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.history-position-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  font-size: 0.9rem;
}

.history-position-info > div {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.history-position-info strong {
  color: var(--accent, #2563eb);
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-position-info span {
  color: var(--text, #0f172a);
  font-weight: 500;
  font-size: 0.95rem;
}

.history-position-info .time-ago {
  color: #6b7280;
  font-size: 0.8rem;
  font-style: italic;
  margin-top: 0.25rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .alert-container {
    max-width: 95%;
    padding: 1.5rem;
  }
  
  .modal-body {
    gap: 1rem;
  }
  
  .map-container, .details-container {
    min-height: 300px;
  }
}

/* Media query specifica per 752px e schermi simili - Mantiene la mappa sempre visibile */
@media (max-width: 752px) {
  .map-container {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    min-height: 280px !important;
    height: auto !important;
    flex: none !important;
    width: 100% !important;
  }
  
  .modal-body {
    flex-direction: column;
    gap: 1rem;
  }
  
  .map-container #map {
    width: 100% !important;
    height: 100% !important;
    min-height: 250px !important;
  }
}

/* Media query specifica per schermi medi - Mantiene la mappa visibile */
@media (max-width: 768px) and (min-width: 680px) {
  .modal-overlay {
    padding: 0.5rem;
  }
  
  .alert-container {
    padding: 1rem;
    max-height: 95vh;
  }
  
  .alert-title {
    font-size: 1.25rem;
  }
  
  .modal-body {
    flex-direction: column;
    gap: 1rem;
  }
  
  .map-container {
    min-height: 450px !important;
    flex: none;
    width: 100%;
    order: 1;
  }
  
  .details-container {
    min-height: auto;
    order: 2;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }
  
  .alert-container {
    padding: 1rem;
    max-height: 95vh;
  }
  
  .alert-title {
    font-size: 1.25rem;
  }
  
  .modal-body {
    flex-direction: column;
    gap: 1rem;
  }
  
  .map-container, .details-container {
    min-height: 250px;
  }
  
  /* Responsive per storico posizioni */
  .history-position-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .alert-container {
    padding: 0.75rem;
  }
  
  .alert-title {
    font-size: 1.125rem;
  }
  
  .map-container, .details-container {
    min-height: 200px;
    padding: 0.75rem;
  }
  
  .blackbtn, .refresh-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}
    `,
})
export class VeicleModal implements OnInit, AfterViewInit {
  @Input() titolo: string = '';
  @Input() testo: string = 'testo da mostrare ';
  selectedVeicle = input<Veicles>();
  hideModal = output<boolean>();
  router = inject(Router);

  // Servizi necessari
  private mqttService = inject(MyMqttService);

  // Proprietà per lo storico posizioni
  positionHistory = signal<VeiclePosition[]>([]);
  selectedHistoryPosition: string = '';

  // Elementi della mappa
  @ViewChild('leafletMap')
  private mapElement: ElementRef | undefined;
  private map!: L.Map;
  private markers: L.Marker[] = [];

  ngOnInit(): void {
    console.log('[MODAL] Inizializzazione modal per veicolo:', this.selectedVeicle()?.licensePlate);
    // Carica lo storico delle posizioni
    this.loadPositionHistory();
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
    console.log('[MODAL] Configurazione icone Leaflet completata');
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
    console.log('[MODAL] Visualizzazione veicolo selezionato sulla mappa');
    // Controllo del veicolo selezionato
    if (!this.selectedVeicle) {
      console.log('[MODAL] Errore: Nessun veicolo selezionato');
      return;
    }
    // Controllo se il veicolo ha una posizione
    if (!this.selectedVeicle()?.lastPosition) {
      console.log('[MODAL] Errore: Il veicolo non ha posizione disponibile');
      return;
    }
    const lat = this.selectedVeicle()?.lastPosition.latitude;
    const lng = this.selectedVeicle()?.lastPosition.longitude;
    if (!lat || !lng) {
      console.log('[MODAL] Errore: Coordinate non valide - Lat:', lat, 'Lng:', lng);
      return;
    }
    console.log(
      '[MODAL] Creazione marker per veicolo:',
      this.selectedVeicle()?.licensePlate,
      'alle coordinate:',
      lat,
      lng
    );
    // Crea il marker del veicolo
    const marker = L.marker([lat, lng]).addTo(this.map);

    // Centra la mappa sul veicolo
    this.map.setView([lat, lng], 15);

    // Salva il marker per poterlo rimuovere in seguito
    this.markers.push(marker);
  }

  //Chiusura della modale cliccando fuori dagli spazi
  onOverlayClick(event: MouseEvent): void {
    this.close();
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
    console.log(
      '[MODAL] Richiesta aggiornamento posizione MQTT per veicolo:',
      this.selectedVeicle()?.licensePlate
    );

    if (!this.selectedVeicle()) {
      console.log("[MODAL] Errore: Nessun veicolo selezionato per l'aggiornamento");
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
      console.log('[MODAL] Posizione MQTT aggiornata trovata per veicolo ID:', vehicleId);

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
      console.log('[MODAL] Nessun dato MQTT disponibile - utilizzo posizione da database');
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
      console.log('[MODAL] Posizione trovata nel servizio MQTT');
      return position;
    }

    console.log('[MODAL] Nessuna posizione nel servizio MQTT - controllo localStorage');
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
        console.log('[MODAL] Posizione recuperata da localStorage per veicolo ID:', vehicleId);
        return position;
      }
    } catch (error) {
      console.error('[MODAL] Errore durante la lettura del localStorage:', error);
    }

    console.log('[MODAL] Nessuna posizione disponibile in localStorage');
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

    console.log('[MODAL] Aggiornamento mappa con dati MQTT - Lat:', lat, 'Lng:', lng);

    // Crea nuovo marker con posizione MQTT
    const marker = L.marker([lat, lng]).addTo(this.map);

    // Popup con indicazione che i dati sono da MQTT
    const popup = `
      <div>
        <p><b>Ultimo aggiornamento:</b> ${new Date(mqttPosition.timestamp).toLocaleTimeString()}</p>
      </div>
    `;

    marker.bindPopup(popup).openPopup();

    // Centra la mappa sulla nuova posizione
    this.map.setView([lat, lng], 15);

    // Salva il marker
    this.markers.push(marker);

    console.log('[MODAL] Aggiornamento mappa completato con successo');
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
    console.log('[MODAL] Marker precedenti rimossi dalla mappa');
  }

  close(): void {
    const hide: any = this.hideModal;

    // Try common emit/set/update patterns for outputs/signals
    if (hide) {
      if (typeof hide.emit === 'function') {
        hide.emit(false);
        return;
      }
      if (typeof hide === 'function') {
        hide(false);
        return;
      }
      if (typeof hide.set === 'function') {
        hide.set(false);
        return;
      }
      if (typeof hide.update === 'function') {
        hide.update(() => false);
        return;
      }
    }

    // Fallback: go back in history (avoids navigating to home)
    if (typeof history !== 'undefined' && typeof history.back === 'function') {
      history.back();
      return;
    }

    console.warn(
      '[MODAL] Errore: Impossibile chiudere la modale - output hideModal non disponibile'
    );
  }

  /**
   * Carica lo storico delle posizioni del veicolo
   */
  private loadPositionHistory(): void {
    const vehicle = this.selectedVeicle();
    if (!vehicle) return;

    // Simula il caricamento dello storico posizioni
    // In un'implementazione reale, questo dovrebbe chiamare un servizio per ottenere lo storico
    const now = new Date();
    const mockHistory: VeiclePosition[] = [
      {
        vehicleId: vehicle.id,
        latitude: vehicle.lastPosition?.latitude || 41.9028,
        longitude: vehicle.lastPosition?.longitude || 12.4964,
        speed: vehicle.lastPosition?.speed || 0,
        heading: vehicle.lastPosition?.heading || 0,
        timestamp: now,
        status: vehicle.status || 'active',
      },
      // Aggiungi posizioni simulate per dimostrare la funzionalità
      {
        vehicleId: vehicle.id,
        latitude: (vehicle.lastPosition?.latitude || 41.9028) + 0.001,
        longitude: (vehicle.lastPosition?.longitude || 12.4964) + 0.001,
        speed: 45,
        heading: 90,
        timestamp: new Date(now.getTime() - 1800000), // 30 minuti fa
        status: 'active',
      },
      {
        vehicleId: vehicle.id,
        latitude: (vehicle.lastPosition?.latitude || 41.9028) + 0.002,
        longitude: (vehicle.lastPosition?.longitude || 12.4964) + 0.002,
        speed: 60,
        heading: 180,
        timestamp: new Date(now.getTime() - 3600000), // 1 ora fa
        status: 'active',
      },
      {
        vehicleId: vehicle.id,
        latitude: (vehicle.lastPosition?.latitude || 41.9028) + 0.003,
        longitude: (vehicle.lastPosition?.longitude || 12.4964) + 0.003,
        speed: 30,
        heading: 270,
        timestamp: new Date(now.getTime() - 7200000), // 2 ore fa
        status: 'active',
      },
    ];

    // Ordina per timestamp decrescente (più recente prima)
    mockHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    this.positionHistory.set(mockHistory);
    console.log('[MODAL] Storico posizioni caricato:', mockHistory.length, 'posizioni');
  }

  /**
   * Gestisce il cambio di selezione nello storico posizioni
   */
  onPositionHistoryChange(): void {
    if (!this.selectedHistoryPosition) return;

    const selectedPosition = this.positionHistory().find(
      (pos) => pos.timestamp.getTime().toString() === this.selectedHistoryPosition
    );

    if (selectedPosition && this.map) {
      // Centra la mappa sulla posizione selezionata
      this.map.setView([selectedPosition.latitude, selectedPosition.longitude], 15);

      // Pulisce i marker esistenti
      this.markers.forEach((marker) => this.map.removeLayer(marker));
      this.markers = [];

      // Aggiunge un marker per la posizione selezionata
      const marker = L.marker([selectedPosition.latitude, selectedPosition.longitude])
        .addTo(this.map)
        .bindPopup(
          `
          <strong>Posizione Storica</strong><br>
          <strong>Data:</strong> ${this.formatDate(new Date(selectedPosition.timestamp))}<br>
          <strong>Velocità:</strong> ${selectedPosition.speed || 0} km/h<br>
          <strong>Direzione:</strong> ${selectedPosition.heading || 0}°
        `
        )
        .openPopup();

      this.markers.push(marker);
    }
  }

  /**
   * Formatta l'opzione per la dropdown dello storico
   */
  formatPositionHistoryOption(position: VeiclePosition): string {
    const timeAgo = this.getTimeAgo(position.timestamp.getTime());
    return `${this.formatDate(position.timestamp)} (${timeAgo})`;
  }

  /**
   * Calcola quanto tempo fa è stata registrata una posizione
   */
  getTimeAgo(timestamp: Date | number): string {
    const now = Date.now();
    const time = timestamp instanceof Date ? timestamp.getTime() : timestamp;
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} giorni fa`;
    if (hours > 0) return `${hours} ore fa`;
    if (minutes > 0) return `${minutes} minuti fa`;
    return 'Ora';
  }
}
