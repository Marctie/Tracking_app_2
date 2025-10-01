import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VeicleService } from '../../services/veicle-service';
import { Veicles } from '../../models/veicles';
import { timeout } from 'rxjs';
import { UserService } from '../../services/user-service';
import { Router, RouterLink } from '@angular/router';
import { VeicleModal } from './modals/veicle-modal';
import { IMqttMessage } from 'ngx-mqtt';
import { VeiclePosition } from '../../models/veicle-position';
import { MyMqttService } from '../../services/mymqtt-service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, VeicleModal, RouterLink],
  template: `
    <div class="dashboard-container">
      <h1>Benvenuto sig.{{ userLogin.firstName() }}</h1>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>License Plate</th>
              <th>Model</th>
              <th>Brand</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action Button</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loop attraverso i veicoli paginati -->
            @for (item of paginatedVeicles(); track item.id) {
            <!-- Loop attraverso i chunk di proprietà del veicolo -->
            @for (chunk of chunkKeys(recoveryVeicleKeys(item), 7); track $index) {
            <tr>
              <!-- Loop attraverso ogni proprietà del chunk -->
              @for (key of chunk; track key) {
              <td>
                @if (key === 'createdAt') {
                {{ formatDataIt(item[key]) }}
                } @else {
                {{ item[key] }}
                }
              </td>
              }
              <td class="center">
                <button (click)="goToMap(item)">Mostra Dettagli</button>
                @if (showModal()) {
                <app-veiclemodal
                  [titolo]="titoloAlert ?? ''"
                  [testo]="descrizioneAlert ?? ''"
                  [selectedVeicle]="selectedVeicle()"
                  (hideModal)="showModal.set($event)"
                >
                </app-veiclemodal>
                }
              </td>
            </tr>
            } }
          </tbody>
        </table>
      </div>

      <!-- Controlli paginazione -->
      @if (totalPages() > 1) {
      <div class="pagination-container">
        <div class="pagination-info">
          Pagina {{ currentPage() }} di {{ totalPages() }} ({{ veicleList().length }} veicoli
          totali)
        </div>
        <div class="pagination-controls">
          <button class="page-btn" (click)="goToPage(1)" [disabled]="currentPage() === 1">
            &#171; Prima
          </button>
          <button
            class="page-btn"
            (click)="goToPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
          >
            &#8249; Precedente
          </button>
          <span class="page-numbers">
            <!-- Loop attraverso i numeri di pagina -->
            @for (page of getPageNumbers(); track page) {
            <button
              class="page-btn"
              [class.active]="page === currentPage()"
              (click)="goToPage(page)"
            >
              {{ page }}
            </button>
            }
          </span>
          <button
            class="page-btn"
            (click)="goToPage(currentPage() + 1)"
            [disabled]="currentPage() === totalPages()"
          >
            Successiva &#8250;
          </button>
          <button
            class="page-btn"
            (click)="goToPage(totalPages())"
            [disabled]="currentPage() === totalPages()"
          >
            Ultima &#187;
          </button>
        </div>
      </div>
      }
      <div class="stats">
        <span class="stat-item">
          Veicoli totali: <strong>{{ veicleList().length }}</strong>
        </span>
        <span class="stat-item">
          Con posizione: <strong>{{ getVeiclesWithPosition() }}</strong>
        </span>
      </div>
    </div>
  `,
  styles: `
  .center{
    text-align: center;
}
  /* Container responsivo */
  .dashboard-container {
    width: 100%;
    max-width: 100%;
    margin: 10px auto;
    padding: 15px;
    border: 2px solid #007bff;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    text-align: center;
    background-color: #f8f9fa;
    box-sizing: border-box;
  }

  h1 {
    color: #007bff;
    margin-bottom: 20px;
    font-size: clamp(1.5rem, 4vw, 2.5rem);
  }

  /* Bottoni responsivi */
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
  }

  .buttons button {
    padding: 10px 20px;
    font-size: clamp(14px, 2vw, 16px);
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    flex: 1;
    min-width: 120px;
    max-width: 200px;
  }

  .buttons button:hover {
    background-color: #0056b3;
  }

  /* Wrapper per tabella scrollabile */
  .table-wrapper {
    width: 100%;
    overflow-x: auto;
    margin-top: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  /* Tabella responsive con auto-sizing */
  table {
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;
    font-family: Arial, sans-serif;
    table-layout: auto;
  }

  th, td {
    padding: clamp(8px, 2vw, 15px);
    border: 1px solid #007bff;
    text-align: left;
    word-wrap: break-word;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  thead {
    background-color: #007bff;
    color: white;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  th {
    font-weight: bold;
    font-size: clamp(12px, 1.5vw, 14px);
    white-space: nowrap;
  }

  td {
    font-size: clamp(11px, 1.4vw, 13px);
  }

  tbody tr:nth-child(even) {
    background-color: #e9f0fc;
  }

  tbody tr:hover {
    background-color: #dae9ff;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  /* Bottone azione nella tabella */
  td button {
    padding: 5px 10px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }

  td button:hover {
    background-color: #218838;
  }

  /* Responsive breakpoints */
  @media (max-width: 768px) {
    .dashboard-container {
      margin: 5px;
      padding: 10px;
    }

    table {
      min-width: 500px;
    }

    th, td {
      padding: 6px 8px;
      font-size: 11px;
      max-width: 120px;
    }

    .buttons {
      flex-direction: column;
    }

    .buttons button {
      flex: none;
      width: 100%;
      margin: 5px 0;
    }
  }

  @media (max-width: 480px) {
    .dashboard-container {
      border: 1px solid #007bff;
    }

    table {
      min-width: 400px;
    }

    th, td {
      padding: 4px 6px;
      font-size: 10px;
      max-width: 80px;
    }

    h1 {
      font-size: 1.2rem;
    }
  }

  /* Auto-adjust per numero dinamico di colonne */
  @media (min-width: 769px) {
    table {
      table-layout: fixed;
    }
    
    th, td {
      width: auto;
      max-width: none;
    }
  }

  .message {
    margin-top: 20px;
    font-weight: bold;
    color: #28a745;
  }

  /* Stili paginazione */
  .pagination-container {
    margin-top: 20px;
    text-align: center;
  }

  .pagination-info {
    margin-bottom: 10px;
    color: #6c757d;
    font-size: 14px;
  }

  .pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }

  .page-btn {
    padding: 8px 12px;
    background-color: #fff;
    border: 1px solid #007bff;
    color: #007bff;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .page-btn:hover:not(:disabled) {
    background-color: #007bff;
    color: white;
  }

  .page-btn.active {
    background-color: #007bff;
    color: white;
    font-weight: bold;
  }

  .page-btn:disabled {
    background-color: #f8f9fa;
    color: #6c757d;
    cursor: not-allowed;
    border-color: #dee2e6;
  }

  .page-numbers {
    display: flex;
    gap: 2px;
  }

  @media (max-width: 768px) {
    .pagination-controls {
      flex-direction: column;
      gap: 10px;
    }
    
    .page-numbers {
      order: -1;
    }
  }
  `,
})
export class Dashboard implements OnInit {
  showModal = signal(false);
  titoloAlert: string | undefined;
  descrizioneAlert: string | undefined;
  selectedVeicle = signal<Veicles>({} as Veicles);
  mqttService = inject(MyMqttService);

  // Proprietà per la paginazione
  currentPage = signal(1);
  itemsPerPage = 10;
  totalPages = signal(0);

  userLogin = inject(UserService);
  veicleService = inject(VeicleService);
  veicleList = signal<Veicles[]>([]);
  paginatedVeicles = signal<Veicles[]>([]);
  router = inject(Router);

  constructor() {
    effect(() => {
      this.userLogin.login.name;
      console.log('console dash', this.mqttService.positionVeiclesList());
    });
  }

  ngOnInit() {
    this.loadVeicles();
    console.log(this.veicleList());
    this.userLogin.login.name;
  }

  loadVeicles(): void {
    this.veicleService.getListVeicle().subscribe((response) => {
      this.veicleList.set(response.items);
      this.updatePagination();
      console.log('mia response', this.veicleList());
    });
  }

  onClick() {
    this.loadVeicles();
  }

  // campi da nascondere nella tabella
  private hiddenFields: (keyof Veicles)[] = ['id', 'lastPosition']; // campi nascosti

  // funzione per recuperare i campi e inserirli in html senza doverli scrivere piu volte
  recoveryVeicleKeys(veicle: Veicles): (keyof Veicles)[] {
    let allKeys = Object.keys(veicle) as (keyof Veicles)[];
    // filtra i campi che non vuoi mostrare
    let visibleKeys = allKeys.filter((key) => !this.hiddenFields.includes(key));
    return visibleKeys;
  }

  // suddivide un array in chunk di dimensione n
  chunkKeys<T>(arr: T[], size: number): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  }

  // Formatta la data in formato italiano
  formatDataIt(data: string | Date): string {
    if (!data) return '';
    const d = new Date(data);
    if (isNaN(d.getTime())) return String(data); // fallback se non è una data valida
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  //funzione per l'apertura e chiusura della modale
  goToMap(veicle: Veicles) {
    this.selectedVeicle.set(veicle);
    this.showModal.set(true);
    this.titoloAlert = 'Dettaglio Veicolo';
    this.descrizioneAlert = `Informazioni dettagliate per ${veicle.licensePlate}`;
  }

  // Metodi per la paginazione
  updatePagination(): void {
    const total = Math.ceil(this.veicleList().length / this.itemsPerPage);
    this.totalPages.set(total);

    if (this.currentPage() > total && total > 0) {
      this.currentPage.set(total);
    }

    this.updatePaginatedVeicles();
  }

  updatePaginatedVeicles(): void {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginated = this.veicleList().slice(startIndex, endIndex);
    this.paginatedVeicles.set(paginated);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.updatePaginatedVeicles();
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Mostra al massimo 5 numeri di pagina
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    // Aggiusta se siamo verso la fine
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Metodo per contare i veicoli con posizione
  public getVeiclesWithPosition(): number {
    return this.veicleList().filter(
      (veicle) =>
        veicle.lastPosition && veicle.lastPosition.latitude && veicle.lastPosition.longitude
    ).length;
  }
}
