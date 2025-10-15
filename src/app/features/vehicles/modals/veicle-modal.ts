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
import { StreamingTestComponent } from '../streaming-test.component';

@Component({
  selector: 'app-veiclemodal',
  imports: [CommonModule, FormsModule, StreamingTestComponent],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="alert-container" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close()">&times;</button>

        <h1 class="alert-title">{{ titolo }}</h1>
        <p class="alert-text">{{ testo }}</p>
        <div class="modal-body">
          <div class="map-container">
            <div id="map" #leafletMap></div>
          </div>
          <div class="details-container" style="text-align: left;">
            @if (selectedVeicle()){
            <div class="detail-row">
              <strong>License Plate:</strong> {{ selectedVeicle()?.licensePlate }}
            </div>
            <div class="detail-row"><strong>Model:</strong> {{ selectedVeicle()?.model }}</div>
            <div class="detail-row"><strong>Brand:</strong> {{ selectedVeicle()?.brand }}</div>
            <div class="detail-row"><strong>Status:</strong> {{ selectedVeicle()?.status }}</div>
            <div class="detail-row">
              <strong>Speed:</strong> {{ this.selectedVeicle()?.lastPosition?.speed }}km/h
            </div>
            <div class="detail-row">
              <strong>Created on:</strong> {{ formatDate(selectedVeicle()!.createdAt) }}
            </div>
            <div style="text-align: center;">
              <!-- Dropdown Storico Posizioni -->
              <div class="position-history-section">
                <h4>Position History</h4>
                <select
                  class="position-history-dropdown"
                  [(ngModel)]="selectedHistoryPosition"
                  (change)="onPositionHistoryChange()"
                >
                  <option value="">-- Select a position from the registry --</option>
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
                      <strong>Date & Time</strong>
                      <span>{{ formatDate(position.timestamp) }}</span>
                      <span class="time-ago">{{ getTimeAgo(position.timestamp) }}</span>
                    </div>
                    <div>
                      <strong>GPS Coordinates</strong>
                      <span>{{ position.latitude }}, {{ position.longitude }}</span>
                    </div>
                    <div>
                      <strong>Address</strong>
                      <span class="address-info">{{
                        getAddressForPosition(position.latitude, position.longitude)
                      }}</span>
                    </div>
                    <div>
                      <strong>Speed</strong>
                      <span>{{ position.speed || 0 }} km/h</span>
                    </div>
                    @if (position.heading !== undefined) {
                    <div>
                      <strong>Direction</strong>
                      <span>{{ position.heading }}°</span>
                    </div>
                    }
                  </div>
                  } }
                </div>
                <br />

                } @if(selectedVeicle()?.lastPosition){
                <strong>Last position:</strong>
                <div class="position-info">
                  Lat: {{ selectedVeicle()?.lastPosition?.latitude }}<br />
                  Lng: {{ selectedVeicle()?.lastPosition?.longitude }}
                </div>
                <div class="address-info">
                  <strong>Current Address:</strong><br />
                  {{
                    getAddressForPosition(
                      selectedVeicle()?.lastPosition?.latitude!,
                      selectedVeicle()?.lastPosition?.longitude!
                    )
                  }}
                </div>
                }
              </div>
              <br />

              <button class="refresh-btn" (click)="refreshVeicles()">Refresh position</button>

              <!--  Streaming -->
              <!-- <app-streaming-test [vehicleId]="selectedVeicle()!.id"></app-streaming-test> -->
            </div>
            }
          </div>
          <!--</div>-->
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
  margin-bottom: 16px;
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  font-size: clamp(0.875rem, 2.5vw, 1rem);
  line-height: 1.5;
}

.detail-row strong {
  color: #2563eb;
  margin-right: 12px;
  font-weight: 600;
}

.position-info {
  font-size: clamp(0.8125rem, 2vw, 0.9375rem);
  color: #6b7280;
  margin-top: 8px;
  line-height: 1.5;
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
  padding: 1.5rem;
  animation: overlayIn 0.3s ease-out;
}

/* Container principale della modale - centrato e responsivo */
.alert-container {
  background: var(--card-bg, #fff);
  color: var(--text, #0f172a);
  padding: 2.5rem;
  border-radius: 20px;
  z-index: 1000;
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  max-height: 90vh;
  font-family: 'Inter', 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;

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
  margin: 0 0 0.75rem 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
  color: var(--accent, #2563eb);
  font-weight: 700;
  text-align: center;
  letter-spacing: -0.025em;
}

.alert-text {
  margin: 0 0 2rem 0;
  color: var(--muted, #6b7280);
  font-size: clamp(1rem, 2.5vw, 1.125rem);
  text-align: center;
  line-height: 1.6;
}

.modal-body {
  display: flex;
  gap: 2rem;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

/* Mappa a sinistra */
.map-container {
  flex: 1.4;
  height: 100%;
  background: #f8fafc;
  border-radius: 16px;
  padding: 1.5rem;
  box-sizing: border-box;
  display: flex !important;
  align-items: center;
  justify-content: center;
  color: #334155;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  visibility: visible !important;
  opacity: 1 !important;
}

/* Dettagli a destra */
.details-container {
  flex: 1;
  height: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-sizing: border-box;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* Mappa Leaflet - Allineamento perfetto con contenitore */
#map {
  width: 100% !important;
  height: 100% !important;
  border-radius: 12px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Fix per gli angoli dei controlli Leaflet */
.map-container .leaflet-container {
  border-radius: 12px;
  overflow: hidden;
}

.map-container .leaflet-control-container {
  position: relative;
}

.map-container .leaflet-top,
.map-container .leaflet-bottom {
  z-index: 100;
}

.map-container .leaflet-control {
  margin: 8px;
}

/* Azioni */
.actions {
  text-align: center;
  margin-top: 1.5rem;
  flex-shrink: 0;
}

/* Pulsanti */
.blackbtn {
  background: var(--text, #0f172a);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 1rem 2rem;
  font-size: clamp(0.9375rem, 2.5vw, 1.125rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  font-family: inherit;
}

.blackbtn:hover {
  background: #374151;
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

/* Pulsante chiudi (X) in alto a destra */
.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e5e5;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  color: #666;
  transition: all 0.2s ease;
  z-index: 1000;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
  border-color: #d1d1d1;
  transform: scale(1.05);
}

.refresh-btn {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  font-size: clamp(0.875rem, 2.5vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  margin-top: 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  font-family: inherit;
}

.refresh-btn:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

/* Stili per lo storico posizioni - Tema coerente con il progetto */
.position-history-section {
  width: 100%;
  max-width: 100%;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border-top: 2px solid #e5e7eb;
  box-sizing: border-box;
  overflow: hidden;
}

.position-history-section h4 {
  color: var(--accent, #2563eb);
  font-weight: 600;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.position-history-section h4:before {
  font-size: 1.2rem;
}

.position-history-dropdown {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--card-bg, #fff);
  color: var(--text, #0f172a);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
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
  width: 100%;
  max-width: 100%;
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: var(--card-bg, #fff);
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 6px 10px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  border-left: 4px solid #2563eb;
  box-sizing: border-box;
  overflow: hidden;
}

.selected-position-details:hover {
  box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.history-position-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  font-size: 0.9rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.history-position-info > div {
  display: flex;
  flex-direction: column;
  padding: 0.875rem;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-sizing: border-box;
  overflow: hidden;
  word-wrap: break-word;
  max-width: 100%;
}

.history-position-info strong {
  color: var(--accent, #2563eb);
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-position-info span {
  color: var(--text, #0f172a);
  font-weight: 500;
  font-size: 0.95rem;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  line-height: 1.4;
}

.history-position-info .time-ago {
  color: #6b7280;
  font-size: 0.8rem;
  font-style: italic;
  margin-top: 0.5rem;
  word-break: normal;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .alert-container {
    max-width: 95%;
    padding: 2rem;
    height: 95vh;
  }
  
  .modal-body {
    gap: 1.5rem;
  }
}

/* Media query specifica per 752px e schermi simili - Mantiene la mappa sempre visibile */
@media (max-width: 752px) {
  .alert-container {
    height: 95vh;
  }
  
  .map-container {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    min-height: 300px !important;
    height: auto !important;
    flex: none !important;
    width: 100% !important;
  }
  
  .details-container {
    flex: 1;
    height: auto;
    min-height: 300px;
  }
  
  .modal-body {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .map-container #map {
    width: 100% !important;
    height: 100% !important;
    min-height: 270px !important;
  }
}

/* Media query specifica per schermi medi - Mantiene la mappa visibile */
@media (max-width: 768px) and (min-width: 680px) {
  .modal-overlay {
    padding: 1rem;
  }
  
  .alert-container {
    padding: 1.5rem;
    height: 95vh;
    max-height: 95vh;
  }
  
  .alert-title {
    font-size: 1.25rem;
  }
  
  .modal-body {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .map-container {
    height: 40%;
    min-height: 300px;
    flex: none;
    width: 100%;
    order: 1;
  }
  
  .details-container {
    flex: 1;
    height: auto;
    min-height: 200px;
    order: 2;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 1rem;
  }
  
  .alert-container {
    padding: 1.5rem;
    height: 95vh;
    max-height: 95vh;
  }
  
  .alert-title {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
  
  .alert-text {
    margin-bottom: 1.5rem;
  }
  
  .modal-body {
    flex-direction: column;
    gap: 1rem;
  }
  
  .map-container {
    height: 35%;
    min-height: 200px;
    flex: none;
  }
  
  .details-container {
    flex: 1;
    height: auto;
    min-height: 150px;
  }
  
  /* Responsive per storico posizioni */
  .position-history-section {
    padding: 12px 16px;
  }
  
  .selected-position-details {
    padding: 1rem;
    margin-top: 1rem;
  }
  
  .history-position-info {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .history-position-info > div {
    padding: 0.75rem;
  }
  
  /* Indirizzi responsive per tablet */
  .history-position-info .address-info {
    padding: 6px 8px;
    font-size: clamp(0.6875rem, 1.8vw, 0.75rem);
    margin-top: 3px;
  }
}

@media (max-width: 480px) {
  .alert-container {
    padding: 0.75rem;
    height: 98vh;
    max-height: 98vh;
  }
  
  .alert-title {
    font-size: 1.125rem;
  }
  
  .map-container {
    height: 30%;
    min-height: 150px;
    padding: 0.75rem;
    flex: none;
  }
  
  .details-container {
    flex: 1;
    height: auto;
    min-height: 120px;
    padding: 0.75rem;
  }
  
  /* Position history ottimizzato per mobile piccolo */
  .position-history-section {
    padding: 8px 12px;
    border-radius: 12px;
  }
  
  .position-history-section h4 {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .position-history-dropdown {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
  
  .selected-position-details {
    padding: 0.75rem;
    margin-top: 0.75rem;
    border-radius: 12px;
  }
  
  .history-position-info {
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
  
  .history-position-info > div {
    padding: 0.625rem;
  }
  
  /* Indirizzi responsive per mobile piccolo */
  .history-position-info .address-info {
    padding: 4px 6px;
    font-size: clamp(0.625rem, 1.6vw, 0.6875rem);
    margin-top: 2px;
    border-radius: 4px;
  }
  
  .blackbtn, .refresh-btn {
    padding: 0.5rem 1rem;
    font-size: clamp(0.8125rem, 2.2vw, 0.9375rem);
    font-weight: 600;
    font-family: inherit;
  }
}

/* Stili per le informazioni degli indirizzi */
.address-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
  font-size: clamp(0.875rem, 2.2vw, 0.9375rem);
  color: #495057;
  line-height: 1.5;
  font-family: inherit;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
  box-sizing: border-box;
}

/* Indirizzi specifici per position history */
.history-position-info .address-info {
  margin-top: 4px;
  padding: 8px 10px;
  font-size: clamp(0.75rem, 2vw, 0.8125rem);
  border-radius: 6px;
  background: #e7f3ff;
  border-color: #bde0ff;
}

.address-info strong {
  color: #007bff;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

/* Stato di caricamento per gli indirizzi */
.address-info:has-text("Loading address...") {
  background: #fff3cd;
  border-color: #ffeaa7;
  color: #856404;
  font-style: italic;
}

/* Responsive per indirizzi */
@media (max-width: 768px) {
  .address-info {
    padding: 10px;
    font-size: clamp(0.8125rem, 2vw, 0.875rem);
    margin-top: 6px;
  }
}

@media (max-width: 480px) {
  .address-info {
    padding: 8px;
    font-size: clamp(0.75rem, 1.8vw, 0.8125rem);
  }
}
    `,
})
export class VeicleModal implements OnInit, AfterViewInit {
  @Input() titolo: string = '';
  @Input() testo: string = 'text to show';
  selectedVeicle = input<Veicles>();
  hideModal = output<boolean>();
  router = inject(Router);

  // Servizi necessari
  private mqttService = inject(MyMqttService);

  // Proprietà per lo storico posizioni
  positionHistory = signal<VeiclePosition[]>([]);
  selectedHistoryPosition: string = '';

  // Cache per gli indirizzi delle posizioni (reverse geocoding)
  addressCache = signal<Map<string, string>>(new Map());
  loadingAddresses = signal<Set<string>>(new Set());

  // Elementi della mappa
  @ViewChild('leafletMap')
  private mapElement: ElementRef | undefined;
  private map!: L.Map;
  private markers: L.Marker[] = [];

  ngOnInit(): void {
    console.log('[MODAL] Modal initialization for vehicle:', this.selectedVeicle()?.licensePlate);
    // Load position history
    this.loadPositionHistory();
  }

  ngAfterViewInit(): void {
    this.setupLeafletIcons();
    // Initialize only the map - DO NOT load all vehicles
    this.initMap();
  }

  // Method to configure icons and remove shadow
  private setupLeafletIcons(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      // Inline SVG icon to avoid external files
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
    console.log('[MODAL] Leaflet icons configuration completed');
  }

  initMap(): void {
    // Create map centered on Rome
    this.map = L.map(this.mapElement?.nativeElement, {
      center: [41.9028, 12.4964],
      zoom: 6,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    // SHOW ONLY the selected vehicle from dashboard (SelectedVeicle obj)
    this.showSelectedVehicleOnMap();
  }

  // Basic method to show selected vehicle
  showSelectedVehicleOnMap(): void {
    console.log('[MODAL] Displaying selected vehicle on map');
    // Check selected vehicle
    if (!this.selectedVeicle) {
      console.log('[MODAL] Error: No vehicle selected');
      return;
    }
    // Check if vehicle has a position
    if (!this.selectedVeicle()?.lastPosition) {
      console.log('[MODAL] Error: Vehicle has no position available');
      return;
    }
    const lat = this.selectedVeicle()?.lastPosition.latitude;
    const lng = this.selectedVeicle()?.lastPosition.longitude;
    if (!lat || !lng) {
      console.log('[MODAL] Error: Invalid coordinates - Lat:', lat, 'Lng:', lng);
      return;
    }
    console.log(
      '[MODAL] Creazione marker per veicolo:',
      this.selectedVeicle()?.licensePlate,
      'at coordinates:',
      lat,
      lng
    );
    // Create vehicle marker
    const marker = L.marker([lat, lng]).addTo(this.map);

    // Center map on vehicle
    this.map.setView([lat, lng], 15);

    // Save marker to be able to remove it later
    this.markers.push(marker);
  }

  //Modal closure by clicking outside the spaces
  onOverlayClick(event: MouseEvent): void {
    this.close();
  }
  //date formatting
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

    // Pre-carica gli indirizzi per tutte le posizioni in background
    this.preloadAddresses(mockHistory);
  }

  /**
   * Pre-carica gli indirizzi per tutte le posizioni dello storico
   */
  private async preloadAddresses(positions: VeiclePosition[]): Promise<void> {
    console.log('[MODAL] Pre-caricamento indirizzi avviato per', positions.length, 'posizioni');

    // Aggiungi anche la posizione corrente se esiste
    const currentPos = this.selectedVeicle()?.lastPosition;
    if (currentPos) {
      positions = [
        ...positions,
        {
          vehicleId: this.selectedVeicle()!.id,
          latitude: currentPos.latitude,
          longitude: currentPos.longitude,
          speed: currentPos.speed || 0,
          heading: currentPos.heading || 0,
          timestamp: new Date(),
          status: 'active',
        },
      ];
    }

    // Carica gli indirizzi in parallelo (massimo 3 alla volta per non sovraccaricare il servizio)
    const batchSize = 3;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      const promises = batch.map((pos) => this.reverseGeocode(pos.latitude, pos.longitude));

      try {
        await Promise.all(promises);
        // Piccola pausa tra i batch per essere gentili con il servizio
        if (i + batchSize < positions.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.warn('[MODAL] Errore nel pre-caricamento batch indirizzi:', error);
      }
    }

    console.log('[MODAL] Pre-caricamento indirizzi completato');
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

  /**
   * Esegue il reverse geocoding per ottenere l'indirizzo dalle coordinate
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const key = `${latitude},${longitude}`;

    // Verifica se l'indirizzo è già in cache
    const cached = this.addressCache().get(key);
    if (cached) {
      return cached;
    }

    // Verifica se stiamo già caricando questo indirizzo
    if (this.loadingAddresses().has(key)) {
      return 'Loading address...';
    }

    try {
      // Aggiungi alla lista di caricamento
      this.loadingAddresses.update((loading) => {
        const newSet = new Set(loading);
        newSet.add(key);
        return newSet;
      });

      // Usa Nominatim OpenStreetMap per il reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'VehicleTrackingApp/1.0 (your-email@example.com)',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();

      // Estrai l'indirizzo formattato
      let address = 'Address not available';

      if (data.display_name) {
        // Prova a costruire un indirizzo più leggibile
        const addr = data.address;
        if (addr) {
          const parts = [];
          if (addr.road) parts.push(addr.road);
          if (addr.house_number) parts.push(addr.house_number);
          if (addr.city || addr.town || addr.village) {
            parts.push(addr.city || addr.town || addr.village);
          }
          if (addr.country) parts.push(addr.country);

          address = parts.length > 0 ? parts.join(', ') : data.display_name;
        } else {
          address = data.display_name;
        }
      }

      // Salva in cache
      this.addressCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(key, address);
        return newCache;
      });

      return address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      const errorMsg = 'Unable to load address';

      // Salva l'errore in cache per evitare nuove richieste
      this.addressCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(key, errorMsg);
        return newCache;
      });

      return errorMsg;
    } finally {
      // Rimuovi dalla lista di caricamento
      this.loadingAddresses.update((loading) => {
        const newSet = new Set(loading);
        newSet.delete(key);
        return newSet;
      });
    }
  }

  /**
   * Ottiene l'indirizzo per una posizione (con cache)
   */
  getAddressForPosition(latitude: number, longitude: number): string {
    const key = `${latitude},${longitude}`;
    const cached = this.addressCache().get(key);

    if (cached) {
      return cached;
    }

    if (this.loadingAddresses().has(key)) {
      return 'Loading address...';
    }

    // Avvia il reverse geocoding in background
    this.reverseGeocode(latitude, longitude);
    return 'Loading address...';
  }
}
