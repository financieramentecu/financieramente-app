'use server'

import { 
  obtenerComisionesLiquidadas, 
  obtenerTodosLosContratos,
  obtenerTodosLosCoaches
} from '../services/liquidacion.service';
import { ApiResponse } from '@/features/shared/types/api-response.types';
import { UserRole, isValidRole } from '@/features/auth/lib/roles';
import { requireActionPermission } from '@/lib/auth/require-action-permission';

// SEC-03: settlement history must never reach a PARTNER (or a pending DEFAULT /
// unknown role). Internal roles keep today's behavior.
// TODO(partner-profile): the permission matrix only grants `liquidaciones.liquidacion`
// to ADMIN and ASISTENTE_GERENCIA_OPERATIVA; narrowing AGENTE / CONSULTOR /
// ANALISTA_SOPORTE here is a product decision and is intentionally NOT done.
const canViewLiquidaciones = (role: string | undefined): boolean =>
  !!role && isValidRole(role) && role !== UserRole.PARTNER && role !== UserRole.DEFAULT;

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
  const guard = await requireActionPermission(canViewLiquidaciones);
  if (!guard.ok) {
    return { data: null, error: guard.error };
  }
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
  const guard = await requireActionPermission(canViewLiquidaciones);
  if (!guard.ok) {
    return { data: null, error: guard.error };
  }
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
  const guard = await requireActionPermission(canViewLiquidaciones);
  if (!guard.ok) {
    return { data: null, error: guard.error };
  }
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
