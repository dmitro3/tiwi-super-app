/**
 * Class name utility for merging Tailwind CSS classes
 * 
 * Combines clsx and tailwind-merge for conditional class names.
 * Can be used in both web and mobile (if using Tailwind or similar).
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind conflict resolution
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

