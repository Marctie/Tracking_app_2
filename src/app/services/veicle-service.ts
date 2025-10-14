import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Veicles } from '../models/veicles';
import { Observable } from 'rxjs';
import { IVeicleResponse } from '../models/veicle-response';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class VeicleService {
  http = inject(HttpClient);
  private configService = inject(ConfigService);

  constructor() {}

  /**
   * Ottiene l'URL dinamico per i veicoli dalla configurazione
   */
  private getVehiclesUrl(): string {
    return this.configService.getApiUrl('vehicles');
  }

  getListVeicle(page: number = 1, pageSize: number = 10): Observable<IVeicleResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    // Usa URL dinamico dalla configurazione
    const url = this.getVehiclesUrl();
    console.log('[VEICLE-SERVICE] Chiamata API a:', url);

    return this.http.get<IVeicleResponse>(url, { params });
  }

  // Metodo per recuperare tutti i veicoli senza paginazione per la ricerca globale
  getAllVeicles(): Observable<IVeicleResponse> {
    const params = new HttpParams().set('page', '1').set('pageSize', '10000'); // Numero molto alto per ottenere tutti i record

    // Usa URL dinamico dalla configurazione
    const url = this.getVehiclesUrl();
    console.log('[VEICLE-SERVICE] Chiamata API (tutti i veicoli) a:', url);

    return this.http.get<IVeicleResponse>(url, { params });
  }
}
