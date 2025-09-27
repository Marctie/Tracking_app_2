import { HttpClient } from '@angular/common/http';
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

  getListVeicle(): Observable<IVeicleResponse> {
    return this.http.get<IVeicleResponse>(VEICLEURL)
  }

}
