
import { Item } from '@/types';

interface MatchResult {
  item: Item;
  score: number;
  matchReasons: string[];
}

/**
 * Calculates a match score between a lost item (target) and a candidate item.
 * Higher score = better match.
 */
export const calculateMatchScore = (target: Item, candidate: Item): number => {
  let score = 0;

  // 1. Category Match (High Weight)
  if (target.category === candidate.category) {
    score += 40;
  }

  // 2. Location/Station Match (Medium Weight)
  // Normalizing strings to lower case for comparison
  if (target.stationId && candidate.stationId && 
      target.stationId.toLowerCase().includes(candidate.stationId.toLowerCase())) {
    score += 30;
  }

  // 3. Transit Mode Match
  if (target.mode === candidate.mode) {
    score += 10;
  }

  // 4. Keyword Overlap (Dynamic Weight)
  const targetKeywords = target.keywords.map(k => k.toLowerCase());
  const candidateKeywords = candidate.keywords.map(k => k.toLowerCase());
  
  const intersection = targetKeywords.filter(k => candidateKeywords.includes(k));
  // Add 5 points per matching keyword, up to 20 points
  score += Math.min(intersection.length * 5, 20);

  return score;
};

/**
 * Finds potential matches for a given item from a list of items.
 * Returns sorted list of matches above a threshold.
 */
export const findMatches = (targetItem: Item, allItems: Item[], threshold: number = 50): MatchResult[] => {
  const matches: MatchResult[] = [];

  // We only look for items of the OPPOSITE type
  // If target is LOST, look for FOUND. If target is FOUND, look for LOST.
  const targetType = targetItem.itemType === 'lost' ? 'found' : 'lost';

  allItems.forEach(candidate => {
    // Basic filters
    if (candidate.itemType !== targetType) return;
    if (candidate.status === 'resolved' || candidate.status === 'closed') return;

    const score = calculateMatchScore(targetItem, candidate);

    if (score >= threshold) {
      const reasons = [];
      if (targetItem.category === candidate.category) reasons.push('Category Match');
      if (targetItem.stationId === candidate.stationId) reasons.push('Location Match');
      if (score >= 70) reasons.push('High Keyword Overlap');

      matches.push({
        item: candidate,
        score,
        matchReasons: reasons
      });
    }
  });

  // Sort by highest score first
  return matches.sort((a, b) => b.score - a.score);
};
