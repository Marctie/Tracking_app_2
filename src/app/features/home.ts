import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  template: `
    <div class="home-container">
      <h1>You are in Home</h1>
      <button (click)="goToDashboard()">Go to Dashboard</button>
    </div>
  `,
  styles: [
    `
      .home-container {
        max-width: 600px;
        margin: 40px auto;
        padding: 30px;
        border: 2px solid #28a745;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        text-align: center;
        background-color: #e9f7ef;
      }
      h1 {
        color: #28a745;
        margin-bottom: 25px;
      }
      button {
        padding: 12px 25px;
        font-size: 16px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }
      button:hover {
        background-color: #1e7e34;
      }
    `,
  ],
})
export class Home {
  constructor(private router: Router) {}

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
