// Frontend Supabase client — used ONLY for optional login/auth.
// All data reads/writes go through the FastAPI backend instead.
// Uses the public "anon" key only — never the service key here.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
