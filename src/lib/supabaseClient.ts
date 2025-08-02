import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      workflows: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
          last_run_at: string | null;
          nodes: any[];
          connections: any[];
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          last_run_at?: string | null;
          nodes?: any[];
          connections?: any[];
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          last_run_at?: string | null;
          nodes?: any[];
          connections?: any[];
        };
      };
    };
  };
};