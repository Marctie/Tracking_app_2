import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { GeneralMap } from './general-map';
import { VeicleService } from '../../services/veicle-service';
import { MyMqttService } from '../../services/mymqtt-service';

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
            placeholder="Type to search..."
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
            aria-label="Select filter type"
          >
            <option value="">All fields</option>
            <option value="licensePlate">License Plate</option>
            <option value="model">Model</option>
          </select>
        </div>
        <button class="btn" (click)="goMapGen()" [disabled]="isMapLoading()">
          @if (isMapLoading()) {
          <span class="btn-loading">⟳</span> Preparing map... } @else { Go to complete vehicle map }
        </button>

        <!-- <div class="status-indicator" [class.searching]="isSearching()">
          <span *ngIf="!isSearching() && searchResults()">
            {{ searchResults() }} results found
          </span>
        </div> -->
      </div>
    </div>
  `,
  styles: `
    .filter-wrap {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      padding: 24px;
      background-color: #f8f9fa;
      border: 2px solid #007bff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .filter-controls {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .input-wrap {
      position: relative;
      flex: 1;
      min-width: 220px;
    }

    .filter-input {
      width: 100%;
      padding: 14px 44px 14px 18px;
      border: 2px solid #dee2e6;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      font-size: clamp(0.875rem, 2.5vw, 1rem);
      color: #333;
      outline: none;
      transition: all 0.3s ease;
      font-family: 'Inter', 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 400;
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
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: #007bff;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 8px;
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
      min-width: 170px; 
    }

    .filter-select {
      width: 100%;
      padding: 14px 18px;
      padding-right: 44px;
      border-radius: 10px;
      border: 2px solid #dee2e6;
      background: #fff;
      font-size: clamp(0.875rem, 2.5vw, 1rem);
      cursor: pointer;
      font-family: 'Inter', 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 400;
      color: #333;
      outline: none;
      transition: all 0.3s ease;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23007bff' viewBox='0 0 16 16'%3E%3Cpath d='M8 11.5l-4-4h8l-4 4z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
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
      font-size: clamp(0.875rem, 2vw, 1rem);
      font-weight: 500;
      padding: 12px 16px;
      border-radius: 8px;
      background-color: #f8f9fa;
      transition: all 0.3s ease;
      min-width: 170px;
      text-align: center;
      font-family: inherit;
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
      padding: 14px 24px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: clamp(0.875rem, 2.5vw, 1rem);
      font-weight: 600;
      transition: all 0.3s ease;
      align-self: flex-start;
      font-family: inherit;
    }

    .btn:hover {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
      opacity: 0.6;
    }

    /* Stile per il caricamento nel bottone */
    .btn-loading {
      display: inline-block;
      animation: spin 1s linear infinite;
      margin-right: 5px;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Responsiveness per dispositivi mobili */
    @media (max-width: 768px) {
      .filter-wrap {
        width: calc(100% - 24px);
        max-width: calc(100% - 24px);
        margin: 12px auto;
        padding: 20px;
      }
      
      .filter-controls { 
        flex-direction: column; 
        align-items: stretch; 
        gap: 20px;
      }
      
      .select-wrap { 
        width: 100%; 
        min-width: 0; 
      }

      .filter-input, .filter-select {
        font-size: clamp(1rem, 3vw, 1.125rem); /* Previene zoom su iOS */
        padding: 16px 18px;
      }

      .filter-input {
        padding-right: 48px;
      }

      .btn {
        padding: 16px 24px;
        width: 100%;
        font-size: clamp(1rem, 3vw, 1.125rem);
      }
    }

    @media (max-width: 480px) {
      .filter-wrap {
        width: calc(100% - 16px);
        max-width: calc(100% - 16px);
        margin: 8px auto;
        padding: 16px;
      }

      .filter-input, .filter-select {
        padding: 14px 16px;
        font-size: clamp(0.9375rem, 2.8vw, 1rem);
      }

      .filter-input {
        padding-right: 44px;
      }

      .clear-btn {
        width: 28px;
        height: 28px;
        font-size: clamp(0.875rem, 2.5vw, 1rem);
        right: 8px;
      }
    }
  `,
})
export class SelectFilter implements OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  // Signal to manage loading state
  isMapLoading = signal(false); // Loading state for navigation to map

  router = inject(Router);
  veicleService = inject(VeicleService);
  mqttService = inject(MyMqttService);

  // Cache for preloading
  private isPreloading = false;
  private preloadTimestamp: number | null = null;

  // Signals for component state
  valueOption = '';
  searchText = signal('');
  isSearching = signal(false);
  searchResults = signal<number | null>(null);

  // Output to communicate with parent component
  filterParam = output<{ valueOption: string; textFilter: string; isGlobalSearch: boolean }>();

  constructor() {
    // Debouncing configuration for search
    this.searchSubject
      .pipe(
        debounceTime(300), // Wait 300ms after last input
        distinctUntilChanged(), // Avoid duplicate searches
        takeUntil(this.destroy$)
      )
      .subscribe((searchValue) => {
        this.performSearch(searchValue);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Reset loading state for safety
    this.isMapLoading.set(false);
    // Preload cache cleanup
    this.isPreloading = false;
    this.preloadTimestamp = null;
  }

  // Method called when search text changes
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

  // Method called when filter type changes
  onFilterTypeChange(): void {
    const currentText = this.searchText();
    if (currentText.trim().length > 0) {
      this.performSearch(currentText);
    }
  }

  // Executes search and notifies parent component
  private performSearch(searchValue: string): void {
    const upperSearchValue = searchValue.toUpperCase();

    console.log('[SELECT-FILTER] Global search:', {
      searchValue: upperSearchValue,
      filterType: this.valueOption || 'all',
    });

    this.filterParam.emit({
      valueOption: this.valueOption,
      textFilter: upperSearchValue,
      isGlobalSearch: true,
    });
  }

  // Clears search
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

    console.log('[SELECT-FILTER] Search cleared');
  }

  // Updates number of results (called by dashboard)
  updateSearchResults(count: number): void {
    this.searchResults.set(count);
    this.isSearching.set(false);
  }

  // Navigation to general map
  goMapGen(): void {
    console.log('Navigation to general map - Starting preload');

    // Avoid multiple clicks
    if (this.isMapLoading()) {
      console.log('Preload already in progress...');
      return;
    }

    this.isMapLoading.set(true);

    // Start data preload during timeout
    this.preloadMapData()
      .then(() => {
        console.log('Preload completed - Navigation to map');
        this.router.navigate(['/generalmap']);
        // Loading will reset automatically on route change
      })
      .catch((error) => {
        console.warn('Error in preload, but proceeding anyway:', error);
        // Even in case of error, navigate anyway after minimum timeout
        setTimeout(() => {
          this.router.navigate(['/generalmap']);
        }, 500);
      });
  }

  /**
   * Preloads data necessary for the general map
   */
  private async preloadMapData(): Promise<void> {
    // Avoids duplicate recent preloads (30 second cache)
    const now = Date.now();
    if (this.isPreloading || (this.preloadTimestamp && now - this.preloadTimestamp < 30000)) {
      console.log('[PRELOAD] Using recent preload cache');
      await new Promise((resolve) => setTimeout(resolve, 500)); // Minimum delay for UX
      return;
    }

    try {
      this.isPreloading = true;
      console.log('[PRELOAD] Starting map data preload...');

      // Preload all vehicles from server
      const vehiclesPromise = this.veicleService.getAllVeicles().toPromise();

      // Wait a minimum of 500ms to give visual feedback to the user
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 500));

      // Execute both operations in parallel
      const [vehiclesResponse] = await Promise.all([vehiclesPromise, minDelayPromise]);

      if (vehiclesResponse && vehiclesResponse.items) {
        console.log(`[PRELOAD] Preloaded ${vehiclesResponse.items.length} vehicles`);
        this.preloadTimestamp = now;

        // Data is now in Angular HTTP cache and will be available
        // immediately when the general map requests it
      }
    } catch (error) {
      console.error('[PRELOAD] Error during preload:', error);
      throw error;
    } finally {
      this.isPreloading = false;
    }
  }
}

// Updated interface to include global search flag
export interface IFilter {
  valueOption: string;
  textFilter: string;
  isGlobalSearch: boolean;
}
