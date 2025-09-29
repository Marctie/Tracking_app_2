import { Component, Input, Output, EventEmitter, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { Veicles } from '../../../models/veicles';
import { CommonModule } from '@angular/common';

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
            <p>Contenitore per la mappa</p>
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
export class VeicleModal {
  @Input() titolo: string = '';
  @Input() testo: string = 'testo da mostrare ';
  @Input() selectedVeicle: Veicles | null = null;
  hideModal = output<boolean>();
  router = inject(Router);

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
}
