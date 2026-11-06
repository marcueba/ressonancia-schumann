import type { CurrentResonanceData } from '../types';
import { getSchumannAvailability, isSchumannFrequency } from '../../shared/schumann';

export function schumannAvailability(data: CurrentResonanceData | null) {
  if (!data || data.available === false) return 'unavailable';
  return getSchumannAvailability([data.fundamental?.frequency, data.mode2?.frequency, data.mode3?.frequency, data.mode4?.frequency, data.mode5?.frequency]);
}

export function schumannStatus(data: CurrentResonanceData | null) {
  if (!data) return 'Falha ao consultar os dados Schumann';
  const availability = schumannAvailability(data);
  if (availability === 'unavailable') return 'Schumann indisponível — nenhuma frequência válida';
  if (data.is_historical) return availability === 'partial' ? 'Leitura histórica parcial fornecida pela fonte' : 'Leitura histórica fornecida pela fonte';
  return availability === 'partial' ? 'Dados derivados parciais' : 'Frequências derivadas disponíveis';
}

export function displayFrequency(value: unknown, digits = 1) {
  return isSchumannFrequency(value) ? value.toFixed(digits) : '--';
}
