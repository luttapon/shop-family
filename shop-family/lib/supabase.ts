import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://iwbjucmcwwglybtowlgm.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Ymp1Y21jd3dnbHlidG93bGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzM0NDYsImV4cCI6MjA5MDI0OTQ0Nn0.XWVmw2pY6EwsI8VeGLYZ14uTiooK_hmGhj4nUN67pT0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
