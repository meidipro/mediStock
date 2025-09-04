const API_BASE_URL = 'http://localhost:3000/pharmacy-api';

export interface ApiMedicine {
  id: string;
  brandName: string;
  genericName: string;
  company: string;
  therapeuticClass: string;
  dosageForm: string;
  strength: string;
  price: number;
  description: string;
  indications: string;
  contraindications: string;
  sideEffects: string;
  dosage: string | null;
  storage: string;
  expiryDate: string | null;
  stock: number;
  status: string;
  categories: any[];
  lastUpdated: string;
}

export interface ApiCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  medicines?: T;
  message?: string;
  status?: string;
}

export const PharmacyApiService = {
  // Health check endpoint
  healthCheck: async (): Promise<{ success: boolean; status: string; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Get medicines with proper error handling
  getMedicines: async (searchTerm = '', page = 1): Promise<ApiMedicine[]> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      console.log(`🌐 Fetching medicines from: ${API_BASE_URL}/medicines?${params}`);
      
      const response = await fetch(`${API_BASE_URL}/medicines?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse<ApiMedicine[]> = await response.json();
      console.log('📦 API Response:', data);
      
      if (data.success) {
        // Handle the actual response structure: data.data.medicines
        const medicines = data.data?.medicines || data.data || data.medicines || [];
        console.log(`✅ Successfully fetched ${medicines.length} medicines`);
        return medicines;
      } else {
        console.warn('⚠️ API returned success: false', data.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch medicines:', error);
      throw error;
    }
  },

  // Get specific medicine by ID
  getMedicineById: async (id: number): Promise<ApiMedicine | null> => {
    try {
      console.log(`🌐 Fetching medicine by ID: ${id}`);
      const response = await fetch(`${API_BASE_URL}/medicines/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse<ApiMedicine> = await response.json();
      
      if (data.success && data.data) {
        console.log(`✅ Successfully fetched medicine: ${data.data.brand_name}`);
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to fetch medicine by ID:', error);
      throw error;
    }
  },

  // Get categories with proper error handling
  getCategories: async (): Promise<ApiCategory[]> => {
    try {
      console.log(`🌐 Fetching categories from: ${API_BASE_URL}/categories`);
      const response = await fetch(`${API_BASE_URL}/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse<ApiCategory[]> = await response.json();
      console.log('📦 Categories API Response:', data);
      
      if (data.success) {
        const categories = data.data || [];
        console.log(`✅ Successfully fetched ${categories.length} categories`);
        return categories;
      } else {
        console.warn('⚠️ Categories API returned success: false', data.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch categories:', error);
      throw error;
    }
  },
};
