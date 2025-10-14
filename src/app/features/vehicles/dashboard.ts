import {
  AfterViewChecked,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
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
 * DASHBOARD CON PRE-CARICAMENTO SEQUENZIALE INTELLIGENTE
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
 * ESEMPIO DI UTILIZZO:
 * 1. Carica pagina 1 → Sistema pre-carica pagina 2 in background
 * 2. Click su "Successiva" → Pagina 2 appare istantaneamente (già in cache)
 * 3. Sistema pre-carica pagina 3 in background
 * 4. E così via...
 */

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, VeicleModal, SelectFilter],
  template: `
    <!-- test -->
    <div class="dashboard-container" (click)="onClickOutsideModal()">
      <h1>Welcome Mr. {{ userLogin.firstName() || getStoredUserName() }}</h1>
      <div>
        <app-select-filter (filterParam)="onFilterBy($event)"></app-select-filter>
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
            @for (item of paginatedVeicles(); track item.id) {
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
export class Dashboard implements OnInit {
  showModal = signal(false);
  messageStorage = {};

  titoloAlert: string | undefined;
  descrizioneAlert: string | undefined;
  selectedVeicle = signal<Veicles>({} as Veicles);
  mqttService = inject(MyMqttService);

  // Proprietà per la paginazione lato server
  currentPage = signal(1);
  itemsPerPage = 10;
  totalPages = signal(0);
  totalCount = signal(0); //  conteggio totale dal server

  // SISTEMA CACHE per pre-caricamento sequenziale
  private pageCache = new Map<number, Veicles[]>(); // Cache delle pagine caricate
  private cacheTimestamp = new Map<number, number>(); // Timestamp per scadenza cache
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minuti di validità
  private isPreloading = signal(false); // Stato pre-caricamento (solo per debugging)
  private preloadingPages = new Set<number>(); // Pagine in corso di pre-caricamento

  userLogin = inject(UserService);
  veicleService = inject(VeicleService);
  cacheService = inject(VehicleCacheService);
  veicleList = signal<Veicles[]>([]); // Veicoli della pagina corrente o risultati della ricerca
  allVeicles = signal<Veicles[]>([]); // Tutti i veicoli per la ricerca globale
  paginatedVeicles = signal<Veicles[]>([]); // Non più necessario ma mantenuto per compatibilità
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
      if (mqttPositions.length > 0 && this.veicleList().length > 0) {
        console.log('[DASHBOARD] Rilevato aggiornamento MQTT - aggiornamento stati veicoli');
        this.updateVehicleStatesFromMqtt(mqttPositions);
      }
    });
  }

  ngOnInit() {
    console.log('[DASHBOARD] Inizializzazione componente dashboard');
    this.loadVeicles();
    this.loadUserName();
  }

  /**
   * Carica il nome utente dal localStorage se non è presente nel signal
   */
  private loadUserName(): void {
    // Se il signal firstName è vuoto, prova a recuperare dal localStorage
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
   * Carica la lista dei veicoli dal servizio con paginazione lato server
   * Utilizza cache per navigazione istantanea e pre-carica pagina successiva
   *  Utilizza dati pre-caricati dal login se disponibili per pagina 1
   * @param page - Numero di pagina da caricare (default: pagina corrente)
   */
  loadVeicles(page?: number): void {
    const currentPageToLoad = page || this.currentPage();

    if (currentPageToLoad === 1) {
      const cachedDashboardData = this.cacheService.getDashboardData();
      if (cachedDashboardData) {
        console.log('[DASHBOARD] Utilizzo dati dalla cache sincronizzata');
        this.applyNewCachedData(cachedDashboardData);
        this.preloadNextPage(1); // Pre-carica pagina 2
        return;
      }

      const preloadedData = this.getPreloadedFirstPage();
      if (preloadedData) {
        console.log('[DASHBOARD] Utilizzo dati pre-caricati dal login (legacy)');
        this.applyPreloadedData(preloadedData);
        this.preloadNextPage(1); // Pre-carica pagina 2
        return;
      }
    }

    // CONTROLLO CACHE: Se la pagina è già in cache e valida, usala
    const cachedData = this.getCachedPage(currentPageToLoad);
    if (cachedData) {
      console.log(`[DASHBOARD] Pagina ${currentPageToLoad} caricata da cache`);
      this.applyCachedData(currentPageToLoad, cachedData);
      // Pre-carica la pagina successiva se non già in cache
      this.preloadNextPage(currentPageToLoad);
      return;
    }

    console.log(`[DASHBOARD] Caricamento pagina ${currentPageToLoad} dal server...`);

    this.veicleService.getListVeicle(currentPageToLoad, this.itemsPerPage).subscribe((response) => {
      // Aggiorna i veicoli della pagina corrente
      this.veicleList.set(response.items);
      this.paginatedVeicles.set(response.items);

      // AGGIORNAMENTO DINAMICO: metadati di paginazione dal server
      this.totalCount.set(response.totalCount);
      this.totalPages.set(response.totalPages);
      this.currentPage.set(response.page);

      // ADATTAMENTO DINAMICO: Se il server ha cambiato il numero di pagine
      this.adaptToDynamicPagination(response.totalPages);

      // SALVA IN CACHE per navigazioni future
      this.setCachedPage(currentPageToLoad, response.items);

      // SALVA NELLA NUOVA CACHE se è la prima pagina
      if (currentPageToLoad === 1) {
        this.cacheService.saveDashboardData(response);
      }

      console.log(
        '[DASHBOARD] Caricamento completato - Pagina:',
        response.page,
        'di',
        response.totalPages,
        '- Veicoli:',
        response.items.length,
        '- Totale sul server:',
        response.totalCount
      );

      // PRE-CARICAMENTO SEQUENZIALE: carica la pagina successiva
      this.preloadNextPage(currentPageToLoad);
    });
  }

  /**
   * GESTIONE CACHE: Ottiene dati dalla cache se validi
   * @param page - Numero di pagina
   * @returns Array di veicoli se in cache e valida, null altrimenti
   */
  private getCachedPage(page: number): Veicles[] | null {
    const data = this.pageCache.get(page);
    const timestamp = this.cacheTimestamp.get(page);

    if (data && timestamp) {
      const now = Date.now();
      if (now - timestamp < this.CACHE_DURATION) {
        return data;
      } else {
        // Cache scaduta, rimuovi
        this.pageCache.delete(page);
        this.cacheTimestamp.delete(page);
        console.log(`[DASHBOARD] Cache scaduta per pagina ${page}, rimossa`);
      }
    }

    return null;
  }

  /**
   * SALVATAGGIO CACHE: Salva dati pagina in cache
   * @param page - Numero di pagina
   * @param data - Dati da salvare
   */
  private setCachedPage(page: number, data: Veicles[]): void {
    this.pageCache.set(page, [...data]); // Clone dell'array per sicurezza
    this.cacheTimestamp.set(page, Date.now());
    console.log(`[DASHBOARD] Pagina ${page} salvata in cache (${data.length} veicoli)`);
  }

  /**
   * APPLICA DATI CACHED al componente
   * @param page - Numero di pagina
   * @param data - Dati cached
   */
  private applyCachedData(page: number, data: Veicles[]): void {
    this.veicleList.set(data);
    this.paginatedVeicles.set(data);
    this.currentPage.set(page);
    // Non aggiorniamo totalCount e totalPages da cache per evitare inconsistenze
  }

  /**
   * GESTIONE PRE-CARICAMENTO: Recupera dati pre-caricati dal login
   * @returns Dati pre-caricati se validi e recenti, null altrimenti
   */
  private getPreloadedFirstPage(): any | null {
    try {
      const preloadedData = localStorage.getItem('preloadedFirstPage');
      if (!preloadedData) return null;

      const data = JSON.parse(preloadedData);
      const now = Date.now();
      const dataAge = now - data.timestamp;

      // I dati pre-caricati sono validi per 2 minuti
      if (dataAge < 2 * 60 * 1000) {
        return data;
      } else {
        // Rimuovi dati scaduti
        localStorage.removeItem('preloadedFirstPage');
        return null;
      }
    } catch (error) {
      console.warn('[DASHBOARD] Errore lettura dati pre-caricati:', error);
      localStorage.removeItem('preloadedFirstPage');
      return null;
    }
  }

  /**
   * APPLICA DATI PRE-CARICATI: Utilizza i dati dal login
   * @param preloadedData - Dati pre-caricati dal login
   */
  private applyPreloadedData(preloadedData: any): void {
    this.veicleList.set(preloadedData.items);
    this.paginatedVeicles.set(preloadedData.items);
    this.currentPage.set(preloadedData.page);
    this.totalCount.set(preloadedData.totalCount);
    this.totalPages.set(preloadedData.totalPages);

    // Salva anche in cache per coerenza
    this.setCachedPage(preloadedData.page, preloadedData.items);

    // Rimuovi i dati pre-caricati una volta utilizzati
    localStorage.removeItem('preloadedFirstPage');

    console.log('[DASHBOARD] Dati pre-caricati applicati con successo');
  }

  /**
   * Applica i dati dal nuovo sistema di cache sincronizzata
   */
  private applyNewCachedData(cachedData: any): void {
    // Applica prima i dati dalla cache
    this.veicleList.set(cachedData.items);
    this.paginatedVeicles.set(cachedData.items);
    this.currentPage.set(cachedData.page);
    this.totalCount.set(cachedData.totalCount);
    this.totalPages.set(cachedData.totalPages);

    // Aggiorna con i dati MQTT più recenti
    const mqttPositions = this.mqttService.positionVeiclesList();
    this.updateVehicleStatesFromMqtt(mqttPositions);

    // Salva anche nella cache del nuovo sistema per ottimizzare
    this.cacheService.saveDashboardData({
      page: cachedData.page,
      items: this.veicleList(),
      totalCount: cachedData.totalCount,
      totalPages: cachedData.totalPages,
      pageSize: this.itemsPerPage,
    });

    console.log('[DASHBOARD] Dati da cache sincronizzata applicati con successo');
  }

  /**
   * PRE-CARICAMENTO SEQUENZIALE: Se in pagina 1 → pre-carica pagina 2, etc.
   * @param currentPage - Pagina corrente
   */
  private preloadNextPage(currentPage: number): void {
    const nextPage = currentPage + 1;
    const totalPages = this.totalPages();

    // Controlla se esiste la pagina successiva e non è già in cache o in pre-caricamento
    if (
      nextPage <= totalPages &&
      !this.getCachedPage(nextPage) &&
      !this.preloadingPages.has(nextPage)
    ) {
      console.log(`[DASHBOARD] Avvio pre-caricamento pagina ${nextPage}...`);
      this.isPreloading.set(true);
      this.preloadingPages.add(nextPage);

      this.veicleService.getListVeicle(nextPage, this.itemsPerPage).subscribe({
        next: (response) => {
          this.setCachedPage(nextPage, response.items);
          this.preloadingPages.delete(nextPage);
          this.isPreloading.set(false);
          console.log(
            `[DASHBOARD] Pre-caricamento pagina ${nextPage} completato (${response.items.length} veicoli)`
          );
        },
        error: (error) => {
          this.preloadingPages.delete(nextPage);
          this.isPreloading.set(false);
          console.error(`[DASHBOARD] Errore pre-caricamento pagina ${nextPage}:`, error);
        },
      });
    }
  }

  /**
   * ADATTAMENTO DINAMICO: Gestisce cambiamenti nel numero di pagine dal server
   * @param newTotalPages - Nuovo numero totale di pagine dal server
   */
  private adaptToDynamicPagination(newTotalPages: number): void {
    const oldTotalPages = this.totalPages();

    if (newTotalPages !== oldTotalPages) {
      console.log(
        `[DASHBOARD] Adattamento dinamico: Pagine cambiate da ${oldTotalPages} a ${newTotalPages}`
      );

      // Se il numero di pagine è diminuito e siamo oltre il limite, torna alla prima pagina
      if (this.currentPage() > newTotalPages) {
        console.log(
          `[DASHBOARD] Pagina corrente (${this.currentPage()}) oltre il limite, navigazione a pagina 1`
        );
        this.loadVeicles(1);
        return;
      }

      // Pulisci cache di pagine che non esistono più
      this.cleanupInvalidCachePages(newTotalPages);
    }
  }

  /**
   * PULIZIA CACHE: Rimuove pagine che non esistono più
   * @param maxValidPage - Ultimo numero di pagina valido
   */
  private cleanupInvalidCachePages(maxValidPage: number): void {
    const pagesToRemove: number[] = [];

    for (const page of this.pageCache.keys()) {
      if (page > maxValidPage) {
        pagesToRemove.push(page);
      }
    }

    if (pagesToRemove.length > 0) {
      pagesToRemove.forEach((page) => {
        this.pageCache.delete(page);
        this.cacheTimestamp.delete(page);
        this.preloadingPages.delete(page); // Interrompi pre-caricamenti non validi
      });
      console.log(
        `[DASHBOARD] Rimosse ${
          pagesToRemove.length
        } pagine non valide dalla cache: ${pagesToRemove.join(', ')}`
      );
    }
  }

  // campi da nascondere nella tabella
  private hiddenFields: (keyof Veicles)[] = ['id', 'createdAt', 'lastPosition']; // campi nascosti

  /**
   * Recupera le chiavi visibili del veicolo escludendo quelle nascoste
   * @param veicle - Il veicolo di cui ottenere le chiavi
   * @returns Array delle chiavi visibili
   */
  recoveryVeicleKeys(veicle: Veicles): (keyof Veicles)[] {
    let allKeys = Object.keys(veicle) as (keyof Veicles)[];
    let visibleKeys = allKeys.filter((key) => !this.hiddenFields.includes(key));
    return visibleKeys;
  }

  /**
   * Suddivide un array in chunk di dimensione specificata
   * @param arr - Array da suddividere
   * @param size - Dimensione di ogni chunk
   * @returns Array di chunk
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
   * @param data - Data da formattare (string o Date)
   * @returns Stringa formattata in italiano
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
   * @param veicle - Veicolo di cui mostrare i dettagli
   */
  goToMap(veicle: Veicles, event: Event) {
    if (!this.showModal()) {
      //serve per bloccare la propagazione
      event.stopPropagation();
    }
    this.selectedVeicle.set(veicle);
    this.showModal.set(true);
    this.titoloAlert = 'Vehicle Details';
    this.descrizioneAlert = `Detailed information for ${veicle.licensePlate}`;
    console.log('[DASHBOARD] Apertura modal dettagli veicolo:', veicle.licensePlate);
    let variab = localStorage.getItem(veicle.id.toString());
    this.messageStorage = variab ? JSON.parse(variab) : {};
    console.log(
      '[DASHBOARD] Dati MQTT recuperati dal localStorage per veicolo ID',
      veicle.id,
      ':',
      this.messageStorage
    );
  }

  // Metodi per la paginazione lato server con cache
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      console.log(`[DASHBOARD] Navigazione alla pagina: ${page}`);

      // Controlla se la pagina è già in cache
      const cachedData = this.getCachedPage(page);
      if (cachedData) {
        console.log(`[DASHBOARD] Caricamento istantaneo da cache per pagina ${page}`);
        this.applyCachedData(page, cachedData);
        this.preloadNextPage(page); // Pre-carica la successiva se necessario
      } else {
        // Carica dal server se non in cache
        this.loadVeicles(page);
      }
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

  /**
   * STATISTICHE CACHE per debugging e monitoraggio
   * @returns Informazioni sullo stato della cache
   */
  public getCacheStats(): {
    totalCached: number;
    validCached: number;
    preloadingCount: number;
    cacheHitRate: string;
  } {
    const now = Date.now();
    let validCached = 0;

    // Conta quante pagine in cache sono ancora valide
    for (const [page, timestamp] of this.cacheTimestamp.entries()) {
      if (now - timestamp < this.CACHE_DURATION) {
        validCached++;
      }
    }

    const totalCached = this.pageCache.size;
    const totalPages = this.totalPages();
    const hitRate = totalPages > 0 ? ((validCached / totalPages) * 100).toFixed(1) : '0';

    return {
      totalCached,
      validCached,
      preloadingCount: this.preloadingPages.size,
      cacheHitRate: `${hitRate}%`,
    };
  }

  /**
   * DEBUG: Metodo per ispezionare lo stato completo del sistema (da console)
   * Uso: Apri DevTools → Console → scrivi: window.dashboard.debugCacheSystem()
   */
  public debugCacheSystem(): void {
    const stats = this.getCacheStats();
    console.group('DASHBOARD CACHE SYSTEM DEBUG');
    console.log('Statistiche Generali:');
    console.table({
      'Pagina Corrente': this.currentPage(),
      'Totale Pagine': this.totalPages(),
      'Totale Veicoli': this.totalCount(),
      'Veicoli per Pagina': this.itemsPerPage,
    });

    console.log('Stato Cache:');
    console.table(stats);

    console.log('Pagine in Cache:');
    const cacheDetails: any = {};
    for (const [page, timestamp] of this.cacheTimestamp.entries()) {
      const now = Date.now();
      const ageMinutes = Math.floor((now - timestamp) / (1000 * 60));
      const isValid = now - timestamp < this.CACHE_DURATION;
      cacheDetails[`Pagina ${page}`] = {
        'Età (minuti)': ageMinutes,
        Valida: isValid ? 'SI' : 'NO',
        Veicoli: this.pageCache.get(page)?.length || 0,
      };
    }
    console.table(cacheDetails);

    if (this.preloadingPages.size > 0) {
      console.log('Pre-caricamenti in corso:', Array.from(this.preloadingPages));
    }

    console.groupEnd();
  }

  // Metodo per il filtraggio dei campi in base a targa o modello
  onFilterBy(value: IFilter) {
    console.log('[DASHBOARD] Ricevuto filtro:', value);

    this.value.set(value);

    if (value.isGlobalSearch && value.textFilter && value.textFilter.trim() !== '') {
      console.log('[DASHBOARD] Iniziando ricerca globale...');
      this.performGlobalSearch(value);
    } else if (!value.textFilter || value.textFilter.trim() === '') {
      console.log('[DASHBOARD] Filtro svuotato - tornando alla paginazione normale');
      this.resetToNormalPagination();
    }
  }

  // Esegue una ricerca globale su tutti i veicoli
  private performGlobalSearch(filterValue: IFilter): void {
    this.isGlobalSearchActive.set(true);
    this.isSearching.set(true);
    this.searchError.set(null);
    this.currentPage.set(1); // Reset alla prima pagina

    // Carica tutti i veicoli per la ricerca
    this.veicleService.getAllVeicles().subscribe({
      next: (response) => {
        console.log(
          '[DASHBOARD] Caricati tutti i veicoli per ricerca globale:',
          response.items.length
        );
        this.allVeicles.set(response.items);
        this.isSearching.set(false);

        // Aggiorna il conteggio dei risultati nel componente di filtro
        const filteredResults = this.filterList();
        this.updateFilterComponent(filteredResults.length);

        console.log('[DASHBOARD] Risultati ricerca globale:', filteredResults.length);
      },
      error: (error) => {
        console.error('[DASHBOARD] Errore durante la ricerca globale:', error);
        this.isSearching.set(false);
        this.isGlobalSearchActive.set(false);
        this.searchError.set('Error during search. Please try again.');
      },
    });
  }

  // Torna alla paginazione normale
  resetToNormalPagination(): void {
    this.isGlobalSearchActive.set(false);
    this.isSearching.set(false);
    this.searchError.set(null);
    this.allVeicles.set([]);
    this.updateFilterComponent(null);

    // Ricarica la pagina corrente
    setTimeout(() => {
      this.loadVeicles(this.currentPage());
    }, 300);
  }

  // Aggiorna il componente di filtro con il numero di risultati
  private updateFilterComponent(count: number | null): void {
    // Trova il componente SelectFilter e aggiorna i risultati
    // Questo sarà chiamato attraverso una ViewChild reference se necessario
    if (count !== null) {
      console.log('[DASHBOARD] Aggiornamento risultati filtro:', count);
    }
  }

  //  Metodo per aggiornare gli stati dei veicoli in tempo reale via MQTT
  private updateVehicleStatesFromMqtt(mqttPositions: any[]): void {
    const currentVehicles = this.veicleList();
    let updatedCount = 0;

    // Crea una nuova lista di veicoli con stati aggiornati
    const updatedVehicles = currentVehicles.map((vehicle) => {
      // Cerca i dati MQTT per questo veicolo
      const mqttData = mqttPositions.find((mqtt) => mqtt.vehicleId === vehicle.id);

      if (mqttData && mqttData.status && mqttData.status !== vehicle.status) {
        console.log(
          '[DASHBOARD] Aggiornamento stato live per veicolo:',
          vehicle.licensePlate,
          'da',
          vehicle.status,
          'a',
          mqttData.status
        );
        updatedCount++;

        // Restituisce il veicolo con lo stato aggiornato
        return {
          ...vehicle,
          status: mqttData.status,
          // Aggiorna anche la posizione se disponibile
          lastPosition:
            mqttData.timestamp && mqttData.latitude && mqttData.longitude
              ? {
                  ...vehicle.lastPosition,
                  latitude: mqttData.latitude,
                  longitude: mqttData.longitude,
                  speed: mqttData.speed || vehicle.lastPosition?.speed || 0,
                  heading: mqttData.heading || vehicle.lastPosition?.heading || 0,
                  timestamp: mqttData.timestamp,
                }
              : vehicle.lastPosition,
        };
      }

      return vehicle;
    });

    // Aggiorna la lista solo se ci sono stati cambiamenti
    if (updatedCount > 0) {
      console.log('[DASHBOARD] Aggiornati', updatedCount, 'stati di veicoli via MQTT');
      this.veicleList.set(updatedVehicles);

      // Se siamo in modalità ricerca globale, aggiorna anche quella lista
      if (this.isGlobalSearchActive()) {
        const updatedAllVehicles = this.allVeicles().map((vehicle) => {
          const mqttData = mqttPositions.find((mqtt) => mqtt.vehicleId === vehicle.id);
          if (mqttData && mqttData.status && mqttData.status !== vehicle.status) {
            return { ...vehicle, status: mqttData.status };
          }
          return vehicle;
        });
        this.allVeicles.set(updatedAllVehicles);
      }
    }
  }

  //metodo per la chiusura della modale fuori dalla modale
  onClickOutsideModal() {
    if (this.showModal()) {
      this.showModal.set(false);
      console.log('[DASHBOARD] Modal chiuso tramite click esterno');
    }
  }
}
