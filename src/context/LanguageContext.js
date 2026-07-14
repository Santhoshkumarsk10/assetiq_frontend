'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const LanguageContext = createContext(null);

const translations = {
  en: {
    dashboard: 'Dashboard',
    assets: 'Assets',
    locations: 'Locations',
    users: 'Users',
    onboarding: 'Onboarding',
    rolesPermissions: 'Roles & Permissions',
    auditLogs: 'Audit Logs',
    reports: 'Reports',
    logout: 'Logout',
    profile: 'Profile',
    license: 'License',
    welcomeBack: 'Welcome back',
    systemOverview: "Here's your system overview",
    liveOverview: 'Live Overview',
    totalAssets: 'Total Assets',
    activeAssets: 'Active Assets',
    assigned: 'Assigned',
    needAttention: 'Need Attention',
    assetsStatus: 'Assets by Status',
    usersOnboarding: 'Users & Onboarding',
    recentActivity: 'Recent Activity Logs',
    searchPlaceholder: 'Search assets, users, logs...',
    loadingAnalytics: 'Loading dashboard analytics...',
    noAssetData: 'No asset distribution data available',
    noActivityLogs: 'No activity logs recorded yet',
    activeUsers: 'Active Users',
    pending: 'Pending',
    language: 'Language',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    assets: 'संपत्तियां',
    locations: 'स्थान',
    users: 'उपयोगकर्ता',
    onboarding: 'ऑनबोर्डिंग',
    rolesPermissions: 'भूमिकाएं और अनुमतियां',
    auditLogs: 'ऑडिट लॉग्स',
    reports: 'रिपोर्ट्स',
    logout: 'लॉगआउट',
    profile: 'प्रोफाइल',
    license: 'लाइसेंस',
    welcomeBack: 'वापसी पर आपका स्वागत है',
    systemOverview: 'यहाँ आपका सिस्टम अवलोकन है',
    liveOverview: 'लाइव अवलोकन',
    totalAssets: 'कुल संपत्तियां',
    activeAssets: 'सक्रिय संपत्तियां',
    assigned: 'आवंटित',
    needAttention: 'ध्यान देने की आवश्यकता',
    assetsStatus: 'स्थिति के अनुसार संपत्तियां',
    usersOnboarding: 'उपयोगकर्ता और ऑनबोर्डिंग',
    recentActivity: 'हालिया गतिविधि लॉग',
    searchPlaceholder: 'संपत्तियां, उपयोगकर्ता, लॉग खोजें...',
    loadingAnalytics: 'डैशबोर्ड विश्लेषण लोड हो रहा है...',
    noAssetData: 'कोई संपत्ति वितरण डेटा उपलब्ध नहीं है',
    noActivityLogs: 'अभी तक कोई गतिविधि लॉग दर्ज नहीं की गई है',
    activeUsers: 'सक्रिय उपयोगकर्ता',
    pending: 'लंबित',
    language: 'भाषा',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    assets: 'சொத்துக்கள்',
    locations: 'இடங்கள்',
    users: 'பயனர்கள்',
    onboarding: 'ஆன்போர்டிங்',
    rolesPermissions: 'பணிகள் & அனுமதிகள்',
    auditLogs: 'தணிக்கை பதிவுகள்',
    reports: 'அறிக்கைகள்',
    logout: 'வெளியேறு',
    profile: 'சுயவிவரம்',
    license: 'உரிமம்',
    welcomeBack: 'மீண்டும் வருக',
    systemOverview: 'உங்கள் கணினி மேலோட்டம் இதோ',
    liveOverview: 'நேரடி மேலோட்டம்',
    totalAssets: 'மொத்த சொத்துக்கள்',
    activeAssets: 'செயலில் உள்ள சொத்துக்கள்',
    assigned: 'ஒதுக்கப்பட்டவை',
    needAttention: 'கமனிப்பு தேவைப்படுபவை',
    assetsStatus: 'நிலையின்படி சொத்துக்கள்',
    usersOnboarding: 'பயனர்கள் & ஆன்போர்டிங்',
    recentActivity: 'சமீபத்திய செயல்பாட்டு பதிவுகள்',
    searchPlaceholder: 'சொத்துக்கள், பயனர்கள், பதிவுகளைத் தேடுங்கள்...',
    loadingAnalytics: 'டாஷ்போர்டு பகுப்பாய்வு ஏற்றப்படுகிறது...',
    noAssetData: 'சொத்து விநியோக தரவு இல்லை',
    noActivityLogs: 'செயல்பாட்டு பதிவுகள் எதுவும் இல்லை',
    activeUsers: 'செயலில் உள்ள பயனர்கள்',
    pending: 'நிலுவையில் உள்ளது',
    language: 'மொழி',
  },
  ms: {
    dashboard: 'Papan Pemuka',
    assets: 'Aset',
    locations: 'Lokasi',
    users: 'Pengguna',
    onboarding: 'Kemasukan',
    rolesPermissions: 'Peranan & Kebenaran',
    auditLogs: 'Log Audit',
    reports: 'Laporan',
    logout: 'Log Keluar',
    profile: 'Profil',
    license: 'Lesen',
    welcomeBack: 'Selamat kembali',
    systemOverview: 'Ini adalah gambaran keseluruhan sistem anda',
    liveOverview: 'Gambaran Keseluruhan Langsung',
    totalAssets: 'Jumlah Aset',
    activeAssets: 'Aset Aktif',
    assigned: 'Diperuntukkan',
    needAttention: 'Perlu Perhatian',
    assetsStatus: 'Aset mengikut Status',
    usersOnboarding: 'Pengguna & Kemasukan',
    recentActivity: 'Log Aktiviti Terkini',
    searchPlaceholder: 'Cari aset, pengguna, log...',
    loadingAnalytics: 'Memuatkan analisis papan pemuka...',
    noAssetData: 'Tiada data pengedaran aset tersedia',
    noActivityLogs: 'Tiada log aktiviti direkodkan lagi',
    activeUsers: 'Pengguna Aktif',
    pending: 'Belum Selesai',
    language: 'Bahasa',
  },
  sw: {
    dashboard: 'Tabuta ya Dashboard',
    assets: 'Mali',
    locations: 'Maeneo',
    users: 'Watumiaji',
    onboarding: 'Kuingiza',
    rolesPermissions: 'Majukumu na Ruhusa',
    auditLogs: 'Kumbukumbu za Ukaguzi',
    reports: 'Ripoti',
    logout: 'Ondoka',
    profile: 'Wasifu',
    license: 'Leseni',
    welcomeBack: 'Karibu tena',
    systemOverview: 'Huu hapa muhtasari wa mfumo wako',
    liveOverview: 'Muhtasari wa Moja kwa Moja',
    totalAssets: 'Jumla ya Mali',
    activeAssets: 'Mali Zinazotumika',
    assigned: 'Zilizogawiwa',
    needAttention: 'Inahitaji Uangalifu',
    assetsStatus: 'Mali kwa Hali',
    usersOnboarding: 'Watumiaji & Kuingiza',
    recentActivity: 'Kumbukumbu za Shughuli za Hivi Karibuni',
    searchPlaceholder: 'Tafuta mali, watumiaji, kumbukumbu...',
    loadingAnalytics: 'Inapakia uchanganuzi wa dashboard...',
    noAssetData: 'Hakuna data ya usambazaji wa mali inayopatikana',
    noActivityLogs: 'Hakuna kumbukumbu za shughuli zilizorekodiwa bado',
    activeUsers: 'Watumiaji Amilifu',
    pending: 'Inasubiri',
    language: 'Lugha',
  },
  ar: {
    dashboard: 'لوحة القيادة',
    assets: 'الأصول',
    locations: 'المواقع',
    users: 'المستخدمين',
    onboarding: 'التهيئة والتدريب',
    rolesPermissions: 'الأدوار والأذونات',
    auditLogs: 'سجلات التدقيق',
    reports: 'التقارير',
    logout: 'تسجيل الخروج',
    profile: 'الملف الشخصي',
    license: 'الترخيص',
    welcomeBack: 'مرحباً بك مجدداً',
    systemOverview: 'إليك نظرة عامة على النظام الخاص بك',
    liveOverview: 'نظرة عامة مباشرة',
    totalAssets: 'إجمالي الأصول',
    activeAssets: 'الأصول النشطة',
    assigned: 'مخصص',
    needAttention: 'بحاجة إلى اهتمام',
    assetsStatus: 'الأصول حسب الحالة',
    usersOnboarding: 'المستخدمين والتهيئة',
    recentActivity: 'سجلات النشاط الأخيرة',
    searchPlaceholder: 'البحث عن الأصول، المستخدمين، السجلات...',
    loadingAnalytics: 'جاري تحميل تحليلات لوحة القيادة...',
    noAssetData: 'لا توجد بيانات متاحة لتوزيع الأصول',
    noActivityLogs: 'لم يتم تسجيل أي سجلات نشاط بعد',
    activeUsers: 'المستخدمين النشطين',
    pending: 'قيد الانتظار',
    language: 'اللغة',
  }
};

const mapLocationToLang = (locationName) => {
  if (!locationName) return null;
  const name = locationName.toLowerCase().trim();
  if (name.includes('chennai')) return 'ta';
  if (name.includes('mumbai')) return 'hi';
  if (name.includes('difc') || name.includes('dubai') || name.includes('uae')) return 'ar';
  if (name.includes('kenya')) return 'sw';
  if (name.includes('malaysia')) return 'ms';
  if (name.includes('london') || name.includes('uk')) return 'en';
  return null;
};

const detectTimezoneLanguage = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Kolkata')) return 'hi'; // Default India to Hindi as broad guess
    if (tz.includes('Kuala_Lumpur')) return 'ms';
    if (tz.includes('Nairobi')) return 'sw';
    if (tz.includes('Dubai') || tz.includes('Riyadh')) return 'ar';
    if (tz.includes('London') || tz.includes('Europe')) return 'en';
  } catch (e) {
    // ignore
  }
  return null;
};

const detectBrowserLanguage = () => {
  try {
    const lang = navigator.language || navigator.userLanguage;
    if (lang.startsWith('hi')) return 'hi';
    if (lang.startsWith('ta')) return 'ta';
    if (lang.startsWith('ms')) return 'ms';
    if (lang.startsWith('sw')) return 'sw';
    if (lang.startsWith('ar')) return 'ar';
    if (lang.startsWith('en')) return 'en';
  } catch (e) {
    // ignore
  }
  return null;
};

const detectIpLanguage = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    const country = data.country_code;
    if (country === 'IN') return 'hi';
    if (country === 'MY') return 'ms';
    if (country === 'KE') return 'sw';
    if (country === 'AE') return 'ar';
    if (country === 'GB') return 'en';
  } catch (e) {
    // ignore
  }
  return null;
};

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const manualLang = localStorage.getItem('assetiq_lang');
      if (manualLang) return manualLang;
    }
    return 'en';
  });

  useEffect(() => {
    const manualLang = localStorage.getItem('assetiq_lang');
    if (!manualLang && user) {
      const locLang = mapLocationToLang(user.location) || detectTimezoneLanguage() || detectBrowserLanguage();
      if (locLang) {
        setTimeout(() => {
          setLanguage(prev => (prev !== locLang ? locLang : prev));
        }, 0);
      } else {
        detectIpLanguage().then(ipLang => {
          if (ipLang) {
            setTimeout(() => {
              setLanguage(prev => (prev !== ipLang ? ipLang : prev));
            }, 0);
          }
        });
      }
    } else if (!manualLang && !user) {
      setTimeout(() => {
        setLanguage(prev => (prev !== 'en' ? 'en' : prev));
      }, 0);
    }
  }, [user]);


  const changeLanguage = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('assetiq_lang', langCode);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
