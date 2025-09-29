import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-mappatest',
  imports: [],
  template: `
    <div class="map-container">
      <h2>Test della mappa Leaflet</h2>
      <p>Mappa interattiva con Leaflet.js</p>
      <!-- Container per la mappa Leaflet -->
    <div id="map"></div>
    </div>
  `,
  styles: `
    .map-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }

    .map-container h2 {
      color: #007bff;
      margin-bottom: 10px;
    }

    .map-container p {
      color: #666;
      margin-bottom: 15px;
    }

    /* Contenitore della mappa con dimensioni fisse */
    #map { 
      height: 400px; 
      width: 100%;
      border: 2px solid #007bff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  `,
})
export class Mappatest implements AfterViewInit {
  private map!: L.Map;

  ngAfterViewInit(): void {
    // Inizializza la mappa dopo che la vista è stata caricata
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([41.9028, 12.4964], 13);

    // Aggiunge il layer delle tile di OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // Aggiunge un marker di esempio
    L.marker([41.9, 12.50])
      .addTo(this.map)
      .bindPopup('qui ci sono i treni !')
      .openPopup();

    // Aggiunge un cerchio colorato di esempio
    L.circle([51.508, -0.11], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: 500,
    })
      .addTo(this.map)
      .bindPopup('Sono un cerchio!');

    // Aggiunge un poligono di esempio
    L.polygon([
      [51.509, -0.08],
      [51.503, -0.06],
      [51.51, -0.047],
    ])
      .addTo(this.map)
      .bindPopup('Sono un poligono!');
  }
}
