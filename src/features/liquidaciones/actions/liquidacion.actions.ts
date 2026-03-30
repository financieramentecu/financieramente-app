'use server'

import { 
  obtenerComisionesLiquidadas, 
  obtenerTodosLosContratos,
  obtenerTodosLosCoaches
} from '../services/liquidacion.service';
import { ApiResponse } from '@/features/shared/types/api-response.types';

export async function fetchComisionesLiquidadasAction(
  params: {
    startDate?: Date;
    endDate?: Date;
    month?: number;
    year?: number;
    contract?: string;
    coachId?: number;
  }
): Promise<ApiResponse<Awaited<ReturnType<typeof obtenerComisionesLiquidadas>>>> {
  try {
    const data = await obtenerComisionesLiquidadas(params);
    return {
      data,
    };
  } catch (error) {
    console.error('Error fetching liquidaciones:', error);
    return {
      data: null,
      error: 'No se pudieron obtener las liquidaciones históricas',
    };
  }
}

export async function fetchContratosAction(): Promise<ApiResponse<string[]>> {
  try {
    const data = await obtenerTodosLosContratos();
    return {
      data,
    };
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return {
      data: null,
      error: 'No se pudieron obtener los contratos',
    };
  }
}

export async function fetchCoachesAction(): Promise<ApiResponse<Awaited<ReturnType<typeof obtenerTodosLosCoaches>>>> {
  try {
    const data = await obtenerTodosLosCoaches();
    return {
      data,
    };
  } catch (error) {
    console.error('Error fetching coaches:', error);
    return {
      data: null,
      error: 'No se pudieron obtener los coaches',
    };
  }
}
