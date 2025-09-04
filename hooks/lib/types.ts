// lib/types.ts

// TypeScript types for MediStock BD Database Schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'manager' | 'salesman' | 'cashier'

export type PaymentMethod = 'cash' | 'card' | 'mobile_banking' | 'due'

export type SaleStatus = 'draft' | 'completed' | 'cancelled' | 'returned'

export type MovementType = 'in' | 'out' | 'adjustment' | 'expired' | 'damaged'

export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'powder' | 'other'

export type Gender = 'male' | 'female' | 'other'

// Database Tables
export interface Database {
  public: {
    Tables: {
      medicine_groups: {
        Row: {
          id: string
          group_name: string
          description: string | null
          common_symptoms: string[] | null
          search_vector: unknown | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_name: string
          description?: string | null
          common_symptoms?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_name?: string
          description?: string | null
          common_symptoms?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medicines: {
        Row: {
          id: string
          generic_name: string
          brand_name: string | null
          manufacturer: string | null
          strength: string | null
          form: MedicineForm | null
          category: string | null
          therapeutic_group: string | null
          group_id: string | null
          metadata: Json
          search_vector: unknown | null
          barcode_number: string | null
          is_active: boolean
          added_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          generic_name: string
          brand_name?: string | null
          manufacturer?: string | null
          strength?: string | null
          form?: MedicineForm | null
          category?: string | null
          therapeutic_group?: string | null
          group_id?: string | null
          metadata?: Json
          barcode_number?: string | null
          is_active?: boolean
          added_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          generic_name?: string
          brand_name?: string | null
          manufacturer?: string | null
          strength?: string | null
          form?: MedicineForm | null
          category?: string | null
          therapeutic_group?: string | null
          group_id?: string | null
          metadata?: Json
          barcode_number?: string | null
          is_active?: boolean
          added_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pharmacies: {
        Row: {
          id: string
          name: string
          license_number: string | null
          address: string | null
          phone: string | null
          email: string | null
          owner_id: string
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          license_number?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          owner_id: string
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          license_number?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          owner_id?: string
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pharmacy_users: {
        Row: {
          id: string
          pharmacy_id: string
          user_id: string
          role: UserRole
          permissions: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pharmacy_id: string
          user_id: string
          role?: UserRole
          permissions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pharmacy_id?: string
          user_id?: string
          role?: UserRole
          permissions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          pharmacy_id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          date_of_birth: string | null
          gender: Gender | null
          total_due: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pharmacy_id: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          date_of_birth?: string | null
          gender?: Gender | null
          total_due?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pharmacy_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          date_of_birth?: string | null
          gender?: Gender | null
          total_due?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      stock: {
        Row: {
          id: string
          pharmacy_id: string
          medicine_id: string
          quantity: number
          unit_price: number
          cost_price: number
          batch_number: string | null
          expiry_date: string | null
          manufacture_date: string | null
          supplier: string | null
          minimum_stock: number
          location: string | null
          last_updated: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          pharmacy_id: string
          medicine_id: string
          quantity?: number
          unit_price: number
          cost_price: number
          batch_number?: string | null
          expiry_date?: string | null
          manufacture_date?: string | null
          supplier?: string | null
          minimum_stock?: number
          location?: string | null
          last_updated?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          pharmacy_id?: string
          medicine_id?: string
          quantity?: number
          unit_price?: number
          cost_price?: number
          batch_number?: string | null
          expiry_date?: string | null
          manufacture_date?: string | null
          supplier?: string | null
          minimum_stock?: number
          location?: string | null
          last_updated?: string
          updated_by?: string | null
        }
      }
      stock_movements: {
        Row: {
          id: string
          stock_id: string
          pharmacy_id: string
          medicine_id: string
          movement_type: MovementType | null
          quantity_change: number
          quantity_before: number
          quantity_after: number
          unit_price: number | null
          batch_number: string | null
          reference_type: string | null
          reference_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stock_id: string
          pharmacy_id: string
          medicine_id: string
          movement_type?: MovementType | null
          quantity_change: number
          quantity_before: number
          quantity_after: number
          unit_price?: number | null
          batch_number?: string | null
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stock_id?: string
          pharmacy_id?: string
          medicine_id?: string
          movement_type?: MovementType | null
          quantity_change?: number
          quantity_before?: number
          quantity_after?: number
          unit_price?: number | null
          batch_number?: string | null
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          pharmacy_id: string
          created_by: string
          assisted_by: string | null
          customer_id: string | null
          bill_number: string
          items: Json
          subtotal: number
          discount_percentage: number
          discount_amount: number
          tax_percentage: number
          tax_amount: number
          total_amount: number
          paid_amount: number
          due_amount: number | null
          payment_method: PaymentMethod
          status: SaleStatus
          notes: string | null
          return_reason: string | null
          created_at: string
          completed_at: string | null
          cancelled_at: string | null
          returned_at: string | null
        }
        Insert: {
          id?: string
          pharmacy_id: string
          created_by: string
          assisted_by?: string | null
          customer_id?: string | null
          bill_number: string
          items: Json
          subtotal: number
          discount_percentage?: number
          discount_amount?: number
          tax_percentage?: number
          tax_amount?: number
          total_amount: number
          paid_amount?: number
          payment_method?: PaymentMethod
          status?: SaleStatus
          notes?: string | null
          return_reason?: string | null
          created_at?: string
          completed_at?: string | null
          cancelled_at?: string | null
          returned_at?: string | null
        }
        Update: {
          id?: string
          pharmacy_id?: string
          created_by?: string
          assisted_by?: string | null
          customer_id?: string | null
          bill_number?: string
          items?: Json
          subtotal?: number
          discount_percentage?: number
          discount_amount?: number
          tax_percentage?: number
          tax_amount?: number
          total_amount?: number
          paid_amount?: number
          payment_method?: PaymentMethod
          status?: SaleStatus
          notes?: string | null
          return_reason?: string | null
          created_at?: string
          completed_at?: string | null
          cancelled_at?: string | null
          returned_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          sale_id: string
          pharmacy_id: string
          customer_id: string | null
          amount: number
          payment_method: PaymentMethod
          transaction_id: string | null
          notes: string | null
          received_by: string
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          pharmacy_id: string
          customer_id?: string | null
          amount: number
          payment_method: PaymentMethod
          transaction_id?: string | null
          notes?: string | null
          received_by: string
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          pharmacy_id?: string
          customer_id?: string | null
          amount?: number
          payment_method?: PaymentMethod
          transaction_id?: string | null
          notes?: string | null
          received_by?: string
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          pharmacy_id: string
          name: string
          company: string | null
          phone: string | null
          email: string | null
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pharmacy_id: string
          name: string
          company?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pharmacy_id?: string
          name?: string
          company?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          pharmacy_id: string
          supplier_id: string | null
          invoice_number: string | null
          items: Json
          subtotal: number
          discount_amount: number
          total_amount: number
          paid_amount: number
          due_amount: number | null
          status: string
          notes: string | null
          created_by: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          pharmacy_id: string
          supplier_id?: string | null
          invoice_number?: string | null
          items: Json
          subtotal: number
          discount_amount?: number
          total_amount: number
          paid_amount?: number
          status?: string
          notes?: string | null
          created_by: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          pharmacy_id?: string
          supplier_id?: string | null
          invoice_number?: string | null
          items?: Json
          subtotal?: number
          discount_amount?: number
          total_amount?: number
          paid_amount?: number
          status?: string
          notes?: string | null
          created_by?: string
          created_at?: string
          completed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_medicines: {
        Args: {
          search_term: string
          pharmacy_id_param?: string
        }
        Returns: {
          id: string
          generic_name: string
          brand_name: string
          manufacturer: string
          strength: string
          form: string
          current_stock: number
          unit_price: number
          rank: number
        }[]
      }
      get_low_stock_items: {
        Args: {
          pharmacy_id_param: string
          threshold_param?: number
        }
        Returns: {
          medicine_id: string
          generic_name: string
          brand_name: string
          current_quantity: number
          threshold: number
          batch_number: string | null
          expiry_date: string | null
        }[]
      }
      generate_daily_report: {
        Args: {
          pharmacy_id_param: string
          report_date?: string
        }
        Returns: {
          total_sales: number
          total_transactions: number
          total_due: number
          top_medicines: Json
          low_stock_count: number
        }[]
      }
      cleanup_duplicate_medicines: {
        Args: {
          pharmacy_id_param: string
        }
        Returns: number
      }
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Application specific types
export interface Medicine {
  [x: string]: any
  id: string
  name?: string
  generic_name: string
  brand_name?: string | null
  manufacturer?: string | null
  strength?: string | null
  form?: MedicineForm | null
  category?: string | null
  therapeutic_group?: string | null
  current_stock?: number | null
  unit_price?: number | null
  cost_price?: number | null
  batch_number?: string | null
  expiry_date?: string | null
  low_stock_threshold?: number | null
}

export interface MedicineSearchResult extends Medicine {
  rank?: number
  barcode_number?: string | null
}

export interface SaleItem {
  medicine_id: string
  medicine_name: string
  generic_name: string
  brand_name?: string | null
  manufacturer?: string | null
  quantity: number
  unit_price: number
  total_amount: number
  batch_number?: string | null
  expiry_date?: string | null
}

export interface Sale {
  id: string
  pharmacy_id: string
  created_by: string
  assisted_by?: string | null
  customer_id?: string | null
  customer_name?: string | null
  bill_number: string
  items: SaleItem[]
  subtotal: number
  discount_percentage: number
  discount_amount: number
  tax_percentage: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  due_amount: number
  payment_method: PaymentMethod
  status: SaleStatus
  notes?: string | null
  created_at: string
  completed_at?: string | null
}

export interface Customer {
  id: string
  pharmacy_id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  date_of_birth?: string | null
  gender?: Gender | null
  total_due: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StockItem {
  id: string
  pharmacy_id: string
  medicine_id: string
  medicine: Medicine
  quantity: number
  unit_price: number
  cost_price: number
  batch_number?: string | null
  expiry_date?: string | null
  manufacture_date?: string | null
  supplier?: string | null
  minimum_stock: number
  location?: string | null
  last_updated: string
}

export interface LowStockItem {
  medicine_id: string
  generic_name: string
  brand_name: string
  current_quantity: number
  threshold: number
  batch_number: string | null
  expiry_date: string | null
}

export interface DailyReport {
  total_sales: number
  total_transactions: number
  total_due: number
  top_medicines: {
    medicine_name: string
    quantity: string
    total_amount: string
  }[]
  low_stock_count: number
}

export interface User {
  id: string
  email: string
  phone?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role?: UserRole | null
  pharmacy_id?: string | null
  pharmacy_name?: string | null
}

export interface Pharmacy {
  id: string
  name: string
  license_number?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  owner_id: string
  settings: {
    currency?: string
    tax_rate?: number
    low_stock_threshold?: number
    auto_backup?: boolean
    [key: string]: any
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  total_pages: number
}

// Form types
export interface MedicineFormData {
  generic_name: string
  brand_name?: string
  manufacturer?: string
  strength?: string
  form?: MedicineForm
  category?: string
  therapeutic_group?: string
  barcode_number?: string
}

export interface StockFormData {
  medicine_id: string
  quantity: number
  unit_price: number
  cost_price: number
  batch_number?: string
  expiry_date?: string
  manufacture_date?: string
  supplier?: string
  minimum_stock?: number
  location?: string
}

export interface CustomerFormData {
  name: string
  phone?: string
  email?: string
  address?: string
  date_of_birth?: string
  gender?: Gender
}

export interface SaleFormData {
  customer_id?: string
  items: SaleItem[]
  discount_percentage?: number
  discount_amount?: number
  tax_percentage?: number
  payment_method: PaymentMethod
  paid_amount: number
  notes?: string
}

// State management types
export interface AppState {
  user: User | null
  pharmacy: Pharmacy | null

  isLoading: boolean
  error: string | null
}

export interface MedicineState {
  medicines: Medicine[]
  searchResults: MedicineSearchResult[]
  isSearching: boolean
  selectedMedicine: Medicine | null
}

export interface StockState {
  stockItems: StockItem[]
  lowStockItems: LowStockItem[]
  isLoading: boolean
  lastUpdated: string | null
}

export interface SaleState {
  currentSale: Partial<Sale>
  saleItems: SaleItem[]
  recentSales: Sale[]
  isProcessing: boolean
}

export interface CustomerState {
  customers: Customer[]
  selectedCustomer: Customer | null
  searchResults: Customer[]
  isLoading: boolean
}