export const locationStickers = {
  bangalore: {
    name: 'Bangalore',
    country: 'India',
    image: '/images/stickers/bangalore.png',
    accent: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  bngalore: {
    name: 'Bangalore',
    country: 'India',
    image: '/images/stickers/bangalore.png',
    accent: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  chennai: {
    name: 'Chennai',
    country: 'India',
    image: '/images/stickers/chennai.png',
    accent: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  dubai: {
    name: 'Dubai',
    country: 'UAE',
    image: '/images/stickers/dubai.png',
    accent: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  difc: {
    name: 'DIFC',
    country: 'UAE',
    image: '/images/stickers/dubai.png',
    accent: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  kenya: {
    name: 'Kenya',
    country: 'Kenya',
    image: '/images/stickers/kenya.png',
    accent: '#16a34a',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  nairobi: {
    name: 'Nairobi',
    country: 'Kenya',
    image: '/images/stickers/kenya.png',
    accent: '#16a34a',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  malaysia: {
    name: 'Malaysia',
    country: 'Malaysia',
    image: '/images/stickers/malaysia.png',
    accent: '#7c3aed',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  kl: {
    name: 'KL Malaysia',
    country: 'Malaysia',
    image: '/images/stickers/malaysia.png',
    accent: '#7c3aed',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  london: {
    name: 'London',
    country: 'UK',
    image: '/images/stickers/london.png',
    accent: '#dc2626',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  mumbai: {
    name: 'Mumbai',
    country: 'India',
    image: '/images/stickers/mumbai.png',
    accent: '#d97706',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export const getLocationSticker = (name) => {
  if (!name) return null;
  const cleanName = name.toLowerCase().trim();

  // Exact or word match prioritized
  for (const [key, val] of Object.entries(locationStickers)) {
    if (cleanName.includes(key)) {
      return val;
    }
  }
  return {
    name: name.trim(),
    country: null,
    image: null,
    accent: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
};
