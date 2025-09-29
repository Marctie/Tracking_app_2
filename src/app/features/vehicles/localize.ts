import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-localize',
  imports: [],
  template: `
    <div>
      <h1>sei qui per localizzare il veicolo !</h1>
      <button (click)="goBack()">torna indietro</button>
    </div>
  `,
  styles: ``,
})
export class Localize {
  router = inject(Router);

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
