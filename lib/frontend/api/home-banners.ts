/**
 * Home banner API
 *
 * Fetches active promotional banners (published adverts) from the database.
 */

import { fetchAdverts } from "./adverts";
import type { Advert } from "@/lib/shared/types/adverts";

export interface HomeBanner {
  id: string;
  imageUrl: string;
  alt: string;
  href?: string;
  order: number;
}

// Fetch published adverts and convert to HomeBanner format
export async function fetchHomeBanners(): Promise<HomeBanner[]> {
  try {
    // Fetch published adverts from the API
    const adverts = await fetchAdverts({ status: "published" });
    
    // Filter adverts that have images and take the first 3
    const advertsWithImages = adverts
      .filter((advert) => advert.imageUrl)
      .slice(0, 3);
    
    // Map adverts to HomeBanner format
    return advertsWithImages.map((advert, index) => ({
      id: advert.id,
      imageUrl: advert.imageUrl!,
      alt: advert.headline || advert.name || "Promotional banner",
      href: undefined,
      order: index + 1,
    }));
  } catch (error) {
    console.error("[fetchHomeBanners] Error fetching adverts:", error);
    // Return empty array on error to prevent crashes
    return [];
  }
}


