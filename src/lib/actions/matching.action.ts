'use server';

import { FirestoreService } from '@/lib/firebase/firestore';
import { calculateMatchScore } from '@/lib/features/matchingAlgorithm';
import { Item, ItemStatus } from '@/types';

export interface MatchResult {
  item: Item;
  score: number;
  matchReasons: string[];
}

export async function findPotentialMatches(itemId: string): Promise<MatchResult[]> {
  try {
    // 1. Get Target Item
    const targetItem = await FirestoreService.getItemById(itemId);
    if (!targetItem) throw new Error("Target item not found");

    // 2. Pre-filter Candidates via Firestore
    // - Must be opposite type (Lost -> Found, Found -> Lost)
    // - Must be same Category (High probability filter)
    // - Must be 'listed' or 'reported' (Active)
    const targetType = targetItem.itemType === 'lost' ? 'found' : 'lost';
    const statusFilter = targetType === 'found' ? ItemStatus.Listed : ItemStatus.Reported;

    // Fetch candidates from DB (limit to 50 for performance)
    const { items: candidates } = await FirestoreService.getItems({
      type: targetType,
      category: targetItem.category,
      status: statusFilter,
      limit: 50
    });

    // 3. Run Scoring Algorithm
    const matches: MatchResult[] = [];
    const THRESHOLD = 30; // Minimum score to be considered a match

    candidates.forEach(candidate => {
      const score = calculateMatchScore(targetItem, candidate);
      
      if (score >= THRESHOLD) {
        const reasons = [];
        if (targetItem.stationId === candidate.stationId) reasons.push('Same Station');
        if (targetItem.mode === candidate.mode) reasons.push('Same Transit Mode');
        if (score >= 60) reasons.push('High Keyword Match');
        if (score >= 40 && score < 60) reasons.push('Partial Keyword Match');

        matches.push({
          item: candidate,
          score,
          matchReasons: reasons
        });
      }
    });

    // 4. Return sorted results
    return matches.sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error("Matching Error:", error);
    return [];
  }
}