import { NormalizedListing } from '@ecompilot/connectors';

export interface ListingQualityResult {
  score: number;
  breakdown: Record<string, number>;
  recommendations: string[];
}

export function auditListingQuality(listing: NormalizedListing): ListingQualityResult {
  const recommendations: string[] = [];

  const titleScore = listing.title.length >= 45 && listing.title.length <= 180 ? 95 : 65;
  if (titleScore < 80) recommendations.push('Improve title length (45–180 characters with key specs)');

  const bulletScore = listing.bulletCount >= 5 ? 95 : Math.max(40, listing.bulletCount * 18);
  if (listing.bulletCount < 5) recommendations.push('Expand bullet points to 5 benefit-led points');

  const imageScore = listing.imageCount >= 5 ? 95 : Math.max(40, listing.imageCount * 18);
  const lifestyleScore = listing.lifestyleImageCount >= 2 ? 95 : 40;
  if (listing.lifestyleImageCount < 2) {
    recommendations.push(`Add ${2 - listing.lifestyleImageCount} lifestyle images`);
  }

  const attributeScore = listing.missingAttributes.length === 0 ? 100 : 35;
  if (listing.missingAttributes.length > 0) {
    recommendations.push(`Populate missing attributes: ${listing.missingAttributes.join(', ')}`);
  }

  const brandScore = listing.hasBrand ? 100 : 30;
  const categoryScore = listing.categoryMapped ? 100 : 40;

  const breakdown = {
    titleQuality: titleScore,
    bulletPoints: bulletScore,
    descriptionQuality: 82,
    images: imageScore,
    lifestyleImages: lifestyleScore,
    keywords: 74,
    attributes: attributeScore,
    brandInfo: brandScore,
    categoryCorrectness: categoryScore,
  };

  const values = Object.values(breakdown);
  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return { score, breakdown, recommendations };
}
