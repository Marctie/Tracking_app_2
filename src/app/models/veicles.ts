import { VeiclePosition } from "./veicle-position";

export interface Veicles {
      id: number;
      licensePlate: string; 
      model: string;
      brand: string;
      status: string;
      createdAt:Date ;
      lastPosition:VeiclePosition;
}

export interface VeicleStatus {
  vehicleId: number;
  status: string;
  timestamp: string | number;
}
