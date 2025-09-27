import { Component, inject, input, OnInit, output, signal } from '@angular/core';
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

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-root">
      <div class="login-panel" role="form" aria-labelledby="login-title">
        <h2 id="login-title">Accedi</h2>
        <form [formGroup]="loginform" (ngSubmit)="onSubmit()" class="login-form">
          <label class="visually-hidden" for="email">Email</label>
          <input id="email" type="email" formControlName="email" placeholder="Email" />
          <label class="visually-hidden" for="password">Password</label>
          <input id="password" type="password" placeholder="Password" formControlName="password" />
          <div class="actions">
            <button type="submit" class="btn btn-outline btn-custom" [disabled]="!loginform.valid">
              Accedi
            </button>
            <button type="button" class="btn btn-outline" (click)="goBack()">Indietro</button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class Login implements OnInit {
  router = inject(Router);
  loginform: FormGroup = new FormGroup({});
  userService = inject(UserService);
  
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
  }

  onSubmit() {
    const user: ILogin = this.loginform.value;
    this.userService.login(user);
    console.log(user);
  }

  goBack() {
    this.router.navigate(['/landing-page']);
  }
}
