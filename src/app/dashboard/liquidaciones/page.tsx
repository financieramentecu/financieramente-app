import { Metadata } from 'next';
import { HistoricoLiquidaciones } from '@/features/liquidaciones/components/historico-liquidaciones';

import { DashboardLayout } from '@/features/shared/layout/DashboardLayout';

export const metadata: Metadata = {
  title: 'Histórico de Liquidaciones',
  description: 'Historial de liquidaciones de comisiones',
};

export default function LiquidacionesPage() {
  return (
    <DashboardLayout currentPage="Liquidaciones">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Liquidaciones</h2>
        </div>
        
        <HistoricoLiquidaciones />
      </div>
    </DashboardLayout>
  );
}
