import { Component, inject, OnInit } from '@angular/core';
import { UserService } from '../services/user-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [],
  template: ` <div class="home-root">
    <main class="home-main">
      <section class="hero">
        <h1 class="hero-title">Track your vehicles in real time</h1>
        <p class="hero-sub">Simple dashboard, continuous updates and position history.</p>
        <div class="hero-actions">
          <!-- <button class="btn btn-primary">Start now</button>
          <a class="link-muted" href="#features">Learn more</a> -->
        </div>
      </section>
      <section id="features" class="features">
        <div class="card">
          <h3>Real-time position</h3>
          <p>See where your vehicles are with live updates.</p>
        </div>
        <div class="card">
          <h3>Movement history</h3>
          <p>Analyze routes and optimize paths.</p>
        </div>
        <div class="card">
          <h3>Notifications</h3>
          <p>Receive alerts for critical events or anomalies.</p>
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
