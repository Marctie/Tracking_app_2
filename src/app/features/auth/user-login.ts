import { Component, inject, input, OnInit, output, signal, OnDestroy } from '@angular/core';
import {
  EmailValidator,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user-service';
import { ILogin } from '../../models/login';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-root">
      <!-- Overlay di caricamento elegante -->
      @if (isLoading()) {
      <div class="loading-overlay">
        <div class="loading-container">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <div class="loading-text">
            <h3>Accesso in corso...</h3>
            <p>Preparazione dashboard e pre-caricamento dati</p>
            <div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>
          </div>
        </div>
      </div>
      }

      <div class="login-panel" role="form" aria-labelledby="login-title">
        <h2 id="login-title">Accedi</h2>
        <form [formGroup]="loginform" (ngSubmit)="onSubmit()" class="login-form">
          <label class="visually-hidden" for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            placeholder="Email"
            [disabled]="isLoading()"
          />
          <label class="visually-hidden" for="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Password"
            formControlName="password"
            [disabled]="isLoading()"
          />
          <div class="actions">
            <button
              type="submit"
              class="btn btn-outline btn-custom"
              [disabled]="!loginform.valid || isLoading()"
            >
              @if (isLoading()) {
              <span class="btn-loading">⟳</span>
              } @else { Accedi }
            </button>
            <button
              type="button"
              class="btn btn-outline"
              (click)="goBack()"
              [disabled]="isLoading()"
            >
              Indietro
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    /* OVERLAY DI CARICAMENTO ELEGANTE */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(0, 123, 255, 0.9), rgba(40, 167, 69, 0.9));
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(10px);
      animation: fadeIn 0.3s ease-in-out;
    }

    .loading-container {
      text-align: center;
      color: white;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 40px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 90%;
    }

    /* SPINNER TRIPLO ELEGANTE */
    .loading-spinner {
      margin-bottom: 20px;
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 30px;
    }

    .spinner-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 3px solid transparent;
      border-top: 3px solid #ffffff;
      border-radius: 50%;
      animation: spin 1.5s linear infinite;
    }

    .spinner-ring:nth-child(1) {
      animation-delay: 0s;
      width: 80px;
      height: 80px;
    }

    .spinner-ring:nth-child(2) {
      animation-delay: 0.5s;
      width: 60px;
      height: 60px;
      top: 10px;
      left: 10px;
      border-top-color: #ffc107;
    }

    .spinner-ring:nth-child(3) {
      animation-delay: 1s;
      width: 40px;
      height: 40px;
      top: 20px;
      left: 20px;
      border-top-color: #28a745;
    }

    /* TESTO DI CARICAMENTO */
    .loading-text h3 {
      margin: 0 0 10px 0;
      font-size: 24px;
      font-weight: 600;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .loading-text p {
      margin: 0 0 15px 0;
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.4;
    }

    /* PUNTINI ANIMATI */
    .loading-dots {
      display: inline-block;
    }

    .loading-dots span {
      display: inline-block;
      animation: bounce 1.4s infinite ease-in-out both;
      font-size: 20px;
      font-weight: bold;
    }

    .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
    .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
    .loading-dots span:nth-child(3) { animation-delay: 0s; }

    /* BOTTONE CARICAMENTO */
    .btn-loading {
      display: inline-block;
      animation: rotate 1s linear infinite;
      font-size: 16px;
    }

    /* ANIMAZIONI */
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes bounce {
      0%, 80%, 100% { 
        transform: scale(0);
      } 40% { 
        transform: scale(1);
      }
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .loading-container {
        padding: 30px 20px;
        margin: 20px;
      }

      .loading-text h3 {
        font-size: 20px;
      }

      .loading-spinner {
        width: 60px;
        height: 60px;
      }

      .spinner-ring:nth-child(1) {
        width: 60px;
        height: 60px;
      }

      .spinner-ring:nth-child(2) {
        width: 45px;
        height: 45px;
        top: 7.5px;
        left: 7.5px;
      }

      .spinner-ring:nth-child(3) {
        width: 30px;
        height: 30px;
        top: 15px;
        left: 15px;
      }
    }

    /* STATI DISABILITATI */
    input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
export class Login implements OnInit, OnDestroy {
  router = inject(Router);
  loginform: FormGroup = new FormGroup({});
  userService = inject(UserService);

  // Signal per gestire lo stato di caricamento
  isLoading = signal(false);

  // Subscription per ascoltare il completamento del login
  private loginSubscription?: Subscription;

  ngOnInit(): void {
    // Se esiste già un token, vai direttamente alla dashboard

    if (!this.userService.isLoggedIn()) {
      this.loginform = new FormGroup({
        email: new FormControl('', Validators.required),
        password: new FormControl('', Validators.required),
      });
    } else {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Ascolta il completamento del login per nascondere il loader
    this.loginSubscription = this.userService.loginCompleted$.subscribe({
      next: (success) => {
        this.isLoading.set(false);
        if (success) {
          console.log('[LOGIN] Caricamento completato con successo');
        } else {
          console.log('[LOGIN] Login fallito, loader nascosto');
        }
      },
    });
  }

  ngOnDestroy(): void {
    // Cleanup della subscription
    if (this.loginSubscription) {
      this.loginSubscription.unsubscribe();
    }
  }

  onSubmit() {
    if (this.isLoading()) return; // Previene doppi click

    // Attiva lo stato di caricamento
    this.isLoading.set(true);
    console.log('[LOGIN] Avvio procedura di login con caricamento...');

    const user: ILogin = this.loginform.value;
    this.userService.login(user);
    console.log(user);
  }

  goBack() {
    this.router.navigate(['/landing-page']);
  }
}
