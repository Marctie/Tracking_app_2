import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ILogin } from '../models/login';
import { IAuthResponse } from '../models/auth-response';
import { LOGINURL, LOGOUTURL } from '../models/constants';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  userLogin = signal<ILogin>({} as ILogin);
  currentUrl = signal<string>('/landing-page');

  // Stato reattivo: utente loggato? (default: false)
  isLoggedIn = signal(false);
  router = inject(Router);
  firstName = signal<string>('');
  constructor(private http: HttpClient) {}

  login(user: ILogin) {
    this.http.post<IAuthResponse>(LOGINURL, user).subscribe({
      next: (response) => {
        this.firstName.set(response.firstName);
        const myToken = response.token;
        const tokenExp = response.expiresAt;
        localStorage.setItem('token', myToken);
        localStorage.setItem('tokenExp', tokenExp.toString());
        this.router.navigate(['/dashboard']);
        console.log(response, myToken, 'risposta login');
        this.isLoggedIn.set(true);
      },
      error: (error) => {
        alert('credenziali errate riprova');
        console.log(error, 'errore');
      },
    });
  }

  logout() {
    this.http.post(LOGOUTURL, '').subscribe({
      next: (response) => {
        console.log('logout effettuato', response);
        this.isLoggedIn.set(false);
        this.router.navigate(['/landing-page']);
      },
      error: (error) => {
        alert('impossibile fare il logout');
        console.log(error, 'errore');
      },
    });
  }
  verifyAuth() {
    const tokenExp = new Date(localStorage.getItem('tokenExp') ?? new Date());
    if (tokenExp) {
      if (tokenExp.getTime() > new Date().getTime()) {
        this.isLoggedIn.set(true);
        console.log(
          'loggato: ',      
          this.isLoggedIn(),' maggiore: ',
          tokenExp.getTime()>
          new Date().getTime()
        );
      }
    }
  }
}
