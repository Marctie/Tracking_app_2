import { Injectable, signal } from '@angular/core';
import { Veicles } from '../models/veicles';
import { IVeicleResponse } from '../models/veicle-response';

export interface CachedDashboardData {
  page: number;
  items: Veicles[];
  totalCount: number;
  totalPages: number;
  timestamp: number;
}

export interface CachedMapData {
  items: Veicles[];
  totalCount: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class VehicleCacheService {
  // Cache timeout: 5 minuti
  private readonly CACHE_TIMEOUT = 5 * 60 * 1000;

  // Signals per lo stato della cache
  dashboardCacheValid = signal(false);
  mapCacheValid = signal(false);

  /**
   * Salva i dati della dashboard nella cache
   */
  saveDashboardData(data: IVeicleResponse): void {
    const cachedData: CachedDashboardData = {
      page: data.page,
      items: data.items,
      totalCount: data.totalCount,
      totalPages: data.totalPages,
      timestamp: Date.now(),
    };

    localStorage.setItem('dashboardCache', JSON.stringify(cachedData));
    this.dashboardCacheValid.set(true);
    console.log('[CACHE] Dashboard data salvata:', cachedData.items.length, 'veicoli');
  }

  /**
   * Recupera i dati della dashboard dalla cache se validi
   */
  getDashboardData(): CachedDashboardData | null {
    try {
      const cached = localStorage.getItem('dashboardCache');
      if (!cached) {
        this.dashboardCacheValid.set(false);
        return null;
      }

      const data: CachedDashboardData = JSON.parse(cached);
      const isValid = this.isCacheValid(data.timestamp);

      if (isValid) {
        this.dashboardCacheValid.set(true);
        console.log('[CACHE] Dashboard data recuperata dalla cache:', data.items.length, 'veicoli');
        return data;
      } else {
        this.clearDashboardCache();
        return null;
      }
    } catch (error) {
      console.warn('[CACHE] Errore nel recupero dashboard cache:', error);
      this.clearDashboardCache();
      return null;
    }
  }

  /**
   * Salva tutti i veicoli per la mappa nella cache
   */
  saveMapData(items: Veicles[]): void {
    const cachedData: CachedMapData = {
      items,
      totalCount: items.length,
      timestamp: Date.now(),
    };

    localStorage.setItem('mapCache', JSON.stringify(cachedData));
    this.mapCacheValid.set(true);
    console.log('[CACHE] Map data salvata:', cachedData.items.length, 'veicoli');
  }

  /**
   * Recupera i dati della mappa dalla cache se validi
   */
  getMapData(): CachedMapData | null {
    try {
      const cached = localStorage.getItem('mapCache');
      if (!cached) {
        this.mapCacheValid.set(false);
        return null;
      }

      const data: CachedMapData = JSON.parse(cached);
      const isValid = this.isCacheValid(data.timestamp);

      if (isValid) {
        this.mapCacheValid.set(true);
        console.log('[CACHE] Map data recuperata dalla cache:', data.items.length, 'veicoli');
        return data;
      } else {
        this.clearMapCache();
        return null;
      }
    } catch (error) {
      console.warn('[CACHE] Errore nel recupero map cache:', error);
      this.clearMapCache();
      return null;
    }
  }

  /**
   * Sincronizza i dati tra dashboard e mappa
   * Quando la mappa ha dati freschi, aggiorna anche la cache dashboard con la prima pagina
   */
  syncDashboardFromMap(allVehicles: Veicles[]): void {
    if (allVehicles.length === 0) return;

    // Prende i primi 10 veicoli per simulare la prima pagina dashboard
    const firstPageItems = allVehicles.slice(0, 10);
    const dashboardData: CachedDashboardData = {
      page: 1,
      items: firstPageItems,
      totalCount: allVehicles.length,
      totalPages: Math.ceil(allVehicles.length / 10),
      timestamp: Date.now(),
    };

    localStorage.setItem('dashboardCache', JSON.stringify(dashboardData));
    this.dashboardCacheValid.set(true);
    console.log('[CACHE] Dashboard sincronizzata da mappa:', firstPageItems.length, 'veicoli');
  }

  /**
   * Verifica se la cache è ancora valida
   */
  private isCacheValid(timestamp: number): boolean {
    const now = Date.now();
    return now - timestamp < this.CACHE_TIMEOUT;
  }

  /**
   * Pulisce la cache della dashboard
   */
  clearDashboardCache(): void {
    localStorage.removeItem('dashboardCache');
    this.dashboardCacheValid.set(false);
    console.log('[CACHE] Dashboard cache pulita');
  }

  /**
   * Pulisce la cache della mappa
   */
  clearMapCache(): void {
    localStorage.removeItem('mapCache');
    this.mapCacheValid.set(false);
    console.log('[CACHE] Map cache pulita');
  }

  /**
   * Pulisce tutta la cache
   */
  clearAllCache(): void {
    this.clearDashboardCache();
    this.clearMapCache();
    // Pulisce anche la cache legacy
    localStorage.removeItem('preloadedFirstPage');
    localStorage.removeItem('preloadedMapData');
    console.log('[CACHE] Tutta la cache pulita');
  }

  /**
   * Invalida la cache quando ci sono aggiornamenti MQTT
   */
  invalidateCache(): void {
    console.log('[CACHE] Cache invalidata per aggiornamenti MQTT');
    this.clearAllCache();
  }
}
