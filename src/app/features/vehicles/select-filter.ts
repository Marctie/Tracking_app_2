import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  EventEmitter,
  OnChanges,
  OnInit,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Mappatest } from './mappatest';

@Component({
  selector: 'app-select-filter',
  imports: [FormsModule, Mappatest],
  template: `
    <div class="filter-wrap">
      <p></p>
      <div class="filter-controls">
        <div class="input-wrap">
          <input
            #textFilter
            (input)="onFilterBy(textFilter.value)"
            type="text"
            class="filter-input"
            placeholder="Cerca..."
          />
          <button class="clear-btn" (click)="clearInput(textFilter)" aria-label="Clear">X</button>
        </div>
      </div>
      <br />
      <div class="select-wrap">
        <select [(ngModel)]="valueOption" class="filter-select" aria-label="Seleziona" >
          <option value=''>--Seleziona il filtro--</option>
          <option value="licensePlate">Targa</option>
          <option value="model">Modello</option>
        </select>
      </div>
      <button>vai alla mappa generale</button>
    </div>
  `,
  styles: `
    :host { 
      display: block; 
      font-family: Arial, sans-serif; 
      color: #333;
      margin: 20px 0;
    }

    .filter-wrap {
      display: flex;
      flex-direction: row;
      justify-content:center;
      gap: 15px;
      width: 100%;
      padding: 20px;
      background-color: #f8f9fa;
      border: 2px solid #007bff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .filter-wrap p {
      margin: 0;
      color: #007bff;
      font-weight: bold;
      font-size: 16px;
      text-align: center;
    }

    .filter-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .input-wrap {
      position: relative;
      flex: 1;
    }

    .filter-input {
      width: 100%;
      padding: 12px 40px 12px 15px;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      font-size: 14px;
      color: #333;
      outline: none;
      transition: all 0.3s ease;
      font-family: Arial, sans-serif;
      box-sizing: border-box;
    }

    .filter-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .filter-input::placeholder { 
      color: #6c757d;
      font-style: italic;
    }

    .clear-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: #007bff;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .clear-btn:hover { 
      background: #0056b3; 
      transform: translateY(-50%) scale(1.05);
    }

    .select-wrap { 
      min-width: 200px; 
    }

    .filter-select {
      width: 100%;
      padding: 12px 15px;
      padding-right: 40px;
      border-radius: 8px;
      border: 2px solid #dee2e6;
      background: #fff;
      font-size: 14px;
      cursor: pointer;
      font-family: Arial, sans-serif;
      color: #333;
      outline: none;
      transition: all 0.3s ease;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23007bff' viewBox='0 0 16 16'%3E%3Cpath d='M8 11.5l-4-4h8l-4 4z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      box-sizing: border-box;
    }

    .filter-select:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .filter-select:hover {
      border-color: #007bff;
    }

    /* Responsiveness per dispositivi mobili */
    @media (max-width: 768px) {
      .filter-wrap {
        margin: 10px;
        padding: 15px;
        max-width: none;
      }
      
      .filter-controls { 
        flex-direction: column; 
        align-items: stretch; 
        gap: 15px;
      }
      
      .select-wrap { 
        width: 100%; 
        min-width: 0; 
      }

      .filter-input, .filter-select {
        font-size: 16px; /* Previene zoom su iOS */
      }
    }

    @media (max-width: 480px) {
      .filter-wrap {
        margin: 5px;
        padding: 12px;
      }

      .filter-input, .filter-select {
        padding: 10px 12px;
      }

      .filter-input {
        padding-right: 35px;
      }

      .clear-btn {
        width: 24px;
        height: 24px;
        font-size: 14px;
      }
    }
  `,
})
export class SelectFilter {
  valueOption = '';
  //Output per far salire i dati in dashboard, tipizzando i 2 valori di filtraggio
  filterParam = output<{ valueOption: string; textFilter: string }>();
  //metodo per emettere i dati da questo componente al componente padre
  onFilterBy(inputValue: string): void {
    const inputValueUp = inputValue.toUpperCase();
    const valueOptionUp = this.valueOption;
    //condizione per far emettere solo se viene selezionato il tipo
    if (valueOptionUp) {
      this.filterParam.emit({
        valueOption: valueOptionUp,
        textFilter: inputValueUp,
      });
    }
  }

  //metodo per pulire il campo di input
  clearInput(inputElement: HTMLInputElement): void {
    inputElement.value = '';
    this.valueOption = '';
    this.filterParam.emit({
      valueOption: '',
      textFilter: '',
    });
  }
}

export interface IFilter {
  valueOption: string;
  textFilter: string;
}
