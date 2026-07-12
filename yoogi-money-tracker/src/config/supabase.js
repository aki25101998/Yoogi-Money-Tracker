import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_z4bj2rImApOsky0rBqWBYQ_uzap5bmF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
