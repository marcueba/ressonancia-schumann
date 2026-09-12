// Calculate the proprietary Earth Resonance Index (ERI)
// Only uses effectively available data

import { NormalizedSchumannData } from '../types';

export function calculateERI(schumann: NormalizedSchumannData | null, geoKp: number | null): { score: number, status: string, version: string } {
  let score = 50; // Base score
  
  // Example simplistic algorithm (since it's a proprietary index)
  if (schumann) {
    // If fundamental amplitude is higher, increase ERI
    if (schumann.fundamental.amplitude > 3.0) {
      score += 15;
    } else {
      score -= 5;
    }

    // Check frequency stability
    const freqDiff = Math.abs(schumann.fundamental.frequency - 7.83);
    if (freqDiff > 0.1) {
      score += 10; // Instability increases the "activity" index
    }
  }

  if (geoKp !== null) {
    score += (geoKp * 4);
  }

  // Cap between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let status = "Muito baixa";
  if (score >= 21) status = "Baixa";
  if (score >= 41) status = "Moderada";
  if (score >= 61) status = "Elevada";
  if (score >= 81) status = "Muito elevada";

  return {
    score,
    status,
    version: "1.0"
  };
}
