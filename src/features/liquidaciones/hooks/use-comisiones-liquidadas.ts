'use client';

import { useState, useCallback } from 'react';
import { AsyncState } from '@/features/shared/types/async-state.types';
import { 
  fetchComisionesLiquidadasAction, 
  fetchContratosAction,
  fetchCoachesAction
} from '../actions/liquidacion.actions';

export function useComisionesLiquidadas() {
  const [state, setState] = useState<AsyncState<any>>({ status: 'idle', data: undefined, error: '' });
  const [contratos, setContratos] = useState<string[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  const fetchComisiones = useCallback(async (params: { 
    startDate?: Date; 
    endDate?: Date; 
    month?: number; 
    year?: number;
    contract?: string;
    coachId?: number;
  } = {}) => {
    setState({ status: 'loading', data: undefined, error: '' });
    try {
      const response = await fetchComisionesLiquidadasAction(params);
      
      if (response && !('error' in response)) {
        setState({
          status: 'success',
          data: response.data,
          error: ''
        });
      } else {
        setState({
          status: 'error',
          data: undefined,
          error: response?.error || 'Error desconocido al cargar liquidaciones',
        });
      }
    } catch (err: any) {
      setState({
        status: 'error',
        data: undefined,
        error: err instanceof Error ? err.message : 'Ocurrió un error inesperado',
      });
    }
  }, []);

  const fetchContratos = useCallback(async () => {
    setLoadingContratos(true);
    try {
      const response = await fetchContratosAction();
      if (response && !('error' in response) && response.data) {
        setContratos(response.data);
      }
    } catch (err) {
      console.error('Error fetching contracts in hook:', err);
    } finally {
      setLoadingContratos(false);
    }
  }, []);

  const fetchCoaches = useCallback(async () => {
    setLoadingCoaches(true);
    try {
      const response = await fetchCoachesAction();
      if (response && !('error' in response) && response.data) {
        setCoaches(response.data);
      }
    } catch (err) {
      console.error('Error fetching coaches in hook:', err);
    } finally {
      setLoadingCoaches(false);
    }
  }, []);

  return {
    state,
    contratos,
    loadingContratos,
    coaches,
    loadingCoaches,
    fetchComisiones,
    fetchContratos,
    fetchCoaches,
  };
}
