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
        console.log('mqtt->', message);
        // const list: VeiclePosition[] = this.mqttService.positionVeiclesList();
        // let lista: VeiclePosition[] = [];
        // if (list && list.length > 0) {
        //   lista = list.filter((p) => p.id !== message.id);
        // }
        // lista.push(message);
        //  if ((this.mqttService.positionVeiclesList() as any)) {
        //    (this.mqttService.positionVeiclesList() as any).set(lista);
        //  }
        // console.log('console', lista, message);
        const rawLista = localStorage.getItem('lista');
        let lista: VeiclePosition[] = rawLista ? JSON.parse(rawLista) : [];

        if (message.latitude && message.vehicleId) {
          console.log('lista1', lista);
          lista = lista.filter((x) => x.vehicleId !== message.vehicleId);
          console.log('lista2', lista);
          lista.push(message);
          localStorage.setItem(message.vehicleId.toString()!, JSON.stringify(message));
        }
        console.log('errore in mqtt', response, message.vehicleId, lista);
      },
    });
  }
}
