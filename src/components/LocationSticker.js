'use client';
import React from 'react';
import { getLocationSticker } from '@/lib/locationStickers';

/**
 * Deterministic 32-bit integer hash from string
 */
function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Curated pastel gradients and complementary accent colors
 */
const PALETTES = [
  {
    skyTop: '#fed7aa',
    skyBottom: '#fecdd3',
    sunColor: '#f59e0b',
    sunGlow: '#fef3c7',
    ground1: '#22c55e',
    ground2: '#15803d',
    text1: '#059669',
    text2: '#d97706',
    borderText: '#ffffff',
  },
  {
    skyTop: '#ddd6fe',
    skyBottom: '#fed7aa',
    sunColor: '#ec4899',
    sunGlow: '#fce7f3',
    ground1: '#10b981',
    ground2: '#047857',
    text1: '#7c3aed',
    text2: '#db2777',
    borderText: '#ffffff',
  },
  {
    skyTop: '#bae6fd',
    skyBottom: '#a7f3d0',
    sunColor: '#fbbf24',
    sunGlow: '#fef9c3',
    ground1: '#16a34a',
    ground2: '#14532d',
    text1: '#0284c7',
    text2: '#059669',
    borderText: '#ffffff',
  },
  {
    skyTop: '#99f6e4',
    skyBottom: '#fed7aa',
    sunColor: '#f97316',
    sunGlow: '#ffedd5',
    ground1: '#0d9488',
    ground2: '#115e59',
    text1: '#0891b2',
    text2: '#ea580c',
    borderText: '#ffffff',
  },
  {
    skyTop: '#fef08a',
    skyBottom: '#fbcfe8',
    sunColor: '#f43f5e',
    sunGlow: '#ffe4e6',
    ground1: '#059669',
    ground2: '#065f46',
    text1: '#e11d48',
    text2: '#d97706',
    borderText: '#ffffff',
  },
  {
    skyTop: '#bfdbfe',
    skyBottom: '#e9d5ff',
    sunColor: '#3b82f6',
    sunGlow: '#dbeafe',
    ground1: '#0284c7',
    ground2: '#0369a1',
    text1: '#2563eb',
    text2: '#7c3aed',
    borderText: '#ffffff',
  },
];

/**
 * Render Vector Landmarks based on type & hash
 */
function renderLandmarkGraphic(type, seed) {
  switch (type) {
    case 'mumbai': // Gateway of India specific
      return (
        <g id="mumbai-gateway">
          {/* Sea ripples */}
          <path d="M 30 148 Q 50 144 70 148 T 110 148 T 150 148 T 190 148" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
          <path d="M 20 156 Q 45 152 70 156 T 120 156 T 170 156 T 200 156" fill="none" stroke="#0284c7" strokeWidth="3" opacity="0.7" strokeLinecap="round" />
          
          {/* Gateway Arch & Pillars */}
          {/* Plinth */}
          <rect x="52" y="132" width="116" height="8" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          <rect x="56" y="75" width="108" height="58" fill="#f59e0b" stroke="#78350f" strokeWidth="2.5" />
          
          {/* Central Grand Arch */}
          <path d="M 90 132 V 96 C 90 84 130 84 130 96 V 132 Z" fill="#451a03" stroke="#78350f" strokeWidth="2" />
          {/* Inner arch cutout glow */}
          <path d="M 96 132 V 102 C 96 92 124 92 124 102 V 132 Z" fill="#fde68a" opacity="0.4" />
          
          {/* Side Arches */}
          <path d="M 64 132 V 104 C 64 96 78 96 78 104 V 132 Z" fill="#78350f" />
          <path d="M 142 132 V 104 C 142 96 156 96 156 104 V 132 Z" fill="#78350f" />
          
          {/* Corner Minarets */}
          <rect x="52" y="52" width="16" height="80" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          <polygon points="50,52 60,38 70,52" fill="#b45309" stroke="#78350f" strokeWidth="2" />
          <rect x="152" y="52" width="16" height="80" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          <polygon points="150,52 160,38 170,52" fill="#b45309" stroke="#78350f" strokeWidth="2" />
          
          {/* Central Dome / Parapet */}
          <rect x="74" y="68" width="72" height="10" fill="#b45309" stroke="#78350f" strokeWidth="2" />
          <path d="M 88 68 C 88 48 132 48 132 68 Z" fill="#d97706" stroke="#78350f" strokeWidth="2.5" />
          <circle cx="110" cy="46" r="3" fill="#fef3c7" stroke="#78350f" strokeWidth="1.5" />

          {/* Tropical Palms at base */}
          <g transform="translate(26, 105) scale(0.65)">
            <path d="M 18 55 Q 22 25 15 0" fill="none" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
            <path d="M 15 0 Q 35 -10 40 10 Q 25 0 15 0" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
            <path d="M 15 0 Q -5 -15 -10 5 Q 5 -5 15 0" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
            <path d="M 15 0 Q 20 -25 25 -5 Q 18 -10 15 0" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
          </g>
          <g transform="translate(162, 105) scale(0.65) scale(-1, 1)">
            <path d="M 18 55 Q 22 25 15 0" fill="none" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
            <path d="M 15 0 Q 35 -10 40 10 Q 25 0 15 0" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
            <path d="M 15 0 Q -5 -15 -10 5 Q 5 -5 15 0" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
            <path d="M 15 0 Q 20 -25 25 -5 Q 18 -10 15 0" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
          </g>
        </g>
      );

    case 0: // Modern Skyline / Cityscape
      return (
        <g id="skyline">
          {/* Background Skyscrapers */}
          <rect x="42" y="70" width="28" height="70" fill="#93c5fd" stroke="#1e3a8a" strokeWidth="2" />
          <rect x="150" y="65" width="28" height="75" fill="#a5b4fc" stroke="#1e3a8a" strokeWidth="2" />
          
          {/* Center Tower with Spire */}
          <rect x="92" y="45" width="36" height="95" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="2.5" />
          <polygon points="98,45 110,22 122,45" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
          <line x1="110" y1="22" x2="110" y2="12" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" />
          
          {/* Left Tower */}
          <rect x="65" y="55" width="30" height="85" fill="#38bdf8" stroke="#1e3a8a" strokeWidth="2" />
          <polygon points="65,55 80,42 95,55" fill="#0284c7" stroke="#1e3a8a" strokeWidth="2" />

          {/* Right Tower */}
          <rect x="124" y="58" width="30" height="82" fill="#818cf8" stroke="#1e3a8a" strokeWidth="2" />
          <polygon points="124,58 139,45 154,58" fill="#4f46e5" stroke="#1e3a8a" strokeWidth="2" />

          {/* Lit Windows */}
          <g fill="#fef08a" stroke="#1e3a8a" strokeWidth="1">
            <rect x="100" y="55" width="6" height="8" rx="1" />
            <rect x="114" y="55" width="6" height="8" rx="1" />
            <rect x="100" y="72" width="6" height="8" rx="1" />
            <rect x="114" y="72" width="6" height="8" rx="1" />
            <rect x="100" y="90" width="6" height="8" rx="1" />
            <rect x="114" y="90" width="6" height="8" rx="1" />

            <rect x="72" y="68" width="5" height="7" rx="1" fill="#ffffff" />
            <rect x="82" y="68" width="5" height="7" rx="1" />
            <rect x="72" y="82" width="5" height="7" rx="1" />
            <rect x="82" y="82" width="5" height="7" rx="1" fill="#ffffff" />

            <rect x="131" y="70" width="5" height="7" rx="1" />
            <rect x="141" y="70" width="5" height="7" rx="1" fill="#ffffff" />
            <rect x="131" y="84" width="5" height="7" rx="1" />
            <rect x="141" y="84" width="5" height="7" rx="1" />
          </g>

          {/* Foreground Trees */}
          <circle cx="48" cy="138" r="16" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <circle cx="72" cy="140" r="13" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
          <circle cx="150" cy="140" r="14" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
          <circle cx="174" cy="138" r="16" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
        </g>
      );

    case 1: // Classical Monument / Dome & Columns
      return (
        <g id="monument">
          {/* Base Steps */}
          <rect x="36" y="136" width="148" height="8" rx="2" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
          <rect x="44" y="130" width="132" height="7" rx="1.5" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
          
          {/* Columns */}
          <g fill="#f8fafc" stroke="#334155" strokeWidth="2">
            <rect x="54" y="75" width="14" height="55" rx="1" />
            <rect x="78" y="75" width="14" height="55" rx="1" />
            <rect x="103" y="75" width="14" height="55" rx="1" />
            <rect x="128" y="75" width="14" height="55" rx="1" />
            <rect x="152" y="75" width="14" height="55" rx="1" />
          </g>

          {/* Architrave & Pediment */}
          <rect x="46" y="67" width="128" height="9" rx="1.5" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
          <polygon points="44,67 110,38 176,67" fill="#cbd5e1" stroke="#334155" strokeWidth="2.5" />
          <circle cx="110" cy="55" r="5" fill="#fbbf24" stroke="#334155" strokeWidth="1.5" />

          {/* Dome on top */}
          <path d="M 85 38 C 85 16 135 16 135 38 Z" fill="#38bdf8" stroke="#334155" strokeWidth="2" />
          <line x1="110" y1="16" x2="110" y2="8" stroke="#334155" strokeWidth="3" strokeLinecap="round" />

          {/* Flanking Trees */}
          <circle cx="34" cy="132" r="14" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
          <circle cx="186" cy="132" r="14" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
        </g>
      );

    case 2: // Mountain Peaks & Evergreen Valley
      return (
        <g id="mountains">
          {/* Back Mountain */}
          <polygon points="30,145 110,30 190,145" fill="#94a3b8" stroke="#1e293b" strokeWidth="2.5" />
          {/* Snowcap Back */}
          <polygon points="110,30 92,62 100,58 110,68 120,58 128,62" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />

          {/* Left Mountain */}
          <polygon points="10,145 65,55 125,145" fill="#64748b" stroke="#1e293b" strokeWidth="2" />
          <polygon points="65,55 52,78 60,74 65,82 72,74 78,78" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />

          {/* Right Mountain */}
          <polygon points="95,145 155,50 215,145" fill="#475569" stroke="#1e293b" strokeWidth="2.5" />
          <polygon points="155,50 140,75 148,70 155,80 162,70 170,75" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />

          {/* Evergreen Pine Trees */}
          <g stroke="#064e3b" strokeWidth="1.5">
            <polygon points="40,145 48,118 56,145" fill="#047857" />
            <polygon points="42,130 48,110 54,130" fill="#059669" />

            <polygon points="60,148 70,115 80,148" fill="#047857" />
            <polygon points="63,128 70,105 77,128" fill="#10b981" />

            <polygon points="140,148 150,112 160,148" fill="#047857" />
            <polygon points="143,126 150,102 157,126" fill="#059669" />

            <polygon points="165,145 174,116 183,145" fill="#065f46" />
            <polygon points="167,128 174,108 181,128" fill="#10b981" />
          </g>
        </g>
      );

    case 3: // Coastal Palms & Ocean Shore
      return (
        <g id="coastal">
          {/* Waves */}
          <path d="M 20 144 Q 55 138 90 144 T 160 144 T 210 144" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 15 154 Q 60 148 110 154 T 205 154" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />

          {/* Distant Island with Light/Sailboat */}
          <path d="M 135 125 Q 165 118 190 125 Z" fill="#ca8a04" stroke="#713f12" strokeWidth="1.5" />
          <polygon points="160,120 160,102 172,118" fill="#ffffff" stroke="#713f12" strokeWidth="1.5" />
          <polygon points="159,120 159,106 150,118" fill="#f87171" stroke="#713f12" strokeWidth="1.5" />

          {/* Tropical Palm Tree Tall */}
          <g transform="translate(60, 60)">
            <path d="M 24 85 Q 38 40 22 0" fill="none" stroke="#78350f" strokeWidth="7" strokeLinecap="round" />
            <path d="M 22 0 Q 55 -20 65 10 Q 40 -5 22 0" fill="#15803d" stroke="#14532d" strokeWidth="2" />
            <path d="M 22 0 Q -15 -25 -25 5 Q 0 -10 22 0" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
            <path d="M 22 0 Q 30 -38 35 -10 Q 25 -18 22 0" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
            <path d="M 22 0 Q -5 -40 0 -12 Q 10 -20 22 0" fill="#15803d" stroke="#14532d" strokeWidth="2" />
            {/* Coconuts */}
            <circle cx="20" cy="4" r="3" fill="#78350f" />
            <circle cx="26" cy="4" r="3" fill="#78350f" />
          </g>

          {/* Smaller Palm */}
          <g transform="translate(100, 85) scale(0.75)">
            <path d="M 24 75 Q 36 35 22 0" fill="none" stroke="#78350f" strokeWidth="7" strokeLinecap="round" />
            <path d="M 22 0 Q 55 -20 60 10 Q 40 -5 22 0" fill="#15803d" stroke="#14532d" strokeWidth="2" />
            <path d="M 22 0 Q -15 -25 -20 5 Q 0 -10 22 0" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
            <path d="M 22 0 Q 30 -35 32 -8 Q 24 -15 22 0" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          </g>
        </g>
      );

    case 4: // Iconic Suspension Bridge & Waterway
      return (
        <g id="bridge">
          {/* Water */}
          <path d="M 20 148 Q 65 142 110 148 T 200 148" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 25 156 Q 70 150 115 156 T 195 156" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />

          {/* Bridge Roadway */}
          <rect x="25" y="112" width="170" height="6" fill="#e11d48" stroke="#881337" strokeWidth="2" />

          {/* Left Tower */}
          <rect x="68" y="38" width="16" height="85" fill="#f43f5e" stroke="#881337" strokeWidth="2.5" />
          <polygon points="66,38 76,24 86,38" fill="#e11d48" stroke="#881337" strokeWidth="2" />
          <rect x="72" y="55" width="8" height="14" fill="#881337" rx="1" />
          <rect x="72" y="80" width="8" height="14" fill="#881337" rx="1" />

          {/* Right Tower */}
          <rect x="136" y="38" width="16" height="85" fill="#f43f5e" stroke="#881337" strokeWidth="2.5" />
          <polygon points="134,38 144,24 154,38" fill="#e11d48" stroke="#881337" strokeWidth="2" />
          <rect x="140" y="55" width="8" height="14" fill="#881337" rx="1" />
          <rect x="140" y="80" width="8" height="14" fill="#881337" rx="1" />

          {/* Main Suspension Cables */}
          <path d="M 25 112 Q 46 80 76 38" fill="none" stroke="#881337" strokeWidth="2.5" />
          <path d="M 76 38 Q 110 96 144 38" fill="none" stroke="#881337" strokeWidth="3" />
          <path d="M 144 38 Q 174 80 195 112" fill="none" stroke="#881337" strokeWidth="2.5" />

          {/* Vertical Cables */}
          <g stroke="#881337" strokeWidth="1.5" opacity="0.8">
            <line x1="92" y1="78" x2="92" y2="112" />
            <line x1="104" y1="92" x2="104" y2="112" />
            <line x1="116" y1="92" x2="116" y2="112" />
            <line x1="128" y1="78" x2="128" y2="112" />
          </g>

          {/* Flanking Green Hills */}
          <path d="M 15 145 Q 35 125 55 145 Z" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <path d="M 165 145 Q 185 125 205 145 Z" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
        </g>
      );

    default: // Global Pin & Heritage Landmark
      return (
        <g id="heritage-pin">
          {/* Compass Rose / Radial rays */}
          <circle cx="110" cy="78" r="48" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />

          {/* Large Travel Pin */}
          <path d="M 110 32 C 86 32 68 50 68 74 C 68 96 110 134 110 134 C 110 134 152 96 152 74 C 152 50 134 32 110 32 Z" 
            fill="#ef4444" stroke="#7f1d1d" strokeWidth="3.5" />
          
          {/* Inner Pin circle */}
          <circle cx="110" cy="70" r="22" fill="#ffffff" stroke="#7f1d1d" strokeWidth="2.5" />
          
          {/* Monument inside pin */}
          <path d="M 100 82 V 70 C 100 64 120 64 120 70 V 82 Z" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.5" />
          <polygon points="98,70 110,58 122,70" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
          <circle cx="110" cy="54" r="2" fill="#fbbf24" />

          {/* Foliage Base */}
          <circle cx="50" cy="136" r="16" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
          <circle cx="75" cy="138" r="14" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <circle cx="145" cy="138" r="14" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <circle cx="170" cy="136" r="16" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
        </g>
      );
  }
}

/**
 * Procedural SVG Die-Cut Travel Sticker
 */
export function ProceduralSticker({ locationName = 'Location' }) {
  const cleanName = locationName.trim();
  const seed = hashString(cleanName.toLowerCase());
  const palette = PALETTES[seed % PALETTES.length];
  
  // Specific match or deterministic landmark
  const isMumbai = cleanName.toLowerCase().includes('mumbai');
  const landmarkType = isMumbai ? 'mumbai' : (seed % 6);

  // Shorten name if very long for badge aesthetic
  const displayName = cleanName.toUpperCase();
  const fontSize = displayName.length > 12 ? 18 : displayName.length > 8 ? 21 : 24;

  return (
    <div className="relative w-full h-full flex items-center justify-center p-1 select-none pointer-events-none">
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full max-h-[160px] object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Soft Pastel Sky Gradient */}
          <linearGradient id={`skyGrad-${seed}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.skyTop} />
            <stop offset="100%" stopColor={palette.skyBottom} />
          </linearGradient>

          {/* Die-Cut Outer Drop Shadow Filter */}
          <filter id={`stickerShadow-${seed}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.14" />
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* ================= STICKER WHITE DIE-CUT BASE ================= */}
        {/* Layer 1: Die-cut white border blob container */}
        <g filter={`url(#stickerShadow-${seed})`}>
          {/* Irregular die-cut blob silhouette with thick crisp white border */}
          <path
            d="
              M 40,95
              C 35,50 65,22 120,22
              C 175,22 205,50 200,95
              C 208,120 216,145 205,170
              C 198,188 180,195 160,195
              L 80,195
              C 60,195 42,188 35,170
              C 24,145 32,120 40,95
              Z
            "
            fill="#ffffff"
            stroke="#ffffff"
            strokeWidth="10"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>

        {/* Layer 2: Pastel Sky Dome Shape */}
        <g>
          <clipPath id={`skyClip-${seed}`}>
            <path
              d="
                M 44,96
                C 40,54 68,28 120,28
                C 172,28 200,54 196,96
                C 202,122 205,148 196,168
                L 44,168
                C 35,148 38,122 44,96
                Z
              "
            />
          </clipPath>

          <g clipPath={`url(#skyClip-${seed})`}>
            {/* Sky Background */}
            <rect x="20" y="10" width="200" height="170" fill={`url(#skyGrad-${seed})`} />

            {/* Pastel Sun / Sun Glow */}
            <circle cx="155" cy="62" r="28" fill={palette.sunGlow} opacity="0.6" />
            <circle cx="155" cy="62" r="18" fill={palette.sunColor} />

            {/* Fluffy Clouds */}
            <g fill="#ffffff" opacity="0.85">
              <path d="M 50 56 Q 58 46 70 50 Q 82 44 92 54 Q 100 56 98 64 Q 50 64 50 56 Z" />
              <path d="M 148 90 Q 155 82 165 85 Q 174 80 182 88 Q 188 90 186 96 Q 148 96 148 90 Z" opacity="0.7" />
            </g>

            {/* Vector Landmark */}
            {renderLandmarkGraphic(landmarkType, seed)}

            {/* Ground Baseline */}
            <path d="M 25 152 Q 75 142 120 150 T 215 148 L 215 170 L 25 170 Z" fill={palette.ground1} stroke="#14532d" strokeWidth="2" />
            <path d="M 25 159 Q 80 152 130 160 T 215 157 L 215 170 L 25 170 Z" fill={palette.ground2} />
          </g>
        </g>

        {/* Layer 3: Inner Contour Border */}
        <path
          d="
            M 44,96
            C 40,54 68,28 120,28
            C 172,28 200,54 196,96
            C 202,122 205,148 196,168
            L 44,168
            C 35,148 38,122 44,96
            Z
          "
          fill="none"
          stroke="#1e293b"
          strokeWidth="3"
        />

        {/* ================= BOLD CHUNKY LOCATION TEXT BANNER ================= */}
        <g id="text-banner">
          {/* Banner Pill Container */}
          <path
            d="
              M 36 172
              C 36 160 52 152 70 152
              L 170 152
              C 188 152 204 160 204 172
              C 204 186 188 198 170 198
              L 70 198
              C 52 198 36 186 36 172
              Z
            "
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3"
          />

          {/* Chunky Text with Outline */}
          {/* Shadow/Stroke Layer */}
          <text
            x="120"
            y="182"
            textAnchor="middle"
            dominantBaseline="central"
            fill={palette.text1}
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinejoin="round"
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 900,
              fontSize: `${fontSize}px`,
              letterSpacing: '0.04em',
            }}
          >
            {displayName}
          </text>
          
          {/* Top Layer Colored Fill */}
          <text
            x="120"
            y="182"
            textAnchor="middle"
            dominantBaseline="central"
            fill={palette.text1}
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 900,
              fontSize: `${fontSize}px`,
              letterSpacing: '0.04em',
            }}
          >
            {displayName}
          </text>
        </g>
      </svg>
    </div>
  );
}

/**
 * Main LocationSticker Component
 * Automatically switches between hand-crafted PNG and auto-generated die-cut sticker
 */
export default function LocationSticker({ locationName, className = '' }) {
  const sticker = getLocationSticker(locationName);

  if (sticker?.image) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center p-2 select-none group-hover:scale-105 group-hover:rotate-1 transition-transform duration-300 ${className}`}>
        <img
          src={sticker.image}
          alt={locationName || sticker.name}
          className="w-full h-full max-h-[160px] object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.14)]"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      <ProceduralSticker locationName={locationName || 'Location'} />
    </div>
  );
}
