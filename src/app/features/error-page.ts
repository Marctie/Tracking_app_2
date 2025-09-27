import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user-service';

@Component({
  selector: 'app-error-page',
  template: `
    <div class="home-root">
      <main class="home-main" role="main" aria-labelledby="pageTitle">
        <section class="hero" style="text-align: center; padding-top: 6rem;">
          <h1 id="pageTitle" class="hero-title" style="font-size: 3rem; margin-bottom: 0.5rem;">
            404
          </h1>
          <p class="hero-sub" style="font-size: 1.25rem; margin-bottom: 2rem;">
            La pagina che stai cercando non è stata trovata.
          </p>
          <button
            class="btn btn-primary btn-custom"
            (click)="goHome()"
            aria-label="Torni alla home"
          >
            Torna alla Home
          </button>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      /* Ulteriori stili personalizzati se necessari */
    `,
  ],
})
export class ErrorPage {
  userService= inject(UserService)
  constructor(private router: Router) {}

  goHome() {
   this.userService.isLoggedIn.set(false)

    this.router.navigate(['/landing-page']);
  }
}
