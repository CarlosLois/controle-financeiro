import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  registerOrganization: (data: {
    document: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<{ error: Error | null }>;
  setPassword: (password: string) => Promise<{ error: Error | null }>;
  checkPasswordSet: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const registerOrganization = async (data: {
    document: string;
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      // 1. Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // 2. Create the organization using service role through RPC or direct insert
      // Since user is new and has no org yet, we need to use a special approach
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          document: data.document,
          name: data.name,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Add user as admin of the organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          role: 'admin',
          password_set: true,
        });

      if (memberError) throw memberError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const setPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    
    if (!error && user) {
      // Update password_set flag
      await supabase
        .from('organization_members')
        .update({ password_set: true })
        .eq('user_id', user.id);
    }
    
    return { error: error as Error | null };
  };

  const checkPasswordSet = async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data } = await supabase
      .from('organization_members')
      .select('password_set')
      .eq('user_id', user.id)
      .single();
    
    return data?.password_set ?? false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      registerOrganization,
      setPassword,
      checkPasswordSet
    }}>
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
