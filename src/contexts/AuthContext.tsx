import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  realm_id: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  currentRealmId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'user' | 'admin') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentRealm, setCurrentRealm] = useState<Realm | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {

      // console.log('Auth state changed. Current user:', user);
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, realm_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserProfile(data);
        console.log('Fetched user profile:', data);
        // setCurrentRealmId(data.realm_id);
      }


         let realmToSet: Realm | null = null;
      console.log('Fetched realm members data:', data);
     const { data: realmsData1, error: realmsError } = await supabase
          .from('realms')
          .select('*')
          .eq('id', data.realm_id);
console.log('Realms data loaded for user:', realmsData1);
 realmToSet = realmsData1?.[0] || null;
  if (realmsError) throw realmsError;
 setCurrentRealm(realmToSet);
  console.log('set realm data:', realmToSet);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'user' | 'admin') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role
        });

      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserProfile(null);
  setCurrentRealm(null);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, currentRealm, loading, signIn, signUp, signOut, setCurrentRealm }}>
      {children}
    </AuthContext.Provider>
  );
};
