import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { UserService } from './services/user-service';
import { MyMqttService } from './services/mymqtt-service';
import { IMqttMessage } from 'ngx-mqtt';
import { VeiclePosition } from './models/veicle-position';
import { VeicleService } from './services/veicle-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="home-root">
      <header class="home-header">
        <div class="brand">Tracking<span class="accent">App</span></div>
        <nav>
          @if((userService.currentUrl()=== this.router.url)){
          <button class="btn btn-outline" (click)="tologin()">Accedi</button>
          } @if(userService.isLoggedIn()&& this.router.url!== '/landing-page'){
          <button class="btn btn-outline" (click)="logout()">Logout</button>
          }
        </nav>
      </header>
      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class App implements OnInit {
  protected readonly title = signal('Tracking-app');
  router = inject(Router);
  userService = inject(UserService);
  mqttService = inject(MyMqttService);

  constructor() {}
  ngOnInit(): void {
    this.detectMqttMessage();
  }

  tologin() {
    console.log('stampa da app.ts ', this.router.url, this.userService.isLoggedIn());
    this.userService.verifyAuth();
    if (this.userService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
  logout() {
    this.userService.logout();
    if (confirm('Sei sicuro di voler effettuare il logout? Annullando rimarrai in sessione')) {
      localStorage.removeItem('tokenExp');
    }
  }

  detectMqttMessage(): void {
    const topic = 'vehicles/#';
    this.mqttService.topicSubscribe(topic).subscribe({
      next: (response: IMqttMessage) => {
        const message: VeiclePosition = JSON.parse(response.payload.toString());
        console.log('MQTT messaggio ricevuto:', message);

        // 1. Salva nel localStorage (come prima)
        const rawLista = localStorage.getItem('lista');
        let lista: VeiclePosition[] = rawLista ? JSON.parse(rawLista) : [];

        if (message.latitude && message.vehicleId) {
          // Rimuove la posizione precedente dello stesso veicolo
          lista = lista.filter((x) => x.vehicleId !== message.vehicleId);
          // Aggiunge la nuova posizione
          lista.push(message);
          // Salva nel localStorage per il singolo veicolo
          localStorage.setItem(message.vehicleId.toString(), JSON.stringify(message));

          console.log('Posizione salvata per veicolo:', message.vehicleId);
        }

        // 2. NUOVO: Aggiorna anche il signal del servizio MQTT per uso immediato
        this.updateMqttServiceSignal(lista);
      },
      error: (error) => {
        console.error(' Errore MQTT:', error);
      },
    });
  }

  /**
   * Aggiorna il signal del servizio MQTT con le nuove posizioni
   * Questo permette ai componenti di accedere ai dati MQTT in tempo reale
   */
  private updateMqttServiceSignal(lista: VeiclePosition[]): void {
    // Aggiorna il signal nel servizio con tutte le posizioni
    this.mqttService.positionVeiclesList.set([...lista]);
    console.log('Signal MQTT aggiornato con', lista.length, 'posizioni');
  }
}
