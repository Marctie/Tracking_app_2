import { Component, Input, Output, EventEmitter, inject, output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-veiclemodal',
  imports: [],
  template: `
    <div class="alert-container" (click)="onOverlayClick($event)">
      <h1 class="alert-title">{{titolo}}</h1>
      <p class="alert-text">{{testo}}</p>
      <button style="color:white" class="go-back-button blackbtn" (click)="exitModal()">
        Chiudi
      </button>
    </div>
  `,
  styles: `
 .modal-overlay {
 position: fixed;
 top: 0; left: 0; width: 100vw; height: 100vh;
 background: rgba(0,0,0,0.10);
 z-index: 99;
 display: flex;
 align-items: center;
justify-content: center;
}

.alert-container {
 position: absolute;
top: 24%;
 left: 50%;
 transform: translateX(-50%);
 background: var(--card-bg, #fff);
color: var(--text, #0f172a);
 padding: 2rem 2.5rem;
border-radius: 12px;
 box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
 z-index: 100;
 text-align: center;
 width: 35%;
 max-width: 80%;
 min-width: 30%;
 font-family: var(--font-family, Inter, 'Segoe UI', Roboto, Arial, sans-serif);
}

.alert-title {
 margin-top: 0;
 margin-bottom: 1rem;
 font-size: 1.5rem;
 color: var(--accent, #2563eb);
 font-weight: 600;
 letter-spacing: 0.01em;
}

.alert-text {
 margin-bottom: 1.5rem;
font-size: 1.07rem;
 line-height: 1.6;
 color: var(--muted, #6b7280);
 font-weight: 400;
}

.greenbtn {
 background: var(--accent, #2563eb);
 color: #fff;
 border: none;
 border-radius: 6px;
 padding: 0.6rem 1.2rem;
 font-size: 1rem;
 margin: 0 8px;
 cursor: pointer;
 box-shadow: 0 1px 3px rgba(0,0,0,0.06);
 transition: background 0.18s;
}

.greenbtn:hover {
 background: #1745a2;
}

.blackbtn {
 background: var(--text, #0f172a);
 color: #fff;
 border: none;
 border-radius: 6px;
 padding: 0.6rem 1.2rem;
 font-size: 1rem;
 margin: 0 8px;
 cursor: pointer;
 box-shadow: 0 1px 3px rgba(0,0,0,0.06);
 transition: background 0.18s;
}

.blackbtn:hover {
background: #12243a;
}

  `,
})
export class VeicleModal {
  @Input() titolo: string = '';
  @Input() testo: string = 'testo da mostrare ';
  hideModal = output<boolean>();
  router = inject(Router);

  exitModal() {
    this.hideModal.emit(false);
  }
  onOverlayClick(event: MouseEvent): void {
    this.hideModal.emit(false);
  }
}
