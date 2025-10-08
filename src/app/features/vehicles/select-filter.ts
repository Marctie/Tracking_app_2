import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { GeneralMap } from './general-map';

@Component({
  selector: 'app-select-filter',
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="filter-wrap">
      <div class="filter-controls">
        <div class="input-wrap">
          <input
            #textFilter
            [(ngModel)]="searchText"
            (input)="onSearchTextChange($event)"
            type="text"
            class="filter-input"
            placeholder="Digita per cercare..."
          />
          <button
            class="clear-btn"
            (click)="clearSearch()"
            aria-label="Clear"
            [style.opacity]="searchText() ? '1' : '0.5'"
          >
            ✕
          </button>
        </div>
        <div class="select-wrap">
          <select
            [(ngModel)]="valueOption"
            (change)="onFilterTypeChange()"
            class="filter-select"
            aria-label="Seleziona tipo filtro"
          >
            <option value="">Tutti i campi</option>
            <option value="licensePlate">Targa</option>
            <option value="model">Modello</option>
          </select>
        </div>
        <button class="btn" (click)="goMapGen()">Vai alla mappa completa dei veicoli</button>

        <!-- <div class="status-indicator" [class.searching]="isSearching()">
          <span *ngIf="!isSearching() && searchResults()">
            {{ searchResults() }} risultati trovati
          </span>
        </div> -->
      </div>
    </div>
  `,
  styles: `
    .filter-wrap {
      display: flex;
      flex-direction: column;
      gap: 15px;
      width: 100%;
      padding: 20px;
      background-color: #f8f9fa;
      border: 2px solid #007bff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .filter-controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .input-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .filter-input {
      width: 100%;
      padding: 12px 40px 12px 15px;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      font-size: 14px;
      color: #333;
      outline: none;
      transition: all 0.3s ease;
      font-family: Arial, sans-serif;
      box-sizing: border-box;
    }

    .filter-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .filter-input::placeholder { 
      color: #6c757d;
      font-style: italic;
    }

    .clear-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: #007bff;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .clear-btn:hover { 
      background: #0056b3; 
      transform: translateY(-50%) scale(1.05);
    }

    .select-wrap { 
      min-width: 150px; 
    }

    .filter-select {
      width: 100%;
      padding: 12px 15px;
      padding-right: 40px;
      border-radius: 8px;
      border: 2px solid #dee2e6;
      background: #fff;
      font-size: 14px;
      cursor: pointer;
      font-family: Arial, sans-serif;
      color: #333;
      outline: none;
      transition: all 0.3s ease;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23007bff' viewBox='0 0 16 16'%3E%3Cpath d='M8 11.5l-4-4h8l-4 4z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      box-sizing: border-box;
    }

    .filter-select:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .filter-select:hover {
      border-color: #007bff;
    }

    .status-indicator {
      color: #6c757d;
      font-size: 14px;
      padding: 8px 12px;
      border-radius: 6px;
      background-color: #f8f9fa;
      transition: all 0.3s ease;
      min-width: 150px;
      text-align: center;
    }

    .status-indicator.searching {
      background-color: #e3f2fd;
      color: #1976d2;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }

    .btn {
      padding: 12px 20px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s ease;
      align-self: flex-start;
    }

    .btn:hover {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    /* Responsiveness per dispositivi mobili */
    @media (max-width: 768px) {
      .filter-wrap {
        margin: 10px;
        padding: 15px;
        max-width: none;
      }
      
      .filter-controls { 
        flex-direction: column; 
        align-items: stretch; 
        gap: 15px;
      }
      
      .select-wrap { 
        width: 100%; 
        min-width: 0; 
      }

      .filter-input, .filter-select {
        font-size: 16px; /* Previene zoom su iOS */
      }
    }

    @media (max-width: 480px) {
      .filter-wrap {
        margin: 5px;
        padding: 12px;
      }

      .filter-input, .filter-select {
        padding: 10px 12px;
      }

      .filter-input {
        padding-right: 35px;
      }

      .clear-btn {
        width: 24px;
        height: 24px;
        font-size: 14px;
      }
    }
  `,
})
export class SelectFilter implements OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  router = inject(Router);

  // Signals per lo stato del componente
  valueOption = '';
  searchText = signal('');
  isSearching = signal(false);
  searchResults = signal<number | null>(null);

  // Output per comunicare con il componente padre
  filterParam = output<{ valueOption: string; textFilter: string; isGlobalSearch: boolean }>();

  constructor() {
    // Configurazione del debouncing per la ricerca
    this.searchSubject
      .pipe(
        debounceTime(300), // Attende 300ms dopo l'ultimo input
        distinctUntilChanged(), // Evita ricerche duplicate
        takeUntil(this.destroy$)
      )
      .subscribe((searchValue) => {
        this.performSearch(searchValue);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Metodo chiamato quando cambia il testo di ricerca
  onSearchTextChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.searchText.set(value);

    if (value.trim().length > 0) {
      this.isSearching.set(true);
      this.searchSubject.next(value.trim());
    } else {
      this.clearSearch();
    }
  }

  // Metodo chiamato quando cambia il tipo di filtro
  onFilterTypeChange(): void {
    const currentText = this.searchText();
    if (currentText.trim().length > 0) {
      this.performSearch(currentText);
    }
  }

  // Esegue la ricerca e notifica il componente padre
  private performSearch(searchValue: string): void {
    const upperSearchValue = searchValue.toUpperCase();

    console.log('[SELECT-FILTER] Ricerca globale:', {
      searchValue: upperSearchValue,
      filterType: this.valueOption || 'all',
    });

    this.filterParam.emit({
      valueOption: this.valueOption,
      textFilter: upperSearchValue,
      isGlobalSearch: true,
    });
  }

  // Pulisce la ricerca
  clearSearch(): void {
    this.searchText.set('');
    this.valueOption = '';
    this.isSearching.set(false);
    this.searchResults.set(null);

    this.filterParam.emit({
      valueOption: '',
      textFilter: '',
      isGlobalSearch: false,
    });

    console.log('[SELECT-FILTER] Ricerca cancellata');
  }

  // Aggiorna il numero di risultati (chiamato dal dashboard)
  updateSearchResults(count: number): void {
    this.searchResults.set(count);
    this.isSearching.set(false);
  }

  // Navigazione alla mappa generale
  goMapGen(): void {
    this.router.navigate(['/generalmap']);
  }
}

// Interfaccia aggiornata per includere il flag di ricerca globale
export interface IFilter {
  valueOption: string;
  textFilter: string;
  isGlobalSearch: boolean;
}
