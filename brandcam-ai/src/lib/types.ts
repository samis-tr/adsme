import type { FontToken } from '../ui/theme';

export type BusinessType = 'cafe' | 'restaurant' | 'bakery' | 'salon' | 'fashion' | 'auto' | 'other';
export type VisualStyle = 'luxury' | 'modern' | 'warm' | 'minimal' | 'playful';
export type FilterId = 'natural' | 'warm' | 'crisp' | 'film' | 'noir' | 'brand';

export type BrandDNA = {
  businessName: string;
  businessType: BusinessType;
  logoUri: string | null;
  style: VisualStyle;
  /** 4 hex colours: [primary, secondary, accent, neutral]. */
  palette: [string, string, string, string];
  font: FontToken;
  defaultFilter: FilterId;
  updatedAt: number;
};

export type ProjectKind = 'photo' | 'video';
export type ProjectStatus = 'draft' | 'exported';

export type Project = {
  id: string;
  kind: ProjectKind;
  /** file:// uri of the original capture/import (filtered, for photos). */
  mediaUri: string;
  /** Filter that was active at capture time. Video files are stored unfiltered. */
  filterId: FilterId;
  filterBaked: boolean;
  status: ProjectStatus;
  durationSec?: number;
  /** JPEG poster frame for video projects. */
  thumbUri?: string;
  /** Saved editor state, so an ad can be reopened and edited. */
  ad?: AdDraft;
  exports?: ExportRecord[];
  createdAt: number;
};

export type AdGoal = 'product' | 'offer' | 'brand';
export type AspectId = '9:16' | '4:5' | '1:1';

export type AdDraft = {
  goal: AdGoal;
  headline: string;
  subline: string;
  cta: string;
  /** Grade applied in the editor (on top of the original media). */
  filterId: FilterId;
  aspect: AspectId;
  showLogo: boolean;
  /** Branded outro card (video only). */
  endCard: boolean;
  /** Seconds into the source clip (video only). */
  trimStart: number;
  trimEnd: number;
  originalAudio: boolean;
  updatedAt: number;
};

export type ExportRecord = {
  uri: string;
  kind: 'image' | 'video';
  aspect: AspectId;
  width: number;
  height: number;
  durationSec?: number;
  sizeBytes: number;
  createdAt: number;
};
