import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-localize',
  imports: [],
  template: `
    <div>
      <h1>You are here to locate the vehicle!</h1>
      <button (click)="goBack()">Go back</button>
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
