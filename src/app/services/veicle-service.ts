import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Veicles } from '../models/veicles';
import { BASEURL, VEICLEURL } from '../models/constants';
import { Observable } from 'rxjs';
import { IVeicleResponse } from '../models/veicle-response';

@Injectable({
  providedIn: 'root',
})
export class VeicleService {
  http = inject(HttpClient);

  constructor() {}

  getListVeicle(page: number = 1, pageSize: number = 10): Observable<IVeicleResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<IVeicleResponse>(VEICLEURL, { params });
  }

  // Metodo per recuperare tutti i veicoli senza paginazione per la ricerca globale
  getAllVeicles(): Observable<IVeicleResponse> {
    const params = new HttpParams().set('page', '1').set('pageSize', '10000'); // Numero molto alto per ottenere tutti i record

    return this.http.get<IVeicleResponse>(VEICLEURL, { params });
  }
}
