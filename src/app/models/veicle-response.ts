import { Veicles } from "./veicles"

export interface IVeicleResponse{
    items:Veicles[],
    totalCount: number,
  page: number,
  pageSize: number,
  totalPages: number
}