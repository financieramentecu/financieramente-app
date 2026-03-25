import type { PrismaClient } from '@prisma/client'

export async function seedSettlements(prisma: PrismaClient) {
  console.log('💰 Creando liquidaciones de prueba (Enero y Febrero 2026)...')

  const admin = await prisma.user.findFirst({
    where: { role: { code: 'ADMIN' } }
  }) || await prisma.user.findFirst();

  if (!admin) return;

  // Cleanup existing mock settlements to allow re-seeding with new data
  const mockFiles = ['liquidacion_enero_2026.csv', 'liquidacion_febrero_2026.csv'];
  for (const fileName of mockFiles) {
    const file = await prisma.fileImport.findFirst({ where: { nameFile: fileName } });
    if (file) {
      // 1. Get all settlement commissions for this file
      const commissions = await prisma.settlementCommission.findMany({
        where: { idFileImport: file.idFileImport },
        select: { idSettlementCommission: true }
      });
      const commissionIds = commissions.map(c => c.idSettlementCommission);

      if (commissionIds.length > 0) {
        // 2. Get all distributions for these commissions
        const distributions = await prisma.comissionDistribution.findMany({
          where: { idSettlementCommission: { in: commissionIds } },
          select: { idComissionDistribution: true }
        });
        const distributionIds = distributions.map(d => d.idComissionDistribution);

        if (distributionIds.length > 0) {
          // 3. Delete clawbacks
          await prisma.clawback.deleteMany({
            where: { idComissionDistribution: { in: distributionIds } }
          });
          // 4. Delete distributions
          await prisma.comissionDistribution.deleteMany({
            where: { idComissionDistribution: { in: distributionIds } }
          });
        }

        // 5. Delete settlement commissions
        await prisma.settlementCommission.deleteMany({
          where: { idSettlementCommission: { in: commissionIds } }
        });
      }

      // 6. Delete file import
      await prisma.fileImport.delete({ where: { idFileImport: file.idFileImport } });
      console.log(`  🗑️ Limpiada información previa de ${fileName} (incluyendo distribuciones y clawbacks)`);
    }
  }

  // Find business from Jan
  const polizaBusinesses = await prisma.business.findMany({
    where: { contract: { startsWith: 'CONT-' } },
    include: { productPercentageCommission: { include: { productPercentageCommissionCategories: true } } }
  });

  // Find business from Feb
  const voluntariaBusinesses = await prisma.business.findMany({
    where: { contract: { startsWith: 'CTO-' } },
    include: { productPercentageCommission: { include: { productPercentageCommissionCategories: true } } }
  });

  if (polizaBusinesses.length === 0 && voluntariaBusinesses.length === 0) {
    console.log('⚠️ No hay negocios para crear liquidaciones.');
    return;
  }

  const createSettlementProcess = async (
    fileName: string, 
    month: number, 
    year: number,
    settleDate: Date,
    businesses: typeof polizaBusinesses,
    commissionType: string
  ) => {
    const existingFileImport = await prisma.fileImport.findFirst({
      where: { nameFile: fileName }
    });

    if (existingFileImport) {
      console.log(`  ! Importación ${fileName} ya existe. Omitiendo la creación.`);
      return;
    }

    // 1. Crear FileImport
    const fileImport = await prisma.fileImport.create({
      data: {
        nameFile: fileName,
        fileType: commissionType, // POLIZA or VOLUNTARIO
        idUser: admin.idUser,
        status: 'SETTLED',
        month,
        year,
        totalRecord: businesses.length,
        successRecord: businesses.length,
        preLiquidacionDate: new Date(settleDate.getTime() - 86400000 * 5) // 5 days before
      }
    });

    // 2. Crear Comisiones Liquidadas
    for (const business of businesses) {
      const commissionValue = Number(business.value) * 0.10; // 10% base
      const hasDiscount = Math.random() > 0.5;
      const hasClawback = Math.random() > 0.7;
      
      const commission = await prisma.settlementCommission.create({
        data: {
          idFileImport: fileImport.idFileImport,
          idBusiness: business.idBusiness,
          contract: business.contract,
          commissionValue,
          baseCommission: commissionValue,
          commissionType: commissionType,
          status: 'SETTLED',
          settledDate: settleDate,
          originCommission: 'Asesoría Gratuita',
          discountPercentage: hasDiscount ? 0.12 : null,
          clawbackPercentage: hasClawback ? 0.10 : null,
        }
      });

      // 3. Crear Distribuciones
      const categories = business.productPercentageCommission.productPercentageCommissionCategories;
      for (const cat of categories) {
        const distValue = commissionValue * Number(cat.porcentajeDistribucion || 1);
        let totalDiscount = 0;
        let appliedDiscountPercentage = 0;
        
        if (hasDiscount) {
          appliedDiscountPercentage = 0.12; // 12%
          totalDiscount = distValue * appliedDiscountPercentage;
        }

        const valueComissionFinal = distValue - totalDiscount;

        const dist = await prisma.comissionDistribution.create({
          data: {
            idSettlementCommission: commission.idSettlementCommission,
            valueComission: distValue,
            valueComissionFinal,
            status: 'SETTLED',
            idPercentajeCommisionCategory: cat.id,
            totalDiscount: totalDiscount > 0 ? totalDiscount : null,
            appliedDiscountPercentage: appliedDiscountPercentage > 0 ? appliedDiscountPercentage : null,
          }
        });

        // 4. Crear Clawback si aplica a esta distribución
        if (hasClawback) {
          const clawbackValue = valueComissionFinal * 0.10;
          await prisma.clawback.create({
            data: {
              idComissionDistribution: dist.idComissionDistribution,
              idUser: admin.idUser,
              valueClawback: clawbackValue,
              porcentajeApplied: 0.10,
              state: 'APPLIED',
              appliedDate: settleDate,
              reason: 'Clawback de prueba'
            }
          });
          
          // Actualizar el valor final de la distribución para reflejar el clawback
          await prisma.comissionDistribution.update({
            where: { idComissionDistribution: dist.idComissionDistribution },
            data: { valueComissionFinal: valueComissionFinal - clawbackValue }
          });
        }
      }
    }
    console.log(`  ✓ Creada liquidación ${month}/${year} (${commissionType}) con ${businesses.length} registros`);
  };

  if (polizaBusinesses.length > 0) {
    await createSettlementProcess('liquidacion_enero_2026.csv', 1, 2026, new Date('2026-01-31T23:59:59Z'), polizaBusinesses, 'POLIZA');
  }

  if (voluntariaBusinesses.length > 0) {
    await createSettlementProcess('liquidacion_febrero_2026.csv', 2, 2026, new Date('2026-02-28T23:59:59Z'), voluntariaBusinesses, 'VOLUNTARIO');
  }
}
