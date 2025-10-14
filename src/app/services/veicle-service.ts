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
   * Gets dynamic URL for vehicles from configuration
   */
  private getVehiclesUrl(): string {
    return this.configService.getApiUrl('vehicles');
  }

  getListVeicle(page: number = 1, pageSize: number = 10): Observable<IVeicleResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    // Use dynamic URL from configuration
    const url = this.getVehiclesUrl();
    console.log('[VEICLE-SERVICE] API call to:', url);

    return this.http.get<IVeicleResponse>(url, { params });
  }

  // Method to retrieve all vehicles without pagination for global search
  getAllVeicles(): Observable<IVeicleResponse> {
    const params = new HttpParams().set('page', '1').set('pageSize', '10000'); // Very high number to get all records

    // Use dynamic URL from configuration
    const url = this.getVehiclesUrl();
    console.log('[VEICLE-SERVICE] API call (all vehicles) to:', url);

    return this.http.get<IVeicleResponse>(url, { params });
  }
}
