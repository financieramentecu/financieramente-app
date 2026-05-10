import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Recursively converts Prisma Decimal objects to numbers.
 * Necessary for Next.js Client Component serialization.
 */
function serializeDecimal<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => serializeDecimal(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    // Check if it's a Decimal object
    if ('toNumber' in data && typeof (data as { toNumber?: unknown }).toNumber === 'function') {
      return (data as { toNumber: () => number }).toNumber() as unknown as T;
    }

    // Handle Date objects (already serializable but good to keep)
    if (data instanceof Date) return data;

    const result: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeDecimal(obj[key]);
      }
    }
    return result as unknown as T;
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

const liquidacionInclude = {
  business: {
    include: {
      client: true,
      user: {
        include: {
          category: true,
          leader: {
            include: {
              leader: {
                include: {
                  leader: true
                }
              }
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
          level: true
        }
      },
      clawback: {
        include: {
          user: true
        }
      },
    }
  }
} satisfies Prisma.SettlementCommissionInclude;

export type LiquidacionConRelaciones = Prisma.SettlementCommissionGetPayload<{
  include: typeof liquidacionInclude
}>;

export interface LiquidacionesData {
  comisiones: LiquidacionConRelaciones[];
  metrics: {
    totalSettled: number;
    totalClawbacks: number;
    count: number;
  };
}

export async function obtenerComisionesLiquidadas(params: GetLiquidacionesParams): Promise<LiquidacionesData> {
  const { startDate, endDate, month, year, contract, coachId } = params;

  // Construir filtros de fecha
  let dateFilter: Prisma.DateTimeFilter | undefined = undefined;
  
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
  const whereInfo: Prisma.SettlementCommissionWhereInput = {
    status: 'SETTLED',
  };

  if (dateFilter) {
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
    include: liquidacionInclude,
    orderBy: {
      settledDate: 'desc'
    }
  });

  // Calcular métricas basadas en las distribuciones (foto del momento de liquidación)
  let totalSettled = 0;
  let totalClawbacks = 0;

  comisiones.forEach(c => {
    c.comissionDistributions.forEach((d) => {
      totalSettled += Number(d.valueComissionFinal) || 0;
      totalClawbacks += Number(d.totalDiscount) || 0;
    });
  });

  return serializeDecimal({
    comisiones,
    metrics: {
      totalSettled,
      totalClawbacks,
      count: comisiones.length
    }
  }) as LiquidacionesData;
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
