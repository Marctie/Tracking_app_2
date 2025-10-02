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

@Component({
  selector: 'app-select-filter',
  imports: [FormsModule],
  template: `
    <div class="filter-wrap">
      <p></p>
      <div class="filter-controls">
        <div class="input-wrap">
          <input
            #textFilter
            (keypress)="onFilterBy(textFilter.value)"
            type="text"
            class="filter-input"
            placeholder="Cerca..."
          />
          <button class="clear-btn" aria-label="Clear">×</button>
        </div>
      </div>
      <br />
      <div class="select-wrap">
        <select [(ngModel)]="valueOption" class="filter-select" aria-label="Seleziona">
          <option>--Seleziona il filtro--</option>
          <option value="licensePlate">Targa</option>
          <option value="model">Modello</option>
        </select>
      </div>
    </div>
  `,
  styles: `
    :host { display:block; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#222; }

    .filter-wrap {
      display:flex;
      flex-direction:column;
      max-width:420px;
      width:100%;
    }

    .filter-label {
      font-size:12px;
      color:#556;
      text-transform:uppercase;
      letter-spacing:0.04em;
    }

    .filter-controls {
      display:flex;
      gap:8px;
      align-items:center;
    }

    .input-wrap {
      position:relative;
      flex:1;
    }

    .filter-input {
      width:100%;
      padding:10px 40px 10px 12px;
      border:1px solid #e6e9ec;
      border-radius:8px;
      background:#fff;
      box-shadow:0 1px 2px rgba(16,24,40,0.03);
      font-size:14px;
      color:#17202a;
      outline:none;
    }

    .filter-input::placeholder { color:#9aa0a6; }

    .clear-btn {
      position:absolute;
      right:6px;
      top:50%;
      transform:translateY(-50%);
      border:none;
      background:transparent;
      width:30px;
      height:30px;
      border-radius:6px;
      cursor:pointer;
      color:#88909a;
      font-size:18px;
      line-height:1;
    }

    .clear-btn:hover { background:#f3f4f6; color:#444; }

    .select-wrap { min-width:150px; }

    .filter-select {
      width:100%;
      padding:10px 12px;
      padding-right:36px;
      border-radius:8px;
      border:1px solid #e6e9ec;
      background:#fff;
      font-size:14px;
      cursor:pointer;
      appearance:none;
      -webkit-appearance:none;
      -moz-appearance:none;
      background-image:
        linear-gradient(45deg, transparent 50%, #667 50%),
        linear-gradient(135deg, #667 50%, transparent 50%);
      background-position: calc(100% - 14px) calc(50% - 6px), calc(100% - 10px) calc(50% - 6px);
      background-size:6px 6px,6px 6px;
      background-repeat:no-repeat;
    }

    @media (max-width:420px) {
      .filter-controls { flex-direction:column; align-items:stretch; }
      .select-wrap { width:100%; min-width:0; }
    }
  `,
})
export class SelectFilter {
  valueOption = '';
  //Output per far salire i dati in dashboard, tipizzando i 2 valori di filtraggio
  filterParam = output<{ valueOption: string; textFilter: string }>();

    //metodo per emettere i dati da questo componente al componente padre
  onFilterBy(value: string): void {
    this.filterParam.emit({ valueOption: this.valueOption, textFilter: value });
  }
}

export interface IFilter {
  valueOption: string;
  textFilter: string;
}
