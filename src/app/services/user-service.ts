import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ILogin } from '../models/login';
import { IAuthResponse } from '../models/auth-response';
import { VeicleService } from './veicle-service';
import { Subject } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  userLogin = signal<ILogin>({} as ILogin);
  currentUrl = signal<string>('/landing-page');

  // Reactive state: user logged in? (default: false)
  isLoggedIn = signal(false);
  router = inject(Router);
  firstName = signal<string>('');
  veicleService = inject(VeicleService); // Service for pre-loading
  private configService = inject(ConfigService);

  // Subject to communicate end of loading to Login component
  loginCompleted$ = new Subject<boolean>();

  constructor(private http: HttpClient) {}

  /**
   * Gets dynamic URL for login from configuration
   */
  private getLoginUrl(): string {
    return this.configService.getApiUrl('auth') + '/login';
  }

  /**
   * Gets dynamic URL for logout from configuration
   */
  private getLogoutUrl(): string {
    return this.configService.getApiUrl('auth') + '/logout';
  }

  login(user: ILogin) {
    const loginUrl = this.getLoginUrl();
    console.log('[USER-SERVICE] Login URL:', loginUrl);

    this.http.post<IAuthResponse>(loginUrl, user).subscribe({
      next: (response) => {
        this.firstName.set(response.firstName);

        // Also save to localStorage for persistence
        localStorage.setItem('userFirstName', response.firstName);

        const myToken = response.token;
        const tokenExp = response.expiresAt;
        localStorage.setItem('token', myToken);
        localStorage.setItem('tokenExp', tokenExp.toString());

        // PRE-LOADING: Load first page in background before navigating
        console.log('[LOGIN] Starting dashboard first page pre-loading...');
        this.preloadFirstPage().then(() => {
          // Navigate to dashboard only after pre-loading data
          this.router.navigate(['/dashboard']);
          console.log('[LOGIN] Login completed with pre-loading!');

          // Notify component that process is completed
          this.loginCompleted$.next(true);
        });

        console.log(response, 'login response');
        this.isLoggedIn.set(true);
      },
      error: (error) => {
        alert('Invalid credentials, please try again');
        console.log(error, 'errore');

        // Notify component also in case of error to hide loader
        this.loginCompleted$.next(false);
      },
    });
  }

  logout() {
    const logoutUrl = this.getLogoutUrl();
    console.log('[USER-SERVICE] Logout URL:', logoutUrl);

    this.http.post(logoutUrl, '').subscribe({
      next: (response) => {
        console.log('Logout successful', response);

        // Clean user data from localStorage
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExp');

        // Reset signals
        this.firstName.set('');
        this.isLoggedIn.set(false);
        this.router.navigate(['/landing-page']);
      },
      error: (error) => {
        alert('Unable to logout');
        console.log(error, 'errore');
      },
    });
  }
  verifyAuth() {
    const tokenExp = new Date(localStorage.getItem('tokenExp') ?? new Date());
    if (tokenExp) {
      if (tokenExp.getTime() > new Date().getTime()) {
        this.isLoggedIn.set(true);

        // Recover username from localStorage if available
        const storedFirstName = localStorage.getItem('userFirstName');
        if (storedFirstName) {
          this.firstName.set(storedFirstName);
        }

        console.log(
          'logged in: ',
          this.isLoggedIn(),
          ' greater: ',
          tokenExp.getTime() > new Date().getTime()
        );
      }
    }
  }

  /**
   * PRE-LOADING: Loads first page of vehicles during login
   * This allows having data ready when user arrives at dashboard
   */
  private preloadFirstPage(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[LOGIN] Complete pre-loading: dashboard + map...');

      // Perform both preloads in parallel to optimize timing
      const dashboardPreload = this.preloadDashboardData();
      const mapPreload = this.preloadMapData();

      Promise.all([dashboardPreload, mapPreload])
        .then(() => {
          console.log('[LOGIN] Complete pre-loading finished successfully');
          resolve();
        })
        .catch((error) => {
          console.warn('[LOGIN] Error in pre-loading (non-blocking):', error);
          // Don't block login if pre-loading fails
          resolve();
        });
    });
  }

  /**
   * Preloads data for dashboard (first page of vehicles)
   */
  private preloadDashboardData(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[LOGIN] Dashboard pre-loading...');

      this.veicleService.getListVeicle(1, 10).subscribe({
        next: (response) => {
          // Save pre-loaded data to localStorage for dashboard
          const preloadData = {
            page: response.page,
            items: response.items,
            totalCount: response.totalCount,
            totalPages: response.totalPages,
            timestamp: Date.now(),
          };

          localStorage.setItem('preloadedFirstPage', JSON.stringify(preloadData));
          console.log(`[LOGIN] Dashboard pre-loaded: ${response.items.length} vehicles`);
          resolve();
        },
        error: (error) => {
          console.warn('[LOGIN] Dashboard pre-loading error:', error);
          resolve(); // Don't block login
        },
      });
    });
  }

  /**
   * Preloads all vehicles for general map
   */
  private preloadMapData(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[LOGIN] General map pre-loading...');

      this.veicleService.getAllVeicles().subscribe({
        next: (response) => {
          // Save complete data for map to localStorage
          const mapPreloadData = {
            items: response.items,
            totalCount: response.totalCount,
            timestamp: Date.now(),
          };

          localStorage.setItem('preloadedMapData', JSON.stringify(mapPreloadData));
          console.log(`[LOGIN] Map pre-loaded: ${response.items.length} total vehicles`);
          resolve();
        },
        error: (error) => {
          console.warn('[LOGIN] Map pre-loading error:', error);
          resolve(); // Don't block login
        },
      });
    });
  }
}
