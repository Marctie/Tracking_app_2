import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VeicleService } from '../services/veicle-service';
import { Veicles } from '../models/veicles';
import { timeout } from 'rxjs';
import { UserService } from '../services/user-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h1>Benvenuto sig.{{ this.userLogin.firstName() }}</h1>
      <!-- <div class="buttons">
        <button (click)="onClick()">Dashboard 1</button>
        <button (click)="onClick()">Dashboard 2</button>
      </div> -->
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
            <ng-container *ngFor="let item of veicleList()">
              <ng-container *ngFor="let chunk of chunkKeys(recoveryVeicleKeys(item), 7)">
                <tr>
                  <td *ngFor="let key of chunk">
                    <ng-container *ngIf="key === 'createdAt'; else normalCell">
                      {{ formatDataIt(item[key]) }}
                    </ng-container>
                    <ng-template #normalCell>{{ item[key] }}</ng-template>
                  </td>
                  <td class="center">
                    <button>Localizza</button>
                  </td>
                </tr>
              </ng-container>
            </ng-container>
          </tbody>
        </table>
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
  `,
})
export class Dashboard implements OnInit {
  userLogin = inject(UserService);
  veicleService = inject(VeicleService);
  veicleList = signal<Veicles[]>([]);
    router = inject(Router);


  ngOnInit() {
    this.loadVeicles();
    console.log(this.veicleList());
    this.userLogin.login.name;  
  }

  loadVeicles(): void {
    this.veicleService.getListVeicle().subscribe((response) => {
      this.veicleList.set(response.items);
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
      minute: '2-digit'
    });
  }
}
