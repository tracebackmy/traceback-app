import { Item } from '@/types';

/**
 * Calculates a match score between two items.
 * Max Score: ~100
 */
export const calculateMatchScore = (target: Item, candidate: Item): number => {
  let score = 0;

  // 1. Category Match (Base Requirement - 40 pts)
  // Even though we pre-filter, we keep this weight for logic consistency
  if (target.category === candidate.category) {
    score += 40;
  }

  // 2. Station/Location Match (30 pts)
  if (target.stationId && candidate.stationId) {
    const targetStation = target.stationId.toLowerCase().trim();
    const candidateStation = candidate.stationId.toLowerCase().trim();
    
    if (targetStation === candidateStation || targetStation.includes(candidateStation) || candidateStation.includes(targetStation)) {
      score += 30;
    }
  }

  // 3. Transit Mode Match (10 pts)
  if (target.mode && candidate.mode && target.mode === candidate.mode) {
    score += 10;
  }

  // 4. Keyword Overlap (Max 20 pts)
  const targetKeywords = (target.keywords || []).map(k => k.toLowerCase());
  const candidateKeywords = (candidate.keywords || []).map(k => k.toLowerCase());
  
  // Find intersection
  const intersection = targetKeywords.filter(k => 
    candidateKeywords.some(ck => ck.includes(k) || k.includes(ck))
  );
  
  // 5 pts per matching keyword
  score += Math.min(intersection.length * 5, 20);

  return score;
};

// Deprecated client-side findMatches in favor of server-action approach
// Keeping strict signature for legacy support if needed
export const findMatches = (targetItem: Item, allItems: Item[], threshold: number = 50) => {
   // Legacy wrapper if needed, but prefer server action
   return [];
};