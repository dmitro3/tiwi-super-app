/**
 * Advert Types
 * 
 * Types for admin-created advertisements and promotions
 */

export type AdvertCampaignType =
  | 'Internal Promotion (TW features, staking pools, governance, updates)'
  | 'Partner Promotion (External ecosystem partners)'
  | 'Sponsored Campaign (Paid placement)';

export type AdvertFormat =
  | 'Banner (Horizontal)'
  | 'Card (Inline)'
  | 'Modal (High Placement - timed pop-up)';

export type AdvertAudienceTargeting =
  | 'All Users'
  | 'Token Holders'
  | 'Traders'
  | 'Stakers'
  | 'LPs'
  | 'DAO Voters';

export type AdvertPriorityLevel =
  | 'Normal'
  | 'Mid-tier'
  | 'Sponsored (locks placement)';

export type AdvertStatus = 'draft' | 'published' | 'archived';

export interface Advert {
  id: string;
  name: string;
  imageUrl?: string;
  campaignType: AdvertCampaignType;
  advertFormat: AdvertFormat;
  headline?: string;
  messageBody?: string;
  audienceTargeting?: AdvertAudienceTargeting;
  priorityLevel?: AdvertPriorityLevel;
  complianceNoMisleading?: boolean;
  complianceNoUnsolicited?: boolean;
  complianceClearRiskLanguage?: boolean;
  compliancePartnerVerified?: boolean;
  complianceConfirmed?: boolean;
  status: AdvertStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy?: string | null; // Admin user who created it
}

export interface CreateAdvertRequest {
  name: string;
  imageUrl?: string;
  campaignType: AdvertCampaignType;
  advertFormat: AdvertFormat;
  headline?: string;
  messageBody?: string;
  audienceTargeting?: AdvertAudienceTargeting;
  priorityLevel?: AdvertPriorityLevel;
  complianceNoMisleading?: boolean;
  complianceNoUnsolicited?: boolean;
  complianceClearRiskLanguage?: boolean;
  compliancePartnerVerified?: boolean;
  complianceConfirmed?: boolean;
  status?: AdvertStatus;
  createdBy?: string | null;
}

export interface UpdateAdvertRequest {
  id: string;
  name?: string;
  imageUrl?: string;
  campaignType?: AdvertCampaignType;
  advertFormat?: AdvertFormat;
  headline?: string;
  messageBody?: string;
  audienceTargeting?: AdvertAudienceTargeting;
  priorityLevel?: AdvertPriorityLevel;
  complianceNoMisleading?: boolean;
  complianceNoUnsolicited?: boolean;
  complianceClearRiskLanguage?: boolean;
  compliancePartnerVerified?: boolean;
  complianceConfirmed?: boolean;
  status?: AdvertStatus;
}

export interface AdvertsAPIResponse {
  adverts: Advert[];
  total: number;
}

