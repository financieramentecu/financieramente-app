/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { procesarPreLiquidacion } from './pre-liquidacion.service';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        fileImport: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        settlementCommission: {
            findMany: vi.fn(),
            update: vi.fn(),
        },
        productPercentajeCommisionCategory: {
            findMany: vi.fn(),
        },
        comissionDistribution: {
            create: vi.fn(),
        },
        discount: {
            findFirst: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
    },
}));

describe('procesarPreLiquidacion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if file does not exist', async () => {
        vi.mocked(prisma.fileImport.findUnique).mockResolvedValue(null);

        const result = await procesarPreLiquidacion(1, {
            inicio: new Date(),
            fin: new Date(),
        });

        expect(result.success).toBe(false);
        expect(result.mensaje).toContain('Archivo no encontrado');
    });

    it('should return error if file is not in LOAD status', async () => {
        // Mock finding the file but with wrong status
        vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
            idFileImport: 1,
            status: 'PROCESANDO', // Anything other than LOAD
        } as any);

        const result = await procesarPreLiquidacion(1, {
            inicio: new Date(),
            fin: new Date(),
        });

        expect(result.success).toBe(false);
        expect(result.mensaje).toContain('El archivo debe estar en estado LOAD');
    });

    it('should return success and process records when everything is correct', async () => {
        // Mock file exists and is LOAD
        vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
            idFileImport: 1,
            status: 'LOAD',
        } as any);

        // Mock records found
        vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
            {
                idSettlementCommission: 100,
                status: 'SINCRONIZADO',
                valorComision: new Decimal(100000),
                business: {
                    idProductPercentajeCommision: 50,
                },
            },
        ] as any);

        // Mock percentaje config
        vi.mocked(prisma.productPercentajeCommisionCategory.findMany).mockResolvedValue([
            {
                id: 10,
                porcentajeDistribucion: new Decimal(0.5), // 50%
            },
        ] as any);

        // Mock descuento activo (usado por obtenerDescuentoActivo)
        vi.mocked(prisma.discount.findFirst).mockResolvedValue({
            idDiscount: 1,
            percentage: new Decimal(0.12),
        } as any);

        // Mock transaction success by default (fn calls callback)

        const result = await procesarPreLiquidacion(1, {
            inicio: new Date('2024-01-01'),
            fin: new Date('2024-01-31'),
        });

        expect(result.success).toBe(true);
        expect(result.registrosProcesados).toBe(1);

        // Verify status update to PRELIQUIDADO
        expect(prisma.settlementCommission.update).toHaveBeenCalledWith({
            where: { idSettlementCommission: 100 },
            data: { status: 'PRELIQUIDADO' },
        });

        // Verify file status update
        expect(prisma.fileImport.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { idFileImport: 1 },
                data: expect.objectContaining({ status: 'PRELIQUIDADO' })
            })
        );
    });
});
