import React from 'react';
import { getCreditSceneInfo, getFamilyFriendlyInfo, getAwardInfo } from '../utils/movieBadges';

// ==========================================
// Sleek Minimal Badges (Pure Minimal Studio Aesthetic)
// No emojis, uniform height (h-7), subtle border-white/10, bg-white/[0.03], text-zinc-200
// ==========================================

export const AwardBadge: React.FC<{ movie: any; omdbAwards?: string; className?: string }> = ({ movie, omdbAwards, className = '' }) => {
  const award = getAwardInfo(movie, omdbAwards);
  if (!award) return null;

  return (
    <div
      className={`h-7 inline-flex items-center px-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-200 text-xs font-medium tracking-normal select-none backdrop-blur-sm ${className}`}
      title={award.text}
    >
      <span className="leading-none text-zinc-200 font-medium">{award.text}</span>
    </div>
  );
};

export const FamilyFriendlyBadge: React.FC<{ movie: any; className?: string }> = ({ movie, className = '' }) => {
  const info = getFamilyFriendlyInfo(movie);
  if (!info.isFamilyFriendly) return null;

  return (
    <div
      className={`h-7 inline-flex items-center px-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-200 text-xs font-medium tracking-normal select-none backdrop-blur-sm ${className}`}
      title={info.certification ? `Rated ${info.certification} • Suitable for family viewing` : 'Suitable for all ages'}
    >
      <span className="leading-none text-zinc-200 font-medium">{info.label}</span>
    </div>
  );
};

export const CreditSceneBadge: React.FC<{ keywordsData: any; releaseDate?: string; className?: string }> = ({
  keywordsData,
  releaseDate,
  className = ''
}) => {
  const info = getCreditSceneInfo(keywordsData, releaseDate);

  if (info.status === 'mid-credit') {
    return (
      <div
        className={`h-7 inline-flex items-center px-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-200 text-xs font-medium tracking-normal select-none backdrop-blur-sm ${className}`}
        title="Stay seated: extra scene plays during the credits"
      >
        <span className="leading-none text-zinc-200 font-medium">Mid-Credit Scene</span>
      </div>
    );
  }

  if (info.status === 'post-credit' || info.status === 'both') {
    return (
      <div
        className={`h-7 inline-flex items-center px-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-200 text-xs font-medium tracking-normal select-none backdrop-blur-sm ${className}`}
        title="Extra scene plays after the full credits finish"
      >
        <span className="leading-none text-zinc-200 font-medium">{info.status === 'both' ? 'Mid & Post-Credits' : 'Post-Credit Scene'}</span>
      </div>
    );
  }

  // Only show when there is a credit scene; when there isn't, display nothing
  return null;
};

