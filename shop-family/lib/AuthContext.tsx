import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Family, Profile } from './types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  family: Family | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    familyName?: string,
    inviteCode?: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndFamily(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndFamily(session.user.id);
      } else {
        setProfile(null);
        setFamily(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfileAndFamily(userId: string) {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      // Fetch family membership
      const { data: memberData } = await supabase
        .from('family_members')
        .select('family_id, families(*)')
        .eq('user_id', userId)
        .single();

      if (memberData?.families) {
        setFamily(memberData.families as unknown as Family);
      }
    } catch (err) {
      console.log('Error fetching profile/family:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshFamily() {
    if (user) {
      await fetchProfileAndFamily(user.id);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    familyName?: string,
    inviteCode?: string
  ) {
    // 1. Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) return { error: authError };

    // Supabase returns 200 with empty identities for repeated signups
    if (
      authData.user &&
      authData.user.identities &&
      authData.user.identities.length === 0
    ) {
      // Try to clean up stale auth user (deleted from public tables but still in auth.users)
      const { data: cleaned } = await supabase.rpc('cleanup_stale_auth_user', {
        target_email: email,
      });

      if (cleaned) {
        // Stale user was removed, retry signup
        const { data: retryData, error: retryError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });

        if (retryError) return { error: retryError };

        // Overwrite authData for the rest of the flow
        Object.assign(authData, retryData);
      } else {
        // User still has a profile - truly a duplicate
        return {
          error: { message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' },
        };
      }
    }

    const userId = authData.user?.id;
    if (!userId) return { error: { message: 'ไม่สามารถสร้างบัญชีได้' } };

    // 2. Join family by invite code OR create new family
    if (inviteCode) {
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (familyError || !familyData) {
        return { error: { message: 'รหัสครอบครัวไม่ถูกต้อง' } };
      }

      const { error: memberError } = await supabase
        .from('family_members')
        .insert({ family_id: familyData.id, user_id: userId, role: 'member' });

      if (memberError) return { error: memberError };
    } else if (familyName) {
      // Generate invite code
      const code = generateInviteCode();

      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName, invite_code: code })
        .select()
        .single();

      if (familyError) return { error: familyError };

      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: newFamily.id,
          user_id: userId,
          role: 'admin',
        });

      if (memberError) return { error: memberError };
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setFamily(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        family,
        loading,
        signIn,
        signUp,
        signOut,
        refreshFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
