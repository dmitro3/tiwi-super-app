/**
 * Search Utilities
 * 
 * Platform-agnostic search and filtering utilities for tokens.
 * Can be used in both web and mobile.
 */

/**
 * Calculate similarity score between query and text (0-1)
 * Uses simple substring matching and Levenshtein-like scoring
 * 
 * @param query - Search query
 * @param text - Text to match against
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(query: string, text: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Exact match
  if (lowerText === lowerQuery) return 1.0;
  
  // Contains match (high score)
  if (lowerText.includes(lowerQuery)) return 0.8;
  
  // Starts with match
  if (lowerText.startsWith(lowerQuery)) return 0.9;
  
  // Calculate character overlap
  let matches = 0;
  const queryChars = lowerQuery.split('');
  const textChars = lowerText.split('');
  
  queryChars.forEach((char) => {
    if (textChars.includes(char)) {
      matches++;
    }
  });
  
  // Similarity based on character overlap
  const overlapScore = matches / Math.max(queryChars.length, textChars.length);
  
  // Check for partial word matches
  const queryWords = lowerQuery.split(/\s+/);
  const textWords = lowerText.split(/\s+/);
  let wordMatches = 0;
  
  queryWords.forEach((qWord) => {
    if (qWord.length > 2) {
      textWords.forEach((tWord) => {
        if (tWord.includes(qWord) || qWord.includes(tWord)) {
          wordMatches++;
        }
      });
    }
  });
  
  const wordScore = queryWords.length > 0 ? wordMatches / queryWords.length : 0;
  
  // Combine scores (weighted average)
  return Math.max(overlapScore * 0.6 + wordScore * 0.4, overlapScore);
}

