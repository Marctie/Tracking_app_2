import {
  AfterViewChecked,
  Component,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VeicleService } from '../../services/veicle-service';
import { Veicles } from '../../models/veicles';
import { UserService } from '../../services/user-service';
import { Router } from '@angular/router';
import { VeicleModal } from './modals/veicle-modal';
import { MyMqttService } from '../../services/mymqtt-service';
import { IFilter, SelectFilter } from './select-filter';
import { VehicleCacheService } from '../../services/vehicle-cache.service';

/**
 *
 * FUNZIONAMENTO:
 * • Se sei in pagina 1 → Pre-carica automaticamente pagina 2
 * • Se sei in pagina 3 → Pre-carica automaticamente pagina 4
 * • Navigazione istantanea: le pagine già visitate sono in cache
 * • Adattamento dinamico: se il server cambia totalPages, il sistema si adatta
 *
 * CARATTERISTICHE:
 * - Cache Map-based per performance ottimali
 * - Pre-caricamento sequenziale solo della pagina successiva
 * - Scadenza cache (5 minuti) per dati sempre aggiornati
 * - Gestione memoria intelligente con cleanup automatico
 * - Indicatori visivi per pre-caricamento in corso
 * - Adattamento automatico a cambiamenti nel numero di pagine
 * - Debug tools per monitoraggio (console: window.dashboard.debugCacheSystem())
 *

 */

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, VeicleModal, SelectFilter],
  template: `
    <!-- test -->
    <div class="dashboard-container" (click)="onClickOutsideModal()">
      <h1>Welcome Mr. {{ userLogin.firstName() || getStoredUserName() }}</h1>
      <div>
        <app-select-filter #selectFilter (filterParam)="onFilterBy($event)"></app-select-filter>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>License Plate</th>
              <th>Model</th>
              <th>Brand</th>
              <th>Status</th>
              <!-- <th>Created At</th> -->
              <th>Action Button</th>
            </tr>
          </thead>
          <tbody>
            <!-- Mostra risultati della ricerca globale o veicoli paginati -->
            @if (isGlobalSearchActive()) {
            <!-- Risultati della ricerca globale -->
            @for (item of filterList(); track item.id) {
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
                <button (click)="goToMap(item, $event)">Show Details</button>
              </td>
            </tr>
            } } } @else {
            <!-- Paginated vehicles normally -->
            @for (item of vehiclesWithLiveStatus(); track item.id) {
            <!-- Loop through vehicle property chunks -->
            @for (chunk of chunkKeys(recoveryVeicleKeys(item), 7); track $index) {
            <tr>
              <!-- Loop through each property in chunk -->
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
                <button (click)="goToMap(item, $event)">Show Details</button>
              </td>
            </tr>
            } } }
          </tbody>
        </table>
      </div>

      <!-- Controlli paginazione - nascosti durante ricerca globale -->
      @if (totalPages() > 1 && !isGlobalSearchActive()) {
      <div class="pagination-container">
        <div class="pagination-info">
          Page {{ currentPage() }} of {{ totalPages() }} ({{ totalCount() }} total vehicles)
        </div>
        <div class="pagination-controls">
          <button class="page-btn" (click)="goToPage(1)" [disabled]="currentPage() === 1">
            &#171; First
          </button>
          <button
            class="page-btn"
            (click)="goToPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
          >
            &#8249; Previous
          </button>
          <span class="page-numbers">
            <!-- Loop through page numbers -->
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
            Next &#8250;
          </button>
          <button
            class="page-btn"
            (click)="goToPage(totalPages())"
            [disabled]="currentPage() === totalPages()"
          >
            Last &#187;
          </button>
        </div>
      </div>
      }

      <!-- Indicatore per ricerca globale -->
      @if (isGlobalSearchActive()) {
      <div class="search-results-info">
        @if (isSearching()) {
        <div class="search-indicator">
          <strong>Searching...</strong>
          <span class="loading-spinner"></span>
        </div>
        } @else if (searchError()) {
        <div class="search-indicator error">
          <strong>{{ searchError() }}</strong>
        </div>
        <button class="btn-secondary" (click)="resetToNormalPagination()">
          Back to normal view
        </button>
        } @else {
        <div class="search-indicator">
          <strong>Global search active</strong>
          <!-- - Showing {{ filterList().length }} results
          out of {{ allVeicles().length }} total vehicles -->
        </div>
        <button class="btn-secondary" (click)="resetToNormalPagination()">
          ← Back to normal view
        </button>
        }
      </div>
      }
      <!-- <div class="stats" >
        <span class="stat-item" style="text-align: left;">
          Veicoli totali: <strong>{{ totalCount() }}</strong>
        </span>
         <span class="stat-item">
          Con posizione: <strong>{{ getVeiclesWithPosition() }}</strong>
        </span> 
      </div> 
      -->
    </div>
    @if (showModal()) {
    <app-veiclemodal
      [titolo]="titoloAlert ?? ''"
      [testo]="descrizioneAlert ?? ''"
      [selectedVeicle]="selectedVeicle()"
      (hideModal)="showModal.set($event)"
    >
    </app-veiclemodal>
    }
  `,
  styles: `
  .center{
    text-align: center;
}
  /* Container responsivo */
  .dashboard-container {
    width: calc(100% - 40px);
    max-width: calc(100% - 40px);
    margin: 20px auto;
    padding: 24px;
    border: 2px solid #007bff;
    border-radius: 12px;
    font-family: 'Inter', 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    text-align: center;
    background-color: #f8f9fa;
    box-sizing: border-box;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overscroll-behavior-x: none;
  }

  h1 {
    color: #007bff;
    margin-bottom: 32px;
    font-size: clamp(1.75rem, 5vw, 2.75rem);
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  /* Centraggio componente filtro */
  app-select-filter {
    display: block;
    width: 100%;
    margin: 0 auto 24px auto;
  }

  /* Bottoni responsivi */
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    margin-bottom: 32px;
  }

  .buttons button {
    padding: 14px 24px;
    font-size: clamp(0.875rem, 2.5vw, 1.125rem);
    font-weight: 500;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    flex: 1;
    min-width: 140px;
    max-width: 220px;
    font-family: inherit;
  }

  .buttons button:hover {
    background-color: #0056b3;
  }

  /* Wrapper per tabella scrollabile */
  .table-wrapper {
    width: 100%;
    overflow-x: auto;
    margin-top: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: #007bff #f1f5f9;
    overscroll-behavior-x: contain;
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
    padding: clamp(12px, 2.5vw, 18px);
    border: 1px solid #007bff;
    text-align: left;
    word-wrap: break-word;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: inherit;
  }

  thead {
    background-color: #007bff;
    color: white;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  th {
    font-weight: 600;
    font-size: clamp(0.875rem, 2vw, 1rem);
    white-space: nowrap;
    letter-spacing: 0.025em;
  }

  td {
    font-size: clamp(0.8125rem, 1.8vw, 0.9375rem);
    line-height: 1.5;
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
    padding: 8px 16px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: clamp(0.75rem, 1.5vw, 0.875rem);
    font-weight: 500;
    font-family: inherit;
  }

  td button:hover {
    background-color: #218838;
  }

  /* Responsive breakpoints */
  @media (max-width: 768px) {
    .dashboard-container {
      width: calc(100% - 16px);
      max-width: calc(100% - 16px);
      margin: 8px auto;
      padding: 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      overscroll-behavior: none;
      position: relative;
    }

    app-select-filter {
      margin: 0 auto 16px auto;
    }

    table {
      min-width: 500px;
    }

    th, td {
      padding: 8px 12px;
      max-width: 120px;
    }
    
    th {
      font-size: clamp(0.8125rem, 2vw, 0.875rem);
    }
    
    td {
      font-size: clamp(0.75rem, 1.8vw, 0.8125rem);
    }

    .buttons {
      flex-direction: column;
      gap: 12px;
    }

    .buttons button {
      flex: none;
      width: 100%;
      margin: 0;
      padding: 16px 20px;
      font-size: clamp(1rem, 2.5vw, 1.125rem);
    }
  }

  @media (max-width: 480px) {
    .dashboard-container {
      border: 1px solid #007bff;
      margin: 4px;
      padding: 12px;
    }

    table {
      min-width: 400px;
    }

    th, td {
      padding: 6px 8px;
      max-width: 80px;
    }
    
    th {
      font-size: clamp(0.75rem, 1.8vw, 0.8125rem);
    }
    
    td {
      font-size: clamp(0.6875rem, 1.5vw, 0.75rem);
    }

    h1 {
      font-size: clamp(1.375rem, 4vw, 1.5rem);
      margin-bottom: 24px;
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

  /* Controlli touch aggiuntivi per dispositivi molto piccoli */
  @media (max-width: 480px) {
    .dashboard-container {
      width: calc(100% - 8px);
      max-width: calc(100% - 8px);
      margin: 4px auto;
      padding: 12px;
      touch-action: pan-y;
      -webkit-user-select: none;
      user-select: none;
    }

    app-select-filter {
      margin: 0 auto 12px auto;
    }
    
    .table-wrapper {
      touch-action: pan-x pan-y;
      overscroll-behavior: contain;
    }
    
    body {
      position: fixed;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    
    html {
      overflow: hidden;
    }
  }

  .message {
    margin-top: 20px;
    font-weight: bold;
    color: #28a745;
  }

  /* Stili paginazione */
  .pagination-container {
    margin-top: 32px;
    text-align: center;
  }

  .pagination-info {
    margin-bottom: 16px;
    color: #6c757d;
    font-size: clamp(0.875rem, 2vw, 1rem);
    font-weight: 500;
  }

  .pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .page-btn {
    padding: 10px 16px;
    background-color: #fff;
    border: 1px solid #007bff;
    color: #007bff;
    cursor: pointer;
    font-size: clamp(0.875rem, 2vw, 1rem);
    font-weight: 500;
    border-radius: 6px;
    transition: all 0.2s ease;
    font-family: inherit;
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
    gap: 4px;
  }

  @media (max-width: 768px) {
    .pagination-controls {
      flex-direction: column;
      gap: 16px;
    }
    
    .page-numbers {
      order: -1;
    }

    .pagination-container {
      margin-top: 24px;
    }
  }

  /* Stili per statistiche */
  .stats {
    margin-top: 24px;
    display: flex;
    gap: 24px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat-item {
    color: #6c757d;
    font-size: clamp(0.875rem, 2vw, 1rem);
    font-weight: 500;
    padding: 8px 12px;
  }

  /* Stili per ricerca globale */
  .search-results-info {
    margin: 24px 0;
    padding: 20px;
    background-color: #e3f2fd;
    border: 2px solid #2196f3;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .search-indicator {
    color: #1976d2;
    font-size: clamp(0.875rem, 2vw, 1rem);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .search-indicator.error {
    color: #d32f2f;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e3f2fd;
    border-top: 2px solid #2196f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .btn-secondary {
    padding: 10px 20px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: clamp(0.8125rem, 1.8vw, 0.9375rem);
    font-weight: 500;
    transition: all 0.3s ease;
    font-family: inherit;
  }

  .btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .search-results-info {
      flex-direction: column;
      text-align: center;
    }
  }
  `,
})
export class Dashboard implements OnInit, OnDestroy {
  @ViewChild('selectFilter') selectFilterComponent!: SelectFilter;

  showModal = signal(false);
  messageStorage = {};

  titoloAlert: string | undefined;
  descrizioneAlert: string | undefined;
  selectedVeicle = signal<Veicles>({} as Veicles);
  mqttService = inject(MyMqttService);

  // Proprietà per la paginazione semplice
  currentPage = signal(1);
  itemsPerPage = 10;
  totalPages = signal(0);
  totalCount = signal(0);

  // Signals principali
  userLogin = inject(UserService);
  veicleService = inject(VeicleService);
  cacheService = inject(VehicleCacheService);
  veicleList = signal<Veicles[]>([]); // Veicoli della pagina corrente
  allVeicles = signal<Veicles[]>([]); // Tutti i veicoli per la ricerca globale
  router = inject(Router);
  isGlobalSearchActive = signal(false); // Flag per sapere se è attiva una ricerca globale
  isSearching = signal(false); // Flag per stato di caricamento ricerca
  searchError = signal<string | null>(null); // Errore durante la ricerca

  filterList = computed(() => {
    const lista = this.isGlobalSearchActive() ? this.allVeicles() : this.veicleList();
    const filterValue = this.value();

    if (!filterValue.textFilter || filterValue.textFilter.trim() === '') {
      return lista;
    }

    let trimText = filterValue.textFilter;

    return lista.filter((veicolo) => {
      if (filterValue.valueOption === 'licensePlate') {
        return veicolo.licensePlate.toUpperCase().includes(trimText);
      } else if (filterValue.valueOption === 'model') {
        return veicolo.model.toUpperCase().includes(trimText);
      } else {
        // Ricerca in tutti i campi quando valueOption è vuoto
        return (
          veicolo.licensePlate.toUpperCase().includes(trimText) ||
          veicolo.model.toUpperCase().includes(trimText) ||
          veicolo.brand?.toUpperCase().includes(trimText) ||
          veicolo.status?.toUpperCase().includes(trimText)
        );
      }
    });
  });

  value = signal<IFilter>({} as IFilter);

  // Signal computed che unisce automaticamente veicoli con stati MQTT più recenti
  vehiclesWithLiveStatus = computed(() => {
    const vehicles = this.veicleList(); // Usa veicleList invece di paginatedVeicles
    const statusesById = this.mqttService.statusById();

    if (Object.keys(statusesById).length === 0) {
      return vehicles; // Nessun stato MQTT disponibile, restituisce veicoli originali
    }

    return vehicles.map((vehicle) => {
      const mqttStatus = statusesById[vehicle.id];
      if (mqttStatus && mqttStatus.status && mqttStatus.status !== vehicle.status) {
        console.log(
          `[COMPUTED] Updating vehicle ${vehicle.licensePlate} status from ${vehicle.status} to ${mqttStatus.status}`
        );
        return { ...vehicle, status: mqttStatus.status };
      }
      return vehicle;
    });
  });

  constructor() {
    effect(() => {
      this.userLogin.login.name;
      console.log(
        '[DASHBOARD] Lista veicoli filtrata aggiornata:',
        this.filterList().length,
        'elementi'
      );
    });

    // Effect per aggiornamenti live degli stati via MQTT
    effect(() => {
      const mqttPositions = this.mqttService.positionVeiclesList();
      const statusesById = this.mqttService.statusById();

      console.log(
        '[DASHBOARD EFFECT] Triggered - Positions:',
        mqttPositions.length,
        'StatusesById:',
        Object.keys(statusesById).length
      );
      console.log('[DASHBOARD EFFECT] Current statusesById:', statusesById);

      if (
        (mqttPositions.length > 0 || Object.keys(statusesById).length > 0) &&
        this.veicleList().length > 0
      ) {
        console.log('[DASHBOARD] Rilevato aggiornamento MQTT - aggiornamento stati veicoli');
        this.updateVehicleStatesFromMqtt(mqttPositions);
      }
    });
  }

  ngOnInit() {
    console.log('[DASHBOARD] Inizializzazione componente dashboard');
    this.loadVeicles();
    this.loadUserName();

    // Sottoscrizione ai messaggi di stato MQTT (come in general-map)
    this.mqttService.subscribeAndTrack('vehicles/+/status', (msg) => {
      const payload = msg.payload.toString();
      console.log('[DASHBOARD] MQTT message received (status):', payload);
      console.log('[DASHBOARD] Message topic:', msg.topic);

      // Ingesta il messaggio di stato per aggiornare statusById
      this.mqttService.ingestStatusMessage(msg);

      // Log dello stato dopo l'ingestione
      console.log('[DASHBOARD] StatusesById after ingestion:', this.mqttService.statusById());
    });

    //TEST da cancellare
    // this.veicleService.getAnimali();
  }

  private loadUserName(): void {
    if (!this.userLogin.firstName()) {
      const storedFirstName = localStorage.getItem('userFirstName');
      if (storedFirstName) {
        // Aggiorna il signal del servizio con il nome salvato
        this.userLogin.firstName.set(storedFirstName);
        console.log('[DASHBOARD] Nome utente recuperato dal localStorage:', storedFirstName);
      }
    }
  }

  /**
   * Metodo fallback per ottenere il nome utente dal localStorage
   * @returns Nome utente dal localStorage o stringa vuota
   */
  getStoredUserName(): string {
    return localStorage.getItem('userFirstName') || '';
  }

  /**
   * Carica la lista dei veicoli dal servizio con paginazione semplice
   * @param page - Numero di pagina da caricare
   */
  loadVeicles(page?: number): void {
    const pageToLoad = page || this.currentPage();

    console.log(`[DASHBOARD] Caricamento pagina ${pageToLoad}...`);

    this.veicleService.getListVeicle(pageToLoad, this.itemsPerPage).subscribe({
      next: (response) => {
        this.veicleList.set(response.items);
        this.totalCount.set(response.totalCount);
        this.totalPages.set(response.totalPages);
        this.currentPage.set(response.page);

        console.log(
          '[DASHBOARD] Caricamento completato - Pagina:',
          response.page,
          'di',
          response.totalPages,
          '- Veicoli:',
          response.items.length
        );
      },
      error: (error) => {
        console.error('[DASHBOARD] Errore caricamento veicoli:', error);
      },
    });
  }

  // Metodi per la paginazione semplice
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      console.log(`[DASHBOARD] Navigazione alla pagina: ${page}`);
      this.loadVeicles(page);
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

  // Metodi di utility per il template

  // campi da nascondere nella tabella
  private hiddenFields: (keyof Veicles)[] = ['id', 'createdAt', 'lastPosition'];

  /**
   * Recupera le chiavi visibili del veicolo escludendo quelle nascoste
   */
  recoveryVeicleKeys(veicle: Veicles): (keyof Veicles)[] {
    let allKeys = Object.keys(veicle) as (keyof Veicles)[];
    let visibleKeys = allKeys.filter((key) => !this.hiddenFields.includes(key));
    return visibleKeys;
  }

  /**
   * Suddivide un array in chunk di dimensione specificata
   */
  chunkKeys<T>(arr: T[], size: number): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  }

  /**
   * Formatta una data in formato italiano
   */
  formatDataIt(data: string | Date): string {
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
   * Apre il modal con i dettagli del veicolo selezionato
   */
  goToMap(veicle: Veicles, event: Event) {
    if (!this.showModal()) {
      event.stopPropagation();
    }
    this.selectedVeicle.set(veicle);
    this.showModal.set(true);
    this.titoloAlert = 'Vehicle Details';
    this.descrizioneAlert = `Detailed information for ${veicle.licensePlate}`;
    console.log('[DASHBOARD] Apertura modal dettagli veicolo:', veicle.licensePlate);
    let variab = localStorage.getItem(veicle.id.toString());
    this.messageStorage = variab ? JSON.parse(variab) : {};
  }

  // Metodo per il filtraggio
  onFilterBy(value: IFilter) {
    console.log('[DASHBOARD] Filtro ricevuto:', value);
    this.value.set(value);

    if (value.isGlobalSearch && value.textFilter?.trim()) {
      this.performGlobalSearch(value);
    } else if (!value.textFilter?.trim()) {
      this.resetToNormalPagination();
    } else {
      // Filtro normale - reset alla pagina 1
      this.currentPage.set(1);
      this.loadVeicles(1);
    }
  }

  // Esegue una ricerca globale su tutti i veicoli
  private performGlobalSearch(filterValue: IFilter): void {
    this.isGlobalSearchActive.set(true);
    this.isSearching.set(true);
    this.searchError.set(null);

    this.veicleService.getAllVeicles().subscribe({
      next: (response) => {
        this.allVeicles.set(response.items);
        this.isSearching.set(false);
        console.log('[DASHBOARD] Ricerca globale completata:', response.items.length, 'veicoli');
      },
      error: (error) => {
        console.error('[DASHBOARD] Errore ricerca globale:', error);
        this.isSearching.set(false);
        this.isGlobalSearchActive.set(false);
        this.searchError.set('Error during search. Please try again.');
      },
    });
  }

  // Torna alla paginazione normale
  resetToNormalPagination(): void {
    console.log('[DASHBOARD] Reset to normal pagination');

    this.isGlobalSearchActive.set(false);
    this.isSearching.set(false);
    this.searchError.set(null);
    this.allVeicles.set([]);

    // Reset dei filtri nel componente select-filter
    if (this.selectFilterComponent) {
      this.selectFilterComponent.resetFilters();
    }

    // Torna alla pagina 1
    this.currentPage.set(1);
    this.loadVeicles(1);
  }

  // Metodo semplificato per aggiornare gli stati MQTT
  private updateVehicleStatesFromMqtt(mqttPositions: any[]): void {
    const currentVehicles = this.veicleList();
    const statusesById = this.mqttService.statusById();
    let hasUpdates = false;

    const updatedVehicles = currentVehicles.map((vehicle) => {
      const mqttStatus = statusesById[vehicle.id];

      if (mqttStatus && mqttStatus.status && mqttStatus.status !== vehicle.status) {
        hasUpdates = true;
        return { ...vehicle, status: mqttStatus.status };
      }

      return vehicle;
    });

    if (hasUpdates) {
      this.veicleList.set(updatedVehicles);
      console.log('[DASHBOARD] Stati veicoli aggiornati da MQTT');
    }
  }

  //metodo per la chiusura della modale fuori dalla modale
  onClickOutsideModal() {
    if (this.showModal()) {
      this.showModal.set(false);
      console.log('[DASHBOARD] Modal chiuso tramite click esterno');
    }
  }

  ngOnDestroy() {
    // Pulisce le sottoscrizioni MQTT quando il componente viene distrutto
    console.log('[DASHBOARD] Distruggendo componente - pulizia sottoscrizioni MQTT');
  }
}
