/**
 * Bangladesh Medicine Knowledge Base
 * Comprehensive database of medicines available in Bangladesh
 * Including brand names, generic names, manufacturers, and classifications
 * 
 * Now enhanced with 1000+ medicines across all therapeutic categories
 */

import { MasterDatabaseService, masterMedicineDatabase } from './medicine-database-master';

export interface MedicineKnowledgeEntry {
  id: string;
  generic_name: string;
  brand_name: string;
  generic_name_bn?: string; // Bengali generic name
  brand_name_bn?: string; // Bengali brand name
  manufacturer: string;
  manufacturer_bn?: string; // Bengali manufacturer name
  strength: string;
  form: string; // tablet, syrup, injection, etc.
  form_bn?: string; // Bengali form
  therapeutic_class: string;
  therapeutic_class_bn?: string; // Bengali therapeutic class
  indication: string[];
  indication_bn?: string[]; // Bengali indications
  alternatives: string[]; // Alternative brand names for same generic
  price_range: {
    min: number;
    max: number;
  };
  prescription_required: boolean;
  common_dosage: string;
  common_dosage_bn?: string; // Bengali dosage
  side_effects: string[];
  side_effects_bn?: string[]; // Bengali side effects
  contraindications: string[];
  contraindications_bn?: string[]; // Bengali contraindications
  drug_interactions: string[];
  drug_interactions_bn?: string[]; // Bengali drug interactions
  // New missing fields
  storage_instructions: string;
  storage_instructions_bn?: string; // Bengali storage instructions
  warnings_precautions: string[];
  warnings_precautions_bn?: string[]; // Bengali warnings
  pregnancy_lactation: {
    pregnancy_category: 'A' | 'B' | 'C' | 'D' | 'X';
    pregnancy_info: string;
    lactation_info: string;
    pregnancy_info_bn?: string; // Bengali pregnancy info
    lactation_info_bn?: string; // Bengali lactation info
  };
  product_images?: string[]; // Array of image URLs
  keywords_bn?: string[]; // Bengali search keywords
}

export const bangladeshMedicineDatabase: MedicineKnowledgeEntry[] = [
  // Pain Relief & Fever
  {
    id: "para-001",
    generic_name: "Paracetamol",
    brand_name: "Napa",
    generic_name_bn: "প্যারাসিটামল",
    brand_name_bn: "নাপা",
    manufacturer: "Beximco Pharmaceuticals",
    manufacturer_bn: "বেক্সিমকো ফার্মাসিউটিক্যালস",
    strength: "500mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Analgesic & Antipyretic",
    therapeutic_class_bn: "ব্যথানাশক ও জ্বর নাশক",
    indication: ["Pain relief", "Fever reduction", "Headache", "Body ache"],
    indication_bn: ["ব্যথা উপশম", "জ্বর কমানো", "মাথাব্যথা", "শরীর ব্যথা"],
    alternatives: ["Ace", "Fast", "Panadol", "Fevex", "Reset"],
    price_range: { min: 1.5, max: 3.0 },
    prescription_required: false,
    common_dosage: "1-2 tablets 3-4 times daily",
    common_dosage_bn: "দিনে ৩-৪ বার ১-২ টি ট্যাবলেট",
    side_effects: ["Nausea", "Skin rash (rare)", "Liver toxicity (overdose)"],
    side_effects_bn: ["বমি বমি ভাব", "চামড়ায় র‍্যাশ (বিরল)", "লিভারের ক্ষতি (অতিরিক্ত সেবনে)"],
    contraindications: ["Severe liver disease", "Alcohol dependency"],
    contraindications_bn: ["গুরুতর লিভার রোগ", "মদ্যাসক্তি"],
    drug_interactions: ["Warfarin", "Isoniazid", "Carbamazepine"],
    drug_interactions_bn: ["ওয়ারফেরিন", "আইসোনিয়াজিড", "কার্বামাজিপাইন"],
    storage_instructions: "Store in a cool, dry place below 30°C. Keep away from light and moisture.",
    storage_instructions_bn: "৩০° সেলসিয়াসের নিচে ঠাণ্ডা, শুকনো জায়গায় রাখুন। আলো ও আর্দ্রতা থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Do not exceed recommended dose",
      "Avoid alcohol during treatment",
      "Consult doctor if symptoms persist"
    ],
    warnings_precautions_bn: [
      "নির্ধারিত মাত্রার বেশি সেবন করবেন না",
      "চিকিৎসার সময় মদ্যপান এড়িয়ে চলুন",
      "লক্ষণ অব্যাহত থাকলে ডাক্তারের পরামর্শ নিন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "B",
      pregnancy_info: "Safe to use during pregnancy when used as directed",
      lactation_info: "Safe during breastfeeding",
      pregnancy_info_bn: "নির্দেশনা অনুযায়ী ব্যবহার করলে গর্ভাবস্থায় নিরাপদ",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় নিরাপদ"
    },
    product_images: [
      "/images/medicines/napa-500mg.jpg",
      "/images/medicines/napa-package.jpg"
    ],
    keywords_bn: ["নাপা", "প্যারাসিটামল", "ব্যথা", "জ্বর", "মাথাব্যথা"]
  },
  {
    id: "para-002",
    generic_name: "Paracetamol",
    brand_name: "Ace",
    generic_name_bn: "প্যারাসিটামল",
    brand_name_bn: "এস",
    manufacturer: "Square Pharmaceuticals",
    manufacturer_bn: "স্কয়ার ফার্মাসিউটিক্যালস",
    strength: "500mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Analgesic & Antipyretic",
    therapeutic_class_bn: "ব্যথানাশক ও জ্বর নাশক",
    indication: ["Pain relief", "Fever reduction", "Headache", "Body ache"],
    indication_bn: ["ব্যথা উপশম", "জ্বর কমানো", "মাথাব্যথা", "শরীর ব্যথা"],
    alternatives: ["Napa", "Fast", "Panadol", "Fevex", "Reset"],
    price_range: { min: 1.2, max: 2.8 },
    prescription_required: false,
    common_dosage: "1-2 tablets 3-4 times daily",
    common_dosage_bn: "দিনে ৩-৪ বার ১-২ টি ট্যাবলেট",
    side_effects: ["Nausea", "Skin rash (rare)", "Liver toxicity (overdose)"],
    side_effects_bn: ["বমি বমি ভাব", "চামড়ায় র‍্যাশ (বিরল)", "লিভারের ক্ষতি (অতিরিক্ত সেবনে)"],
    contraindications: ["Severe liver disease", "Alcohol dependency"],
    contraindications_bn: ["গুরুতর লিভার রোগ", "মদ্যাসক্তি"],
    drug_interactions: ["Warfarin", "Isoniazid", "Carbamazepine"],
    drug_interactions_bn: ["ওয়ারফেরিন", "আইসোনিয়াজিড", "কার্বামাজিপাইন"],
    storage_instructions: "Store in a cool, dry place below 30°C. Keep away from light and moisture.",
    storage_instructions_bn: "৩০° সেলসিয়াসের নিচে ঠাণ্ডা, শুকনো জায়গায় রাখুন। আলো ও আর্দ্রতা থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Do not exceed recommended dose",
      "Avoid alcohol during treatment",
      "Consult doctor if symptoms persist"
    ],
    warnings_precautions_bn: [
      "নির্ধারিত মাত্রার বেশি সেবন করবেন না",
      "চিকিৎসার সময় মদ্যপান এড়িয়ে চলুন",
      "লক্ষণ অব্যাহত থাকলে ডাক্তারের পরামর্শ নিন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "B",
      pregnancy_info: "Safe to use during pregnancy when used as directed",
      lactation_info: "Safe during breastfeeding",
      pregnancy_info_bn: "নির্দেশনা অনুযায়ী ব্যবহার করলে গর্ভাবস্থায় নিরাপদ",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় নিরাপদ"
    },
    product_images: [
      "/images/medicines/ace-500mg.jpg",
      "/images/medicines/ace-package.jpg"
    ],
    keywords_bn: ["এস", "প্যারাসিটামল", "ব্যথা", "জ্বর", "মাথাব্যথা"]
  },
  {
    id: "ibu-001",
    generic_name: "Ibuprofen",
    brand_name: "Brufen",
    generic_name_bn: "আইবুপ্রোফেন",
    brand_name_bn: "ব্রুফেন",
    manufacturer: "Sanofi Bangladesh",
    manufacturer_bn: "সানোফি বাংলাদেশ",
    strength: "400mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "NSAID",
    therapeutic_class_bn: "প্রদাহবিরোধী ব্যথানাশক",
    indication: ["Pain relief", "Inflammation", "Fever", "Arthritis"],
    indication_bn: ["ব্যথা উপশম", "প্রদাহ কমানো", "জ্বর", "বাত"],
    alternatives: ["Ibufen", "Profen", "Advel", "Flamex"],
    price_range: { min: 3.0, max: 5.5 },
    prescription_required: false,
    common_dosage: "400mg 3 times daily after meals",
    common_dosage_bn: "খাবারের পর দিনে ৩ বার ৪০০ মিগ্রা",
    side_effects: ["Stomach upset", "Nausea", "Dizziness", "Heartburn"],
    side_effects_bn: ["পেট খারাপ", "বমি বমি ভাব", "মাথা ঘোরা", "বুক জ্বালাপোড়া"],
    contraindications: ["Peptic ulcer", "Severe heart failure", "Kidney disease"],
    contraindications_bn: ["পেপটিক আলসার", "গুরুতর হার্ট ফেইলিউর", "কিডনি রোগ"],
    drug_interactions: ["Aspirin", "Warfarin", "Lithium", "Methotrexate"],
    drug_interactions_bn: ["অ্যাসপিরিন", "ওয়ারফেরিন", "লিথিয়াম", "মেথোট্রেক্সেট"],
    storage_instructions: "Store below 25°C in a dry place. Protect from moisture and light.",
    storage_instructions_bn: "২৫° সেলসিয়াসের নিচে শুকনো জায়গায় রাখুন। আর্দ্রতা ও আলো থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Take with food to reduce stomach irritation",
      "Avoid alcohol during treatment",
      "Stop use if allergic reactions occur"
    ],
    warnings_precautions_bn: [
      "পেট খারাপ কমাতে খাবারের সাথে নিন",
      "চিকিৎসার সময় মদ্যপান এড়িয়ে চলুন",
      "এলার্জি হলে ব্যবহার বন্ধ করুন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "C",
      pregnancy_info: "Use only if benefits outweigh risks. Avoid in third trimester",
      lactation_info: "Use with caution during breastfeeding",
      pregnancy_info_bn: "উপকারিতা ঝুঁকির চেয়ে বেশি হলেই ব্যবহার করুন। তৃতীয় ত্রৈমাসিকে এড়িয়ে চলুন",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় সতর্কতার সাথে ব্যবহার করুন"
    },
    product_images: [
      "/images/medicines/brufen-400mg.jpg",
      "/images/medicines/brufen-package.jpg"
    ],
    keywords_bn: ["ব্রুফেন", "আইবুপ্রোফেন", "ব্যথা", "প্রদাহ", "জ্বর"]
  },

  // Antibiotics
  {
    id: "amoxi-001",
    generic_name: "Amoxicillin",
    brand_name: "Amoxin",
    generic_name_bn: "অ্যামক্সিসিলিন",
    brand_name_bn: "অ্যামক্সিন",
    manufacturer: "Square Pharmaceuticals",
    manufacturer_bn: "স্কয়ার ফার্মাসিউটিক্যালস",
    strength: "500mg",
    form: "Capsule",
    form_bn: "ক্যাপসুল",
    therapeutic_class: "Beta-lactam Antibiotic",
    therapeutic_class_bn: "বেটা-ল্যাক্টাম অ্যান্টিবায়োটিক",
    indication: ["Bacterial infections", "Respiratory tract infections", "UTI", "Skin infections"],
    indication_bn: ["ব্যাকটেরিয়ার সংক্রমণ", "শ্বাসযন্ত্রের সংক্রমণ", "মূত্রনালীর সংক্রমণ", "চামড়ার সংক্রমণ"],
    alternatives: ["Penamox", "Maxicillin", "Zimox", "Amoxil"],
    price_range: { min: 8.0, max: 12.0 },
    prescription_required: true,
    common_dosage: "500mg 3 times daily for 5-7 days",
    common_dosage_bn: "দিনে ৩ বার ৫০০ মিগ্রা, ৫-৭ দিন",
    side_effects: ["Nausea", "Diarrhea", "Allergic reactions", "Skin rash"],
    side_effects_bn: ["বমি বমি ভাব", "ডায়রিয়া", "এলার্জিক প্রতিক্রিয়া", "চামড়ায় র‍্যাশ"],
    contraindications: ["Penicillin allergy", "Mononucleosis"],
    contraindications_bn: ["পেনিসিলিন এলার্জি", "মনোনুক্লিওসিস"],
    drug_interactions: ["Methotrexate", "Allopurinol", "Oral contraceptives"],
    drug_interactions_bn: ["মেথোট্রেক্সেট", "অ্যালোপিউরিনল", "জন্মনিয়ন্ত্রণ পিল"],
    storage_instructions: "Store in a cool, dry place. Complete the full course even if feeling better.",
    storage_instructions_bn: "ঠাণ্ডা, শুকনো জায়গায় রাখুন। ভাল লাগলেও সম্পূর্ণ কোর্স শেষ করুন।",
    warnings_precautions: [
      "Complete full course of treatment",
      "Take with food if stomach upset occurs",
      "Stop and consult doctor if severe diarrhea develops"
    ],
    warnings_precautions_bn: [
      "চিকিৎসার সম্পূর্ণ কোর্স শেষ করুন",
      "পেট খারাপ হলে খাবারের সাথে নিন",
      "গুরুতর ডায়রিয়া হলে ব্যবহার বন্ধ করে ডাক্তারের পরামর্শ নিন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "B",
      pregnancy_info: "Generally safe during pregnancy",
      lactation_info: "Safe during breastfeeding",
      pregnancy_info_bn: "গর্ভাবস্থায় সাধারণত নিরাপদ",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় নিরাপদ"
    },
    product_images: [
      "/images/medicines/amoxin-500mg.jpg",
      "/images/medicines/amoxin-package.jpg"
    ],
    keywords_bn: ["অ্যামক্সিন", "অ্যামক্সিসিলিন", "অ্যান্টিবায়োটিক", "সংক্রমণ"]
  },
  {
    id: "azith-001",
    generic_name: "Azithromycin",
    brand_name: "Azithrocin",
    generic_name_bn: "অ্যাজিথ্রোমাইসিন",
    brand_name_bn: "অ্যাজিথ্রোসিন",
    manufacturer: "Renata Limited",
    manufacturer_bn: "রেনাটা লিমিটেড",
    strength: "500mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Macrolide Antibiotic",
    therapeutic_class_bn: "ম্যাক্রোলাইড অ্যান্টিবায়োটিক",
    indication: ["Respiratory infections", "Skin infections", "STD", "Typhoid"],
    indication_bn: ["শ্বাসযন্ত্রের সংক্রমণ", "চামড়ার সংক্রমণ", "যৌনরোগ", "টাইফয়েড"],
    alternatives: ["Zithromax", "Azix", "Azimax", "Azicip"],
    price_range: { min: 15.0, max: 25.0 },
    prescription_required: true,
    common_dosage: "500mg once daily for 3-5 days",
    common_dosage_bn: "দিনে একবার ৫০০ মিগ্রা, ৩-৫ দিন",
    side_effects: ["Nausea", "Diarrhea", "Abdominal pain", "Headache"],
    side_effects_bn: ["বমি বমি ভাব", "ডায়রিয়া", "পেট ব্যথা", "মাথাব্যথা"],
    contraindications: ["Liver disease", "Myasthenia gravis"],
    contraindications_bn: ["লিভার রোগ", "মায়াস্থেনিয়া গ্রেভিস"],
    drug_interactions: ["Warfarin", "Digoxin", "Ergotamine"],
    drug_interactions_bn: ["ওয়ারফেরিন", "ডিগক্সিন", "এরগোটামাইন"],
    storage_instructions: "Store at room temperature. Keep away from moisture and heat.",
    storage_instructions_bn: "ঘরের তাপমাত্রায় রাখুন। আর্দ্রতা ও গরম থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Take on empty stomach for better absorption",
      "Complete the full course",
      "Avoid antacids within 2 hours"
    ],
    warnings_precautions_bn: [
      "ভাল শোষণের জন্য খালি পেটে নিন",
      "সম্পূর্ণ কোর্স শেষ করুন",
      "২ ঘণ্টার মধ্যে অ্যান্টাসিড এড়িয়ে চলুন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "B",
      pregnancy_info: "Generally safe during pregnancy",
      lactation_info: "Use with caution during breastfeeding",
      pregnancy_info_bn: "গর্ভাবস্থায় সাধারণত নিরাপদ",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় সতর্কতার সাথে ব্যবহার করুন"
    },
    product_images: [
      "/images/medicines/azithrocin-500mg.jpg",
      "/images/medicines/azithrocin-package.jpg"
    ],
    keywords_bn: ["অ্যাজিথ্রোসিন", "অ্যাজিথ্রোমাইসিন", "অ্যান্টিবায়োটিক", "সংক্রমণ"]
  },

  // Gastrointestinal
  {
    id: "ome-001",
    generic_name: "Omeprazole",
    brand_name: "Losec",
    generic_name_bn: "ওমেপ্রাজল",
    brand_name_bn: "লোসেক",
    manufacturer: "AstraZeneca Bangladesh",
    manufacturer_bn: "অ্যাস্ট্রাজেনেকা বাংলাদেশ",
    strength: "20mg",
    form: "Capsule",
    form_bn: "ক্যাপসুল",
    therapeutic_class: "Proton Pump Inhibitor",
    therapeutic_class_bn: "প্রোটন পাম্প ইনহিবিটর",
    indication: ["Acid reflux", "Peptic ulcer", "GERD", "Gastritis"],
    indication_bn: ["অ্যাসিড রিফ্লাক্স", "পেপটিক আলসার", "জিইআরডি", "গ্যাসট্রাইটিস"],
    alternatives: ["Omepra", "Ultop", "Prilosec", "Gastrazole"],
    price_range: { min: 6.0, max: 10.0 },
    prescription_required: false,
    common_dosage: "20mg once daily before breakfast",
    common_dosage_bn: "দিনে একবার ২০ মিগ্রা, নাশ্তার আগে",
    side_effects: ["Headache", "Nausea", "Diarrhea", "Vitamin B12 deficiency"],
    side_effects_bn: ["মাথাব্যথা", "বমি বমি ভাব", "ডায়রিয়া", "ভিটামিন বিটেন এর অভাব"],
    contraindications: ["Severe liver impairment"],
    contraindications_bn: ["গুরুতর লিভার সমস্যা"],
    drug_interactions: ["Clopidogrel", "Warfarin", "Phenytoin"],
    drug_interactions_bn: ["ক্লোপিডগ্রেল", "ওয়ারফেরিন", "ফেনিটয়িন"],
    storage_instructions: "Store below 25°C in original container. Protect from moisture.",
    storage_instructions_bn: "২৫° সেলসিয়াসের নিচে মূল প্যাকেতে রাখুন। আর্দ্রতা থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Take before meals for best effect",
      "Long term use may increase infection risk",
      "May mask symptoms of stomach cancer"
    ],
    warnings_precautions_bn: [
      "ভাল ফলাফলের জন্য খাবারের আগে নিন",
      "দীর্ঘমেয়াদি ব্যবহার সংক্রমণের ঝুঁকি বাড়াতে পারে",
      "পেটের ক্যান্সারের লক্ষণ আড়াল করতে পারে"
    ],
    pregnancy_lactation: {
      pregnancy_category: "C",
      pregnancy_info: "Use only if clearly needed during pregnancy",
      lactation_info: "Small amounts pass into breast milk",
      pregnancy_info_bn: "গর্ভাবস্থায় কেবল স্পষ্ট প্রয়োজন থাকলে ব্যবহার করুন",
      lactation_info_bn: "অল্প পরিমাণ বুকের দুধে যায়"
    },
    product_images: [
      "/images/medicines/losec-20mg.jpg",
      "/images/medicines/losec-package.jpg"
    ],
    keywords_bn: ["লোসেক", "ওমেপ্রাজল", "অ্যাসিডিটি", "গ্যাস"]
  },
  {
    id: "ral-001",
    generic_name: "Ranitidine",
    brand_name: "Ranac",
    generic_name_bn: "র্যানিটিডিন",
    brand_name_bn: "রানাক",
    manufacturer: "Square Pharmaceuticals",
    manufacturer_bn: "স্কয়ার ফার্মাসিউটিক্যালস",
    strength: "150mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "H2 Receptor Blocker",
    therapeutic_class_bn: "এইচটু রিসেপ্টর ব্লকার",
    indication: ["Acid reflux", "Peptic ulcer", "Heartburn", "Gastritis"],
    indication_bn: ["অ্যাসিড রিফ্লাক্স", "পেপটিক আলসার", "বুক জ্বালাপোড়া", "গ্যাসট্রাইটিস"],
    alternatives: ["Zantac", "Rantac", "Histac", "Ulcicure"],
    price_range: { min: 2.5, max: 4.5 },
    prescription_required: false,
    common_dosage: "150mg twice daily",
    common_dosage_bn: "দিনে দুইবার ১৫০ মিগ্রা",
    side_effects: ["Headache", "Dizziness", "Constipation", "Diarrhea"],
    side_effects_bn: ["মাথাব্যথা", "মাথা ঘোরা", "কব্জি", "ডায়রিয়া"],
    contraindications: ["Kidney disease", "Liver disease"],
    contraindications_bn: ["কিডনি রোগ", "লিভার রোগ"],
    drug_interactions: ["Warfarin", "Phenytoin", "Theophylline"],
    drug_interactions_bn: ["ওয়ারফেরিন", "ফেনিটয়িন", "থিওফিলিন"],
    storage_instructions: "Store at room temperature away from moisture and heat.",
    storage_instructions_bn: "ঘরের তাপমাত্রায় আর্দ্রতা ও গরম থেকে দূরে রাখুন।",
    warnings_precautions: [
      "May be taken with or without food",
      "Avoid smoking and alcohol",
      "Complete treatment course"
    ],
    warnings_precautions_bn: [
      "খাবারের সাথে বা ছাড়া নেওয়া যায়",
      "ধূমপান ও মদ্যপান এড়িয়ে চলুন",
      "চিকিৎসার সম্পূর্ণ কোর্স শেষ করুন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "B",
      pregnancy_info: "Generally safe during pregnancy",
      lactation_info: "Passes into breast milk, use with caution",
      pregnancy_info_bn: "গর্ভাবস্থায় সাধারণত নিরাপদ",
      lactation_info_bn: "বুকের দুধে যায়, সতর্কতার সাথে ব্যবহার করুন"
    },
    product_images: [
      "/images/medicines/ranac-150mg.jpg",
      "/images/medicines/ranac-package.jpg"
    ],
    keywords_bn: ["রানাক", "র্যানিটিডিন", "অ্যাসিডিটি", "পেট ব্যথা"]
  },

  // Cardiovascular
  {
    id: "aten-001",
    generic_name: "Atenolol",
    brand_name: "Tenormin",
    generic_name_bn: "এটিনলল",
    brand_name_bn: "টেনরমিন",
    manufacturer: "ACI Limited",
    manufacturer_bn: "এসিআই লিমিটেড",
    strength: "50mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Beta Blocker",
    therapeutic_class_bn: "বেটা ব্লকার",
    indication: ["Hypertension", "Angina", "Arrhythmia", "Heart attack prevention"],
    indication_bn: ["উচ্চ রক্তচাপ", "এনজাইনা", "অ্যারিদমিয়া", "হার্ট অ্যাটাক প্রতিরোধ"],
    alternatives: ["Atenol", "Blokium", "Carditen", "Tenoretic"],
    price_range: { min: 2.0, max: 4.0 },
    prescription_required: true,
    common_dosage: "50mg once daily",
    common_dosage_bn: "দিনে একবার ৫০ মিগ্রা",
    side_effects: ["Fatigue", "Cold hands/feet", "Slow heart rate", "Depression"],
    side_effects_bn: ["ক্লান্তি", "হাত/পা ঠাণ্ডা", "ধীর হার্ট রেট", "বিষণ্নতা"],
    contraindications: ["Asthma", "Heart block", "Severe heart failure"],
    contraindications_bn: ["হাঁপানি", "হার্ট ব্লক", "গুরুতর হার্ট ফেইলিউর"],
    drug_interactions: ["Insulin", "Calcium channel blockers", "NSAIDs"],
    drug_interactions_bn: ["ইনসুলিন", "ক্যালসিয়াম চ্যানেল ব্লকার", "এনএসএআইডি"],
    storage_instructions: "Store at room temperature. Protect from light and moisture.",
    storage_instructions_bn: "ঘরের তাপমাত্রায় রাখুন। আলো ও আর্দ্রতা থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Do not stop suddenly without doctor's advice",
      "Monitor blood pressure regularly",
      "May mask signs of low blood sugar"
    ],
    warnings_precautions_bn: [
      "ডাক্তারের পরামর্শ ছাড়া হঠাৎ বন্ধ করবেন না",
      "নিয়মিত রক্তচাপ পরীক্ষা করুন",
      "নিম্ন রক্তচাপের লক্ষণ আড়াল করতে পারে"
    ],
    pregnancy_lactation: {
      pregnancy_category: "D",
      pregnancy_info: "May cause fetal harm, use only if clearly needed",
      lactation_info: "Passes into breast milk, monitor infant",
      pregnancy_info_bn: "ভ্রূণের ক্ষতি হতে পারে, স্পষ্ট প্রয়োজন থাকলেই ব্যবহার করুন",
      lactation_info_bn: "বুকের দুধে যায়, শিশুকে নিরীক্ষণ করুন"
    },
    product_images: [
      "/images/medicines/tenormin-50mg.jpg",
      "/images/medicines/tenormin-package.jpg"
    ],
    keywords_bn: ["টেনরমিন", "এটিনলল", "উচ্চ রক্তচাপ", "হার্ট", "বেটা ব্লকার"]
  },
  {
    id: "amlo-001",
    generic_name: "Amlodipine",
    brand_name: "Norvasc",
    generic_name_bn: "অ্যামলোডিপিন",
    brand_name_bn: "নরভাস্ক",
    manufacturer: "Pfizer Bangladesh",
    manufacturer_bn: "ফাইজার বাংলাদেশ",
    strength: "5mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Calcium Channel Blocker",
    therapeutic_class_bn: "ক্যালসিয়াম চ্যানেল ব্লকার",
    indication: ["Hypertension", "Angina", "Coronary artery disease"],
    indication_bn: ["উচ্চ রক্তচাপ", "এনজাইনা", "করোনারী আর্টারী ডিজিজ"],
    alternatives: ["Amlodac", "Amcard", "Stamlo", "S-Amlo"],
    price_range: { min: 3.5, max: 6.0 },
    prescription_required: true,
    common_dosage: "5mg once daily",
    common_dosage_bn: "দিনে একবার ৫ মিগ্রা",
    side_effects: ["Ankle swelling", "Flushing", "Fatigue", "Dizziness"],
    side_effects_bn: ["গোড়ালি ফুলে যাওয়া", "মুখ লাল হয়ে যাওয়া", "ক্লান্তি", "মাথা ঘোরা"],
    contraindications: ["Severe aortic stenosis", "Cardiogenic shock"],
    contraindications_bn: ["গুরুতর এওরটিক স্টেনোসিস", "কার্ডিওজেনিক শক"],
    drug_interactions: ["Grapefruit juice", "Simvastatin", "Digoxin"],
    drug_interactions_bn: ["গ্রেপফ্রুট জুস", "সিমভ্যাসটেটিন", "ডিগক্সিন"],
    storage_instructions: "Store at room temperature away from moisture and heat.",
    storage_instructions_bn: "ঘরের তাপমাত্রায় আর্দ্রতা ও গরম থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Avoid grapefruit and grapefruit juice",
      "May cause dizziness, avoid driving",
      "Monitor blood pressure regularly"
    ],
    warnings_precautions_bn: [
      "গ্রেপফ্রুট ও গ্রেপফ্রুট জুস এড়িয়ে চলুন",
      "মাথা ঘুরতে পারে, গাড়ি চালানো এড়িয়ে চলুন",
      "নিয়মিত রক্তচাপ পরীক্ষা করুন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "C",
      pregnancy_info: "Use only if potential benefit justifies risk",
      lactation_info: "Unknown if passes into breast milk",
      pregnancy_info_bn: "সম্ভাব্য উপকারিতা ঝুঁকিকে সমর্থন করলেই ব্যবহার করুন",
      lactation_info_bn: "বুকের দুধে যায় কিনা জানা নেই"
    },
    product_images: [
      "/images/medicines/norvasc-5mg.jpg",
      "/images/medicines/norvasc-package.jpg"
    ],
    keywords_bn: ["নরভাস্ক", "অ্যামলোডিপিন", "উচ্চ রক্তচাপ", "হার্ট"]
  },

  // Diabetes
  {
    id: "met-001",
    generic_name: "Metformin",
    brand_name: "Glucophage",
    generic_name_bn: "মেটফরমিন",
    brand_name_bn: "গ্লুকোফেজ",
    manufacturer: "Sanofi Bangladesh",
    manufacturer_bn: "সানোফি বাংলাদেশ",
    strength: "500mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Biguanide Antidiabetic",
    therapeutic_class_bn: "বাইগুয়ানাইড ডায়াবেটিস নিয়ন্ত্রণ ওষুধ",
    indication: ["Type 2 diabetes", "PCOS", "Pre-diabetes"],
    indication_bn: ["টাইপ টু ডায়াবেটিস", "পিসিওএস", "প্রাক-ডায়াবেটিস"],
    alternatives: ["Glycomet", "Metform", "Diabex", "Formin"],
    price_range: { min: 2.0, max: 4.0 },
    prescription_required: true,
    common_dosage: "500mg twice daily with meals",
    common_dosage_bn: "খাবারের সাথে দিনে দুইবার ৫০০ মিগ্রা",
    side_effects: ["Nausea", "Diarrhea", "Metallic taste", "Vitamin B12 deficiency"],
    side_effects_bn: ["বমি বমি ভাব", "ডায়রিয়া", "মুখে ধাতব স্বাদ", "ভিটামিন বিটেন এর অভাব"],
    contraindications: ["Kidney disease", "Liver disease", "Heart failure"],
    contraindications_bn: ["কিডনি রোগ", "লিভার রোগ", "হার্ট ফেইলিউর"],
    drug_interactions: ["Contrast dye", "Alcohol", "Furosemide"],
    drug_interactions_bn: ["কন্ট্রাস্ট ডাই", "অ্যালকোহল", "ফিউরোসাইড"],
    storage_instructions: "Store at room temperature. Keep away from moisture and heat.",
    storage_instructions_bn: "ঘরের তাপমাত্রায় রাখুন। আর্দ্রতা ও গরম থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Always take with food to reduce stomach upset",
      "Monitor blood sugar regularly",
      "Stop before surgery or contrast imaging"
    ],
    warnings_precautions_bn: [
      "পেট খারাপ এড়াতে সবসময় খাবারের সাথে নিন",
      "নিয়মিত রক্তের চিনি পরীক্ষা করুন",
      "অপারেশন বা কন্ট্রাস্ট ইমেজিং এর আগে বন্ধ করুন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "B",
      pregnancy_info: "Generally safe during pregnancy for diabetes management",
      lactation_info: "Passes into breast milk, monitor infant",
      pregnancy_info_bn: "ডায়াবেটিস নিয়ন্ত্রণের জন্য গর্ভাবস্থায় সাধারণত নিরাপদ",
      lactation_info_bn: "বুকের দুধে যায়, শিশুকে নিরীক্ষণ করুন"
    },
    product_images: [
      "/images/medicines/glucophage-500mg.jpg",
      "/images/medicines/glucophage-package.jpg"
    ],
    keywords_bn: ["গ্লুকোফেজ", "মেটফরমিন", "ডায়াবেটিস", "চিনি"]
  },

  // Respiratory
  {
    id: "sal-001",
    generic_name: "Salbutamol",
    brand_name: "Ventolin",
    generic_name_bn: "স্যালবুটামল",
    brand_name_bn: "ভেন্টোলিন",
    manufacturer: "GSK Bangladesh",
    manufacturer_bn: "জিএসকে বাংলাদেশ",
    strength: "100mcg/dose",
    form: "Inhaler",
    form_bn: "ইনহেলার",
    therapeutic_class: "Beta-2 Agonist Bronchodilator",
    therapeutic_class_bn: "বেটা-২ এগোনিস্ট ব্রঙ্কোডাইলেটর",
    indication: ["Asthma", "COPD", "Bronchospasm", "Exercise-induced asthma"],
    indication_bn: ["হাঁপানি", "সিওপিডি", "ব্রঙ্কোস্প্যাজম", "ব্যায়াম-জনিত হাঁপানি"],
    alternatives: ["Asthalin", "Airomir", "Sultolin", "Salbair"],
    price_range: { min: 180.0, max: 250.0 },
    prescription_required: false,
    common_dosage: "1-2 puffs every 4-6 hours as needed",
    common_dosage_bn: "প্রয়োজন অনুযায়ী ৪-৬ ঘণ্টা অন্তর ১-২ টান",
    side_effects: ["Tremor", "Palpitations", "Headache", "Muscle cramps"],
    side_effects_bn: ["কাঁপুনি", "বুক ধড়ফড়", "মাথাব্যথা", "মাংসপেশী খিঁচুনি"],
    contraindications: ["Hypersensitivity to salbutamol"],
    contraindications_bn: ["স্যালবুটামলে অতি সংবেদনশীলতা"],
    drug_interactions: ["Beta blockers", "Digoxin", "Diuretics"],
    drug_interactions_bn: ["বেটা ব্লকার", "ডিগক্সিন", "ডাইইউরেটিক্স"],
    storage_instructions: "Store below 30°C. Do not puncture or burn. Keep away from heat.",
    storage_instructions_bn: "৩০° সেলসিয়াসের নিচে রাখুন। ছিদ্র করবেন না বা পোড়াবেন না। গরম থেকে দূরে রাখুন।",
    warnings_precautions: [
      "Shake well before each use",
      "Rinse mouth after use",
      "Seek medical help if no improvement"
    ],
    warnings_precautions_bn: [
      "প্রতিবার ব্যবহারের আগে ভাল করে ঝাঁকান",
      "ব্যবহারের পর মুখ কুলকুচি করুন",
      "উন্নতি না হলে চিকিৎসকের সাহায্য নিন"
    ],
    pregnancy_lactation: {
      pregnancy_category: "C",
      pregnancy_info: "Use only if benefits outweigh risks",
      lactation_info: "Probably safe during breastfeeding",
      pregnancy_info_bn: "উপকারিতা ঝুঁকির চেয়ে বেশি হলেই ব্যবহার করুন",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় সম্ভবত নিরাপদ"
    },
    product_images: [
      "/images/medicines/ventolin-inhaler.jpg",
      "/images/medicines/ventolin-package.jpg"
    ],
    keywords_bn: ["ভেন্টোলিন", "স্যালবুটামল", "হাঁপানি", "শ্বাসকষ্ট", "ইনহেলার"]
  },

  // Vitamins & Supplements
  {
    id: "vitb-001",
    generic_name: "Vitamin B Complex",
    brand_name: "B-50",
    generic_name_bn: "ভিটামিন বি কমপ্লেক্স",
    brand_name_bn: "বি-৫০",
    manufacturer: "Square Pharmaceuticals",
    manufacturer_bn: "স্কয়ার ফার্মাসিউটিক্যালস",
    strength: "Mixed B vitamins",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Vitamin Supplement",
    therapeutic_class_bn: "ভিটামিন সাপ্লিমেন্ট",
    indication: ["Vitamin B deficiency", "Fatigue", "Nerve problems", "Anemia"],
    indication_bn: ["ভিটামিন বির অভাব", "ক্লান্তি", "নার্ভের সমস্যা", "রক্তহীনতা"],
    alternatives: ["Becosules", "Neurobion", "B-Complex", "Vitamin B"],
    price_range: { min: 1.0, max: 3.0 },
    prescription_required: false,
    common_dosage: "1 tablet daily after meal",
    common_dosage_bn: "খাবারের পর দিনে একটি ট্যাবলেট",
    side_effects: ["Nausea", "Upset stomach", "Yellow urine"],
    side_effects_bn: ["বমি বমি ভাব", "পেট খারাপ", "হলুদ প্রিস্রাব"],
    contraindications: ["Hypersensitivity to B vitamins"],
    contraindications_bn: ["বি ভিটামিনে অতি সংবেদনশীলতা"],
    drug_interactions: ["Levodopa", "Phenytoin"],
    drug_interactions_bn: ["লেভোডোপা", "ফেনিটয়িন"],
    storage_instructions: "Store in a cool, dry place below 30°C. Keep container tightly closed.",
    storage_instructions_bn: "৩০° সেলসিয়াসের নিচে ঠাণ্ডা, শুকনো জায়গায় রাখুন। পাত্র ভাল করে বন্ধ রাখুন।",
    warnings_precautions: [
      "Take with or after food to reduce stomach upset",
      "May cause harmless yellow discoloration of urine",
      "Do not exceed recommended dose"
    ],
    warnings_precautions_bn: [
      "পেট খারাপ এড়াতে খাবারের সাথে বা পরে নিন",
      "প্রিস্রাব হলুদ হতে পারে, এটা ক্ষতিকর নয়",
      "নির্ধারিত মাত্রার চেয়ে বেশি নেবেন না"
    ],
    pregnancy_lactation: {
      pregnancy_category: "A",
      pregnancy_info: "Safe during pregnancy at recommended doses",
      lactation_info: "Safe during breastfeeding",
      pregnancy_info_bn: "নির্ধারিত মাত্রায় গর্ভাবস্থায় নিরাপদ",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় নিরাপদ"
    },
    product_images: [
      "/images/medicines/b50-tablet.jpg",
      "/images/medicines/b50-package.jpg"
    ],
    keywords_bn: ["বি-৫০", "ভিটামিন বি", "ক্লান্তি", "নার্ভ"]
  },
  {
    id: "vitc-001",
    generic_name: "Vitamin C",
    brand_name: "C-Vit",
    generic_name_bn: "ভিটামিন সি",
    brand_name_bn: "সি-ভিট",
    manufacturer: "Renata Limited",
    manufacturer_bn: "রেনাটা লিমিটেড",
    strength: "500mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Vitamin Supplement",
    therapeutic_class_bn: "ভিটামিন সাপ্লিমেন্ট",
    indication: ["Vitamin C deficiency", "Immune support", "Wound healing", "Antioxidant"],
    indication_bn: ["ভিটামিন সির অভাব", "রোগ প্রতিরোধ ক্ষমতা বাড়ানো", "ঘা শুকানো", "অ্যান্টিঅক্সিডেন্ট"],
    alternatives: ["Ceevit", "Ascorbic Acid", "Limcee", "Redoxon"],
    price_range: { min: 1.5, max: 3.5 },
    prescription_required: false,
    common_dosage: "500mg daily",
    common_dosage_bn: "দিনে ৫০০ মিগ্রা",
    side_effects: ["Nausea", "Diarrhea", "Kidney stones (high doses)"],
    side_effects_bn: ["বমি বমি ভাব", "ডায়রিয়া", "কিডনিতে পাথর (অতিরিক্ত মাত্রায়)"],
    contraindications: ["Kidney stones history", "Iron overload"],
    contraindications_bn: ["কিডনিতে পাথরের ইতিহাস", "আয়রন অতিরিক্ত লোড"],
    drug_interactions: ["Iron supplements", "Warfarin"],
    drug_interactions_bn: ["আয়রন সাপ্লিমেন্ট", "ওয়ারফেরিন"],
    storage_instructions: "Store in a cool, dry place away from light and moisture.",
    storage_instructions_bn: "আলো ও আর্দ্রতা থেকে দূরে ঠাণ্ডা, শুকনো জায়গায় রাখুন।",
    warnings_precautions: [
      "High doses may cause stomach upset",
      "Take with food if stomach irritation occurs",
      "Do not exceed 2000mg daily without medical supervision"
    ],
    warnings_precautions_bn: [
      "অতিরিক্ত মাত্রা পেট খারাপ করতে পারে",
      "পেট জ্বালা হলে খাবারের সাথে নিন",
      "চিকিৎসকের তত্ত্বাবধান ছাড়া দিনে ২০০০ মিগ্রার চেয়ে বেশি নেবেন না"
    ],
    pregnancy_lactation: {
      pregnancy_category: "A",
      pregnancy_info: "Safe during pregnancy at recommended doses",
      lactation_info: "Safe during breastfeeding",
      pregnancy_info_bn: "নির্ধারিত মাত্রায় গর্ভাবস্থায় নিরাপদ",
      lactation_info_bn: "বুকের দুধ খাওয়ানোর সময় নিরাপদ"
    },
    product_images: [
      "/images/medicines/cvit-500mg.jpg",
      "/images/medicines/cvit-package.jpg"
    ],
    keywords_bn: ["সি-ভিট", "ভিটামিন সি", "রোগ প্রতিরোধ", "অ্যান্টিঅক্সিডেন্ট"]
  },

  // Antihistamines
  {
    id: "cet-001",
    generic_name: "Cetirizine",
    brand_name: "Zyrtec",
    generic_name_bn: "সেটিরিজিন",
    brand_name_bn: "জাইরটেক",
    manufacturer: "GSK Bangladesh",
    manufacturer_bn: "জিএসকে বাংলাদেশ",
    strength: "10mg",
    form: "Tablet",
    form_bn: "ট্যাবলেট",
    therapeutic_class: "Antihistamine",
    therapeutic_class_bn: "অ্যান্টিহিসটামিন",
    indication: ["Allergic rhinitis", "Urticaria", "Hay fever", "Skin allergies"],
    indication_bn: ["অ্যালার্জিক রাইনাইটিস", "আর্টিক্যারিয়া", "হে ফিভার", "চামড়ার এলার্জি"],
    alternatives: ["Cetrizin", "Alerid", "Okacet", "Cetzine"],
    price_range: { min: 2.0, max: 4.0 },
    prescription_required: false,
    common_dosage: "10mg once daily",
    common_dosage_bn: "দিনে একবার ১০ মিগ্রা",
    side_effects: ["Drowsiness", "Dry mouth", "Fatigue", "Headache"],
    side_effects_bn: ["ঘুমঘুম ভাব", "মুখ শুকিয়ে যাওয়া", "ক্লান্তি", "মাথাব্যথা"],
    contraindications: ["Severe kidney disease"],
    contraindications_bn: ["গুরুতর কিডনি রোগ"],
    drug_interactions: ["Alcohol", "CNS depressants", "Theophylline"],
    drug_interactions_bn: ["অ্যালকোহল", "সিএনএস ডিপ্রেসেন্ট", "থিওফিলিন"],
    storage_instructions: "Store at room temperature in original container. Protect from moisture.",
    storage_instructions_bn: "মূল পাত্রে ঘরের তাপমাত্রায় রাখুন। আর্দ্রতা থেকে দূরে রাখুন।",
    warnings_precautions: [
      "May cause drowsiness, avoid driving",
      "Avoid alcohol while taking this medicine",
      "Reduce dose in kidney disease"
    ],
    warnings_precautions_bn: [
      "ঘুমঘুম ভাব হতে পারে, গাড়ি চালানো এড়িয়ে চলুন",
      "ওষুধ নেওয়ার সময় মদ্যপান এড়িয়ে চলুন",
      "কিডনি রোগে মাত্রা কমান"
    ],
    pregnancy_lactation: {
      pregnancy_category: "B",
      pregnancy_info: "Generally safe during pregnancy",
      lactation_info: "Small amounts pass into breast milk",
      pregnancy_info_bn: "গর্ভাবস্থায় সাধারণত নিরাপদ",
      lactation_info_bn: "অল্প পরিমাণ বুকের দুধে যায়"
    },
    product_images: [
      "/images/medicines/zyrtec-10mg.jpg",
      "/images/medicines/zyrtec-package.jpg"
    ],
    keywords_bn: ["জাইরটেক", "সেটিরিজিন", "এলার্জি", "চামড়া জ্বালা", "হাঁচি"]
  }
];

// Search and suggestion functions
export class MedicineKnowledgeService {
  // Use the comprehensive master database with 1000+ medicines
  private static database = masterMedicineDatabase;

  /**
   * Get smart suggestions based on user input
   * Enhanced to search across all 1000+ medicines with multi-language support
   */
  static getSmartSuggestions(query: string, limit: number = 10): MedicineKnowledgeEntry[] {
    if (!query || query.length < 1) return [];
    
    // Try to use Supabase first for real-time data, fallback to local
    // This will be handled by the sync service in the future
    return MasterDatabaseService.searchMedicines(query, limit);
  }

  /**
   * Get enhanced smart suggestions with sync service integration
   * This method will use Supabase when available, fallback to local database
   */
  static async getSmartSuggestionsAsync(query: string, limit: number = 10): Promise<MedicineKnowledgeEntry[]> {
    if (!query || query.length < 1) return [];
    
    try {
      // Import sync service dynamically to avoid circular dependencies
      const { MedicineKnowledgeSyncService } = await import('./medicine-knowledge-sync');
      
      // Try to search in Supabase first
      const { medicines, error } = await MedicineKnowledgeSyncService.searchMedicines(query, { limit });
      
      if (!error && medicines.length > 0) {
        // Transform Supabase results to MedicineKnowledgeEntry format
        return medicines.map(med => this.transformSupabaseToKnowledgeEntry(med));
      }
    } catch (error) {
      console.warn('Supabase search failed, using local database:', error);
    }
    
    // Fallback to local database
    return MasterDatabaseService.searchMedicines(query, limit);
  }

  /**
   * Get alternative brands for the same generic medicine
   */
  static getAlternativeBrands(genericName: string): MedicineKnowledgeEntry[] {
    return MasterDatabaseService.getAlternativeBrands(genericName);
  }

  /**
   * Get medicines by therapeutic class
   */
  static getMedicinesByClass(therapeuticClass: string): MedicineKnowledgeEntry[] {
    return MasterDatabaseService.getMedicinesByClass(therapeuticClass);
  }

  /**
   * Get all medicines from the knowledge base
   */
  static getAllMedicines(): MedicineKnowledgeEntry[] {
    return masterMedicineDatabase;
  }

  /**
   * Search by indication/use
   */
  static searchByIndication(indication: string): MedicineKnowledgeEntry[] {
    return MasterDatabaseService.getMedicinesByIndication(indication);
  }

  /**
   * Get medicine details by ID
   */
  static getMedicineById(id: string): MedicineKnowledgeEntry | null {
    return MasterDatabaseService.getMedicineById(id);
  }

  /**
   * Transform Supabase medicine data to MedicineKnowledgeEntry format
   */
  private static transformSupabaseToKnowledgeEntry(supabaseMed: any): MedicineKnowledgeEntry {
    return {
      id: supabaseMed.id,
      generic_name: supabaseMed.generic_name,
      brand_name: supabaseMed.brand_name,
      generic_name_bn: supabaseMed.generic_name_bn,
      brand_name_bn: supabaseMed.brand_name_bn,
      manufacturer: supabaseMed.manufacturer,
      manufacturer_bn: supabaseMed.manufacturer_bn,
      strength: supabaseMed.strength,
      form: supabaseMed.form,
      form_bn: supabaseMed.form_bn,
      therapeutic_class: supabaseMed.therapeutic_class,
      therapeutic_class_bn: supabaseMed.therapeutic_class_bn,
      indication: supabaseMed.indication || [],
      indication_bn: supabaseMed.indication_bn || [],
      alternatives: supabaseMed.alternatives || [],
      price_range: {
        min: supabaseMed.price_min || 0,
        max: supabaseMed.price_max || 0
      },
      prescription_required: supabaseMed.prescription_required || false,
      common_dosage: supabaseMed.common_dosage,
      common_dosage_bn: supabaseMed.common_dosage_bn,
      side_effects: supabaseMed.side_effects || [],
      side_effects_bn: supabaseMed.side_effects_bn || [],
      contraindications: supabaseMed.contraindications || [],
      contraindications_bn: supabaseMed.contraindications_bn || [],
      drug_interactions: supabaseMed.drug_interactions || [],
      drug_interactions_bn: supabaseMed.drug_interactions_bn || [],
      storage_instructions: supabaseMed.storage_instructions,
      storage_instructions_bn: supabaseMed.storage_instructions_bn,
      warnings_precautions: supabaseMed.warnings_precautions || [],
      warnings_precautions_bn: supabaseMed.warnings_precautions_bn || [],
      pregnancy_lactation: {
        pregnancy_category: supabaseMed.pregnancy_category as 'A' | 'B' | 'C' | 'D' | 'X',
        pregnancy_info: supabaseMed.pregnancy_info,
        lactation_info: supabaseMed.lactation_info,
        pregnancy_info_bn: supabaseMed.pregnancy_info_bn,
        lactation_info_bn: supabaseMed.lactation_info_bn
      },
      product_images: supabaseMed.product_images || [],
      keywords_bn: supabaseMed.keywords_bn || []
    };
  }

  /**
   * Get all unique therapeutic classes
   */
  static getTherapeuticClasses(): string[] {
    const classes = new Set(this.database.map(medicine => medicine.therapeutic_class));
    return Array.from(classes).sort();
  }

  /**
   * Get all unique manufacturers
   */
  static getManufacturers(): string[] {
    const manufacturers = new Set(this.database.map(medicine => medicine.manufacturer));
    return Array.from(manufacturers).sort();
  }

  /**
   * Check for drug interactions
   */
  static checkInteractions(medicineIds: string[]): {
    hasInteractions: boolean;
    interactions: Array<{
      medicine1: string;
      medicine2: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  } {
    const interactions: Array<{
      medicine1: string;
      medicine2: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }> = [];

    const medicines = medicineIds.map(id => this.getMedicineById(id)).filter(Boolean) as MedicineKnowledgeEntry[];
    
    for (let i = 0; i < medicines.length; i++) {
      for (let j = i + 1; j < medicines.length; j++) {
        const med1 = medicines[i];
        const med2 = medicines[j];
        
        // Check if med1 has interactions with med2's generic name
        if (med1.drug_interactions.some(interaction => 
          interaction.toLowerCase().includes(med2.generic_name.toLowerCase()) ||
          med2.generic_name.toLowerCase().includes(interaction.toLowerCase())
        )) {
          interactions.push({
            medicine1: med1.brand_name,
            medicine2: med2.brand_name,
            severity: this.getInteractionSeverity(med1.therapeutic_class, med2.therapeutic_class),
            description: `Potential interaction between ${med1.generic_name} and ${med2.generic_name}`
          });
        }
      }
    }

    return {
      hasInteractions: interactions.length > 0,
      interactions
    };
  }

  private static getInteractionSeverity(class1: string, class2: string): 'low' | 'medium' | 'high' {
    const highRiskCombinations = [
      ['anticoagulant', 'nsaid'],
      ['beta blocker', 'calcium channel blocker'],
      ['antibiotic', 'anticoagulant']
    ];

    const combination = [class1.toLowerCase(), class2.toLowerCase()].sort();
    
    for (const risky of highRiskCombinations) {
      if (risky.every(term => combination.some(c => c.includes(term)))) {
        return 'high';
      }
    }

    if (class1 !== class2) return 'medium';
    return 'low';
  }

  // Get popular medicines (commonly used medicines)
  static getPopularMedicines(limit: number = 10): MedicineKnowledgeEntry[] {
    const popularMedicineIds = [
      'para-001', 'ome-001', 'met-001', 'sal-001', 'lov-001', 'ami-001',
      'cef-001', 'ami-002', 'dil-001', 'nif-001'
    ];
    
    return popularMedicineIds
      .slice(0, limit)
      .map(id => this.getMedicineById(id))
      .filter(Boolean) as MedicineKnowledgeEntry[];
  }
}