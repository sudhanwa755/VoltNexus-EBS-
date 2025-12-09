
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/+esm';
import { CONFIG } from './config.js';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
