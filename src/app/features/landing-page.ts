import { Component, inject, OnInit } from '@angular/core';
import { UserService } from '../services/user-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [],
  template: ` <div class="home-root">
    <main class="home-main">
      <section class="hero">
        <h1 class="hero-title">Tieni traccia dei tuoi veicoli in tempo reale</h1>
        <p class="hero-sub">Dashboard semplice, aggiornamenti continui e storico posizioni.</p>
        <div class="hero-actions">
          <!-- <button class="btn btn-primary">Inizia ora</button>
          <a class="link-muted" href="#features">Scopri di più</a> -->
        </div>
      </section>
      <section id="features" class="features">
      <div class="card">
        <h3>Posizione in tempo reale</h3>
          <p>Visualizza dove sono i tuoi veicoli con aggiornamenti live.</p>
        </div>
        <div class="card">
          <h3>Storico movimenti</h3>
          <p>Analizza i percorsi e ottimizza le rotte.</p>
        </div>
        <div class="card">
          <h3>Notifiche</h3>
          <p>Ricevi alert per eventi critici o anomalie.</p>
        </div>
      </section>
    </main>

    <footer class="home-footer">
      <small>©TrackingApp</small>
    </footer>
  </div>`,
})
export class LandingPage implements OnInit {
  userService = inject(UserService);
  router = inject(Router);

  ngOnInit(): void {
    this.userService.currentUrl.set(this.router.url);
    console.log('stampa da landing page', this.userService.currentUrl.set(this.router.url));
  }
}
