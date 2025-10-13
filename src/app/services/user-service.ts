import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ILogin } from '../models/login';
import { IAuthResponse } from '../models/auth-response';
import { LOGINURL, LOGOUTURL } from '../models/constants';
import { VeicleService } from './veicle-service';
import { Subject } from 'rxjs';

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
  veicleService = inject(VeicleService); // Servizio per pre-caricamento

  // Subject per comunicare fine caricamento al componente Login
  loginCompleted$ = new Subject<boolean>();

  constructor(private http: HttpClient) {}

  login(user: ILogin) {
    this.http.post<IAuthResponse>(LOGINURL, user).subscribe({
      next: (response) => {
        this.firstName.set(response.firstName);

        // Salva anche nel localStorage per persistenza
        localStorage.setItem('userFirstName', response.firstName);

        const myToken = response.token;
        const tokenExp = response.expiresAt;
        localStorage.setItem('token', myToken);
        localStorage.setItem('tokenExp', tokenExp.toString());

        // PRE-CARICAMENTO: Carica la prima pagina in background prima di navigare
        console.log('[LOGIN] Avvio pre-caricamento prima pagina dashboard...');
        this.preloadFirstPage().then(() => {
          // Naviga alla dashboard solo dopo aver pre-caricato i dati
          this.router.navigate(['/dashboard']);
          console.log('[LOGIN] Login completato con pre-caricamento!');

          // Notifica il componente che il processo è completato
          this.loginCompleted$.next(true);
        });

        console.log(response, 'risposta login');
        this.isLoggedIn.set(true);
      },
      error: (error) => {
        alert('credenziali errate riprova');
        console.log(error, 'errore');

        // Notifica il componente anche in caso di errore per nascondere il loader
        this.loginCompleted$.next(false);
      },
    });
  }

  logout() {
    this.http.post(LOGOUTURL, '').subscribe({
      next: (response) => {
        console.log('logout effettuato', response);

        // Pulisce i dati dell'utente dal localStorage
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExp');

        // Resetta i signal
        this.firstName.set('');
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

        // Recupera il nome utente dal localStorage se disponibile
        const storedFirstName = localStorage.getItem('userFirstName');
        if (storedFirstName) {
          this.firstName.set(storedFirstName);
        }

        console.log(
          'loggato: ',
          this.isLoggedIn(),
          ' maggiore: ',
          tokenExp.getTime() > new Date().getTime()
        );
      }
    }
  }

  /**
   * PRE-CARICAMENTO: Carica la prima pagina dei veicoli durante il login
   * Questo permette di avere i dati già pronti quando l'utente arriva alla dashboard
   */
  private preloadFirstPage(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[LOGIN] Pre-caricamento completo: dashboard + mappa...');

      // Eseguo entrambi i precaricamenti in parallelo per ottimizzare i tempi
      const dashboardPreload = this.preloadDashboardData();
      const mapPreload = this.preloadMapData();

      Promise.all([dashboardPreload, mapPreload])
        .then(() => {
          console.log('[LOGIN] Pre-caricamento completo terminato con successo');
          resolve();
        })
        .catch((error) => {
          console.warn('[LOGIN] Errore nel pre-caricamento (non bloccante):', error);
          // Non blocchiamo il login se il pre-caricamento fallisce
          resolve();
        });
    });
  }

  /**
   * Precarica i dati per la dashboard (prima pagina veicoli)
   */
  private preloadDashboardData(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[LOGIN] Pre-caricamento dashboard...');

      this.veicleService.getListVeicle(1, 10).subscribe({
        next: (response) => {
          // Salva i dati pre-caricati nel localStorage per il dashboard
          const preloadData = {
            page: response.page,
            items: response.items,
            totalCount: response.totalCount,
            totalPages: response.totalPages,
            timestamp: Date.now(),
          };

          localStorage.setItem('preloadedFirstPage', JSON.stringify(preloadData));
          console.log(`[LOGIN] Dashboard pre-caricata: ${response.items.length} veicoli`);
          resolve();
        },
        error: (error) => {
          console.warn('[LOGIN] Errore pre-caricamento dashboard:', error);
          resolve(); // Non bloccare il login
        },
      });
    });
  }

  /**
   * Precarica tutti i veicoli per la mappa generale
   */
  private preloadMapData(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[LOGIN] Pre-caricamento mappa generale...');

      this.veicleService.getAllVeicles().subscribe({
        next: (response) => {
          // Salva i dati completi per la mappa nel localStorage
          const mapPreloadData = {
            items: response.items,
            totalCount: response.totalCount,
            timestamp: Date.now(),
          };

          localStorage.setItem('preloadedMapData', JSON.stringify(mapPreloadData));
          console.log(`[LOGIN] Mappa pre-caricata: ${response.items.length} veicoli totali`);
          resolve();
        },
        error: (error) => {
          console.warn('[LOGIN] Errore pre-caricamento mappa:', error);
          resolve(); // Non bloccare il login
        },
      });
    });
  }
}
