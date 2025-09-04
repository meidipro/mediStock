import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, Pharmacy } from '../lib/types';

interface AuthContextType {
  user: User | null;
  pharmacy: Pharmacy | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signUpWithPharmacy: (email: string, password: string, fullName: string, pharmacyData: Partial<Pharmacy>) => Promise<{ error: string | null }>;
  createPharmacyForUser: (pharmacyData: Partial<Pharmacy>) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      console.log('🔍 Fetching user data for:', userId);
      
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) {
        console.log('❌ No auth user found');
        setUser(null);
        setPharmacy(null);
        return;
      }
      
      console.log('✅ Auth user found:', authUser.user.email);
      
      // Test basic connectivity first
      console.log('🧪 Testing database connectivity...');
      const { data: testData, error: testError } = await supabase
        .from('pharmacies')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Database connectivity test failed:', testError);
        throw new Error(`Database error: ${testError.message}`);
      }
      
      console.log('✅ Database connectivity test passed');
      
      // Simple query: Get pharmacy where current user is owner (get the latest one only)
      console.log('🏥 Querying pharmacy for user:', userId);
      const { data: pharmacyData, error: pharmacyError } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pharmacyError) {
        console.error('❌ Error fetching pharmacy:', pharmacyError);
        console.error('Error code:', pharmacyError.code);
        console.error('Error details:', pharmacyError.details);
        console.error('Error hint:', pharmacyError.hint);
        
        // Don't throw error, just continue without pharmacy
        console.log('⚠️ Continuing without pharmacy due to error');
      }
      
      console.log('🏥 Pharmacy query result:', pharmacyData ? `Found: ${pharmacyData.name}` : 'None found');
      
      // Create user profile
      const userProfile: User = {
        id: userId,
        email: authUser.user.email || '',
        phone: authUser.user.phone,
        full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name,
        avatar_url: authUser.user.user_metadata?.avatar_url,
        role: 'owner', // Always owner in simplified model
        pharmacy_id: pharmacyData ? pharmacyData.id : null,
        pharmacy_name: pharmacyData ? pharmacyData.name : null,
      };

      console.log('👤 Setting user profile:', userProfile.email, userProfile.pharmacy_name || 'No pharmacy');
      
      setUser(userProfile);
      setPharmacy(pharmacyData || null);
      
      // CRITICAL: Stop loading once we have user data
      console.log('✅ User data fetched successfully, stopping loading');
      setLoading(false);

    } catch (error) {
      console.error('❌ Error in fetchUserData:', error);
      
      // Set basic user profile even on error
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const basicProfile: User = {
            id: userId,
            email: authUser.user.email || '',
            phone: authUser.user.phone,
            full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name,
            avatar_url: authUser.user.user_metadata?.avatar_url,
            role: 'owner',
            pharmacy_id: null,
            pharmacy_name: null,
          };
          console.log('🔧 Setting basic user profile due to error:', basicProfile.email);
          setUser(basicProfile);
          setPharmacy(null);
          
          // Stop loading even on error
          console.log('⚠️ Setting loading to false due to error');
          setLoading(false);
        }
      } catch (fallbackError) {
        console.error('💥 Error in fallback user setup:', fallbackError);
        setUser(null);
        setPharmacy(null);
        
        // Always stop loading, even on complete failure
        console.log('💥 Stopping loading due to complete failure');
        setLoading(false);
      }
    }
  }, []);

  // Initialize auth state - SIMPLIFIED: Fixed infinite loops
  useEffect(() => {
    let isMounted = true;
    let initializationTimeout: number;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        setLoading(true);
        
        // Add timeout to prevent infinite loading - SHORTENED
        initializationTimeout = window.setTimeout(() => {
          if (isMounted) {
            console.log('⚠️ Auth initialization timeout - forcing loading to false');
            setLoading(false);
          }
        }, 5000); // 5 second timeout (shorter)
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('📋 Current session:', currentSession ? 'Found' : 'None');
        
        if (!isMounted) return;
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        } else {
          // No session, stop loading immediately
          console.log('❌ No session found, stopping loading');
          if (isMounted) setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        // Force stop loading on error
        if (isMounted) setLoading(false);
      } finally {
        if (initializationTimeout) {
          window.clearTimeout(initializationTimeout);
        }
        if (isMounted) {
          console.log('✅ Auth initialization complete');
        }
      }
    };

    initializeAuth();

    // TEMPORARILY DISABLED: Auth state change listener to stop infinite loading
    console.log('⚠️ Auth state change listener DISABLED to prevent tab switching loops');
    
    /* DISABLED TO PREVENT INFINITE LOADING
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔄 Auth state change:', event);
        // This was causing infinite loading when switching tabs
      }
    );
    */
    
    const subscription = { unsubscribe: () => {} }; // Dummy subscription

    return () => {
      isMounted = false;
      if (initializationTimeout) {
        window.clearTimeout(initializationTimeout);
      }
      // subscription.unsubscribe(); // DISABLED
    };
  }, []); // FIXED: Empty dependency array to prevent infinite loops

  // DISABLED: Visibility change handler that was causing infinite loops
  // The app should work without constantly refreshing when tabs change
  /*
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible - but no auto refresh to prevent loops');
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);
  */

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in user:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error.message);
        return { error: error.message };
      }

      console.log('✅ Sign in successful');
      return { error: null };
    } catch (error) {
      console.error('💥 Sign in exception:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('📝 Signing up user (basic):', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error.message);
        return { error: error.message };
      }

      console.log('✅ Basic sign up successful');
      return { error: null };
    } catch (error) {
      console.error('💥 Sign up exception:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signUpWithPharmacy = async (email: string, password: string, fullName: string, pharmacyData: Partial<Pharmacy>) => {
    try {
      console.log('🏥 Signing up user with pharmacy:', email, pharmacyData.name);
      setLoading(true);
      
      // Step 1: Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        console.error('❌ User sign up error:', authError.message);
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: 'Failed to create user account' };
      }

      console.log('✅ User created successfully, creating pharmacy...');

      // Step 2: Create pharmacy immediately
      const { data: pharmacyDataResult, error: pharmacyError } = await supabase
        .from('pharmacies')
        .insert({
          name: pharmacyData.name!,
          license_number: pharmacyData.license_number || null,
          address: pharmacyData.address || null,
          phone: pharmacyData.phone || null,
          email: pharmacyData.email || email,
          owner_id: authData.user.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pharmacyError) {
        console.error('❌ Pharmacy creation error:', pharmacyError);
        // Don't return error here, user is already created
        console.log('⚠️ User created but pharmacy creation failed - user can create pharmacy later');
      } else {
        console.log('✅ Pharmacy created successfully:', pharmacyDataResult.name);
      }

      console.log('✅ Sign up with pharmacy completed');
      return { error: null };
    } catch (error) {
      console.error('💥 Sign up with pharmacy exception:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const createPharmacyForUser = async (pharmacyData: Partial<Pharmacy>) => {
    try {
      console.log('🏥 Creating pharmacy for existing user:', pharmacyData.name);
      
      if (!session?.user) {
        return { error: 'User not authenticated' };
      }

      setLoading(true);

      // Create pharmacy for existing user
      const { data: pharmacyDataResult, error: pharmacyError } = await supabase
        .from('pharmacies')
        .insert({
          name: pharmacyData.name!,
          license_number: pharmacyData.license_number || null,
          address: pharmacyData.address || null,
          phone: pharmacyData.phone || null,
          email: pharmacyData.email || session.user.email,
          owner_id: session.user.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pharmacyError) {
        console.error('❌ Pharmacy creation error:', pharmacyError);
        return { error: pharmacyError.message };
      }

      console.log('✅ Pharmacy created successfully for existing user:', pharmacyDataResult.name);
      
      // Refresh user data to include new pharmacy
      await fetchUserData(session.user.id);
      
      return { error: null };
    } catch (error) {
      console.error('💥 Create pharmacy for user exception:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      setLoading(true);
      
      // Clear local state first
      setUser(null);
      setPharmacy(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('💥 Sign out exception:', error);
      // Clear state anyway
      setUser(null);
      setPharmacy(null);
    } finally {
      setLoading(false);
    }
  };


  const refreshUser = async () => {
    if (session?.user) {
      console.log('🔄 Refreshing user data...');
      setLoading(true);
      await fetchUserData(session.user.id);
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    pharmacy,
    session,
    loading,
    signIn,
    signUp,
    signUpWithPharmacy,
    createPharmacyForUser,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};