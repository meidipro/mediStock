import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language translations
export const translations = {
  en: {
    // Common
    welcome: 'Welcome',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    
    // Navigation
    dashboard: 'Dashboard',
    medicines: 'Medicines',
    inventory: 'Inventory',
    aiDoctor: 'AI Doctor',
    reports: 'Reports',
    
    // Dashboard
    todayRevenue: "Today's Revenue",
    totalSales: 'Total Sales',
    lowStockItems: 'Low Stock Items',
    totalCustomers: 'Total Customers',
    dueAmount: 'Due Amount',
    recentSales: 'Recent Sales',
    topMedicines: 'Top Selling Medicines',
    quickActions: 'Quick Actions',
    pharmacyOverview: 'Pharmacy Overview',
    
    // Medicines
    medicineName: 'Medicine Name',
    genericName: 'Generic Name',
    brandName: 'Brand Name',
    category: 'Category',
    manufacturer: 'Manufacturer',
    price: 'Price',
    stock: 'Stock',
    expiry: 'Expiry Date',
    addMedicine: 'Add Medicine',
    editMedicine: 'Edit Medicine',
    deleteMedicine: 'Delete Medicine',
    
    // Inventory
    currentStock: 'Current Stock',
    reorderLevel: 'Reorder Level',
    lastUpdated: 'Last Updated',
    stockStatus: 'Stock Status',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    
    // Sales
    saleDate: 'Sale Date',
    customerName: 'Customer Name',
    totalAmount: 'Total Amount',
    paidAmount: 'Paid Amount',
    paymentStatus: 'Payment Status',
    paid: 'Paid',
    due: 'Due',
    partial: 'Partial',
    
    // AI Doctor Screen
    aiDoctorTitle: 'AI Doctor Assistant',
    aiDoctorSubtitle: 'Professional medical guidance for your pharmacy',
    welcomeMessage: "I'm your AI Medical Assistant, ready to help with professional medical guidance",
    
    // Medical Categories
    commonMedicines: '💊 Common Medicines',
    symptomTreatment: '🩺 Symptom Treatment', 
    drugSafety: '⚠️ Drug Safety',
    professionalGuidance: '🏥 Professional Guidance',
    
    // Sample Queries
    paracetamolUsage: 'What is Paracetamol used for and safe dosage?',
    aspirinSideEffects: 'Tell me about Aspirin side effects',
    napaInfo: 'Napa tablet: uses, dosage, and precautions',
    amoxicillinPrescribe: 'Amoxicillin antibiotic: when to prescribe?',
    
    feverTreatment: 'Best treatment for fever and body ache',
    stomachPainMedicines: 'What medicines help with stomach pain?',
    coldCoughTreatment: 'Treatment options for cold and cough',
    bloodPressureTreatment: 'How to treat high blood pressure?',
    
    drugInteractionCheck: 'Check drug interactions between medicines',
    diabeticSafeMedicines: 'Safe medicines for diabetic patients',
    pregnancyMedicines: 'What medicines to avoid during pregnancy?',
    dangerousCombinations: 'Dangerous drug combinations to watch',
    
    referToSpecialist: 'When to refer patient to specialist?',
    emergencyProtocols: 'Emergency medicine protocols',
    dosageCalculation: 'Proper dosage calculation methods',
    patientCounseling: 'Patient counseling best practices',
    
    // Input and Actions
    inputPlaceholder: 'Ask me about medicines, symptoms, or business...',
    speak: 'Speak',
    listening: 'Listening...',
    aiAnalyzing: 'AI Doctor is analyzing...',
    
    // Voice Messages
    voiceInputError: 'Voice Input Error',
    voiceInputErrorMessage: 'Sorry, could not hear your voice. Please try again.',
    voiceInput: 'Voice Input',
    voiceInputComingSoon: 'Voice input feature coming soon. Please type your message for now.',
    voiceOutput: 'Voice Output',
    voiceOutputComingSoon: 'Voice output feature coming soon.',
    error: 'Error',
    voiceRecognitionError: 'Could not start voice recognition.',
    
    pharmacyStatus: 'Your Pharmacy Status',
  },
  
  bn: {
    // Common
    welcome: 'স্বাগতম',
    loading: 'লোড হচ্ছে...',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    delete: 'মুছে ফেলুন',
    edit: 'সম্পাদনা',
    add: 'যোগ করুন',
    search: 'অনুসন্ধান',
    filter: 'ফিল্টার',
    sort: 'সাজান',
    ok: 'ঠিক আছে',
    yes: 'হ্যাঁ',
    no: 'না',
    
    // Navigation
    dashboard: 'ড্যাশবোর্ড',
    medicines: 'ওষুধপত্র',
    inventory: 'ইনভেন্টরি',
    aiDoctor: 'এআই ডাক্তার',
    reports: 'রিপোর্ট',
    
    // Dashboard
    todayRevenue: 'আজকের আয়',
    totalSales: 'মোট বিক্রয়',
    lowStockItems: 'কম স্টক পণ্য',
    totalCustomers: 'মোট গ্রাহক',
    dueAmount: 'বাকি পরিমাণ',
    recentSales: 'সাম্প্রতিক বিক্রয়',
    topMedicines: 'শীর্ষ বিক্রিত ওষুধ',
    quickActions: 'দ্রুত কার্যাবলী',
    pharmacyOverview: 'ফার্মেসি সংক্ষিপ্ত বিবরণ',
    
    // Medicines
    medicineName: 'ওষুধের নাম',
    genericName: 'জেনেরিক নাম',
    brandName: 'ব্র্যান্ড নাম',
    category: 'শ্রেণী',
    manufacturer: 'প্রস্তুতকারক',
    price: 'দাম',
    stock: 'স্টক',
    expiry: 'মেয়াদ শেষের তারিখ',
    addMedicine: 'ওষুধ যোগ করুন',
    editMedicine: 'ওষুধ সম্পাদনা করুন',
    deleteMedicine: 'ওষুধ মুছে ফেলুন',
    
    // Inventory
    currentStock: 'বর্তমান স্টক',
    reorderLevel: 'পুনর্বার অর্ডারের মাত্রা',
    lastUpdated: 'সর্বশেষ আপডেট',
    stockStatus: 'স্টকের অবস্থা',
    inStock: 'স্টকে আছে',
    lowStock: 'কম স্টক',
    outOfStock: 'স্টকে নেই',
    
    // Sales
    saleDate: 'বিক্রয়ের তারিখ',
    customerName: 'গ্রাহকের নাম',
    totalAmount: 'মোট পরিমাণ',
    paidAmount: 'প্রদত্ত পরিমাণ',
    paymentStatus: 'পেমেন্টের অবস্থা',
    paid: 'প্রদত্ত',
    due: 'বাকি',
    partial: 'আংশিক',
    
    // AI Doctor Screen
    aiDoctorTitle: 'এআই ডাক্তার সহায়ক',
    aiDoctorSubtitle: 'আপনার ফার্মেসির জন্য পেশাদার চিকিৎসা পরামর্শ',
    welcomeMessage: "আমি আপনার এআই মেডিকেল সহায়ক, পেশাদার চিকিৎসা পরামর্শ দিতে প্রস্তুত",
    
    // Medical Categories
    commonMedicines: '💊 সাধারণ ওষুধপত্র',
    symptomTreatment: '🩺 লক্ষণভিত্তিক চিকিৎসা',
    drugSafety: '⚠️ ওষুধের নিরাপত্তা',
    professionalGuidance: '🏥 পেশাদার পরামর্শ',
    
    // Sample Queries  
    paracetamolUsage: 'প্যারাসিটামল কীভাবে ব্যবহার করবেন এবং নিরাপদ মাত্রা?',
    aspirinSideEffects: 'অ্যাসপিরিনের পার্শ্বপ্রতিক্রিয়া সম্পর্কে বলুন',
    napaInfo: 'নাপা ট্যাবলেট: ব্যবহার, মাত্রা এবং সতর্কতা',
    amoxicillinPrescribe: 'অ্যামোক্সিসিলিন অ্যান্টিবায়োটিক: কখন দিতে হবে?',
    
    feverTreatment: 'জ্বর ও শরীর ব্যথার সেরা চিকিৎসা',
    stomachPainMedicines: 'পেট ব্যথার জন্য কোন ওষুধ সাহায্য করে?',
    coldCoughTreatment: 'সর্দি-কাশির চিকিৎসার বিকল্পসমূহ',
    bloodPressureTreatment: 'উচ্চ রক্তচাপের চিকিৎসা কীভাবে করবেন?',
    
    drugInteractionCheck: 'ওষুধের মধ্যে মিথস্ক্রিয়া পরীক্ষা করুন',
    diabeticSafeMedicines: 'ডায়াবেটিক রোগীদের জন্য নিরাপদ ওষুধ',
    pregnancyMedicines: 'গর্ভাবস্থায় কোন ওষুধ এড়াতে হবে?',
    dangerousCombinations: 'বিপজ্জনক ওষুধের সংমিশ্রণ দেখুন',
    
    referToSpecialist: 'কখন রোগীকে বিশেষজ্ঞের কাছে পাঠাবেন?',
    emergencyProtocols: 'জরুরি ওষুধের নিয়মাবলী',
    dosageCalculation: 'সঠিক মাত্রা গণনার পদ্ধতি',
    patientCounseling: 'রোগী পরামর্শের সেরা অনুশীলন',
    
    // Input and Actions
    inputPlaceholder: 'ওষুধ, লক্ষণ বা ব্যবসা সম্পর্কে জিজ্ঞাসা করুন...',
    speak: 'কথা বলুন',
    listening: 'শুনছি...',
    aiAnalyzing: 'এআই ডাক্তার বিশ্লেষণ করছেন...',
    
    // Voice Messages
    voiceInputError: 'ভয়েস ইনপুট ত্রুটি',
    voiceInputErrorMessage: 'দুঃখিত, আপনার কণ্ঠস্বর শুনতে পাচ্ছি না। আবার চেষ্টা করুন।',
    voiceInput: 'ভয়েস ইনপুট',
    voiceInputComingSoon: 'ভয়েস ইনপুট বৈশিষ্ট্য শীঘ্রই আসছে। এখন টাইপ করে লিখুন।',
    voiceOutput: 'ভয়েস আউটপুট',
    voiceOutputComingSoon: 'ভয়েস আউটপুট বৈশিষ্ট্য শীঘ্রই আসছে।',
    error: 'ত্রুটি',
    voiceRecognitionError: 'ভয়েস রিকগনিশন শুরু করতে পারছি না।',
    
    pharmacyStatus: 'আপনার ফার্মেসির অবস্থা',
  },
};

export type Language = 'en' | 'bn';
export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on app start
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'bn')) {
        setLanguageState(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('app_language', lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Language detection helper
export const detectLanguage = (text: string): Language => {
  // Simple Bengali character detection
  const bengaliPattern = /[\u0980-\u09FF]/;
  return bengaliPattern.test(text) ? 'bn' : 'en';
};

export default LanguageContext;