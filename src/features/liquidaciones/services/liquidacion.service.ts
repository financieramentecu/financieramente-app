import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Recursively converts Prisma Decimal objects to numbers.
 * Necessary for Next.js Client Component serialization.
 */
function serializeDecimal<T>(data: T): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => serializeDecimal(item));
  }

  if (typeof data === 'object') {
    // Check if it's a Decimal object
    if ('toNumber' in data && typeof (data as any).toNumber === 'function') {
      return (data as any).toNumber();
    }

    // Handle Date objects (already serializable but good to keep)
    if (data instanceof Date) return data;

    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializeDecimal((data as any)[key]);
      }
    }
    return result;
  }

  return data;
}

export interface GetLiquidacionesParams {
  startDate?: Date;
  endDate?: Date;
  month?: number;
  year?: number;
  contract?: string;
  coachId?: number;
}

export async function obtenerComisionesLiquidadas(params: GetLiquidacionesParams) {
  const { startDate, endDate, month, year, contract, coachId } = params;

  // Construir filtros de fecha
  let dateFilter: any = {};
  
  if (startDate && endDate) {
    dateFilter = {
      gte: startDate,
      lte: endDate,
    };
  } else if (month && year) {
    // Si se pasa mes y año
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    dateFilter = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  // Si no hay filtro, podríamos requerirlo o no, pero mejor permitir consultar todo u opcional
  const whereInfo: any = {
    status: 'SETTLED',
  };

  if (Object.keys(dateFilter).length > 0) {
    whereInfo.settledDate = dateFilter;
  }

  if (contract || coachId) {
    whereInfo.business = {};
    if (contract) {
      whereInfo.business.contract = {
        contains: contract,
        mode: 'insensitive'
      };
    }
    if (coachId) {
      whereInfo.business.user = {
        leader: {
          leader: {
            idUser: coachId
          }
        }
      };
    }
  }

  // Buscar todas las liquidaciones en el rango
  const comisiones = await prisma.settlementCommission.findMany({
    where: whereInfo,
    include: {
      business: {
        include: {
          client: true,
          user: {
            include: {
              category: true,
              leader: {
                include: {
                  leader: true
                }
              }
            }
          },
          productPercentageCommission: {
            include: {
              productConfiguration: {
                include: {
                  product: true
                }
              }
            }
          },
        }
      },
      comissionDistributions: {
        include: {
          productPercentageCommissionCategory: {
            include: {
              category: true
            }
          },
          clawback: {
            include: {
              user: true
            }
          },
        }
      }
    },
    orderBy: {
      settledDate: 'desc'
    }
  });

  // Calcular métricas
  const totalSettled = comisiones.reduce((acc, curr) => acc + (Number(curr.commissionValue) || 0), 0);
  
  // Calcular clawbacks: la suma de todos los clawbacks aplicados en estas comisiones
  // Un clawback suele estar asociado a distribution, o la comision tiene isClawback / clawbackPercentage
  // Según el modelo, existe clawback = true y clawback dentro de distribuciones.
  let totalClawbacks = 0;
  comisiones.forEach(c => {
    c.comissionDistributions.forEach(d => {
      if (d.clawback) {
        totalClawbacks += Number(d.clawback.valueClawback) || 0;
      }
    });
  });

  return serializeDecimal({
    comisiones,
    metrics: {
      totalSettled,
      totalClawbacks,
      count: comisiones.length
    }
  });
}

/**
 * Obtiene la lista de todos los números de contrato únicos con liquidaciones
 */
export async function obtenerTodosLosContratos() {
  const contracts = await prisma.settlementCommission.findMany({
    where: {
      status: 'SETTLED',
      contract: { not: null }
    },
    select: {
      contract: true
    },
    distinct: ['contract'],
    orderBy: {
      contract: 'asc'
    }
  });

  return contracts.map(c => c.contract).filter(Boolean) as string[];
}

/**
 * Obtiene la lista de todos los coaches (usuarios que son líderes de alguien)
 */
export async function obtenerTodosLosCoaches() {
  const coaches = await prisma.user.findMany({
    where: {
      subordinates: {
        some: {}
      },
      active: true,
      // Opcional: Filtrar por categorías específicas si se desea
    },
    select: {
      idUser: true,
      name: true,
      lastName: true,
      category: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return coaches.map(c => ({
    id: c.idUser,
    fullName: `${c.name} ${c.lastName || ''}`.trim(),
    category: c.category?.name || 'N/A'
  }));
}
