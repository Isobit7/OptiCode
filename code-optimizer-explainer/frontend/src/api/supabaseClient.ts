import { createClient } from "@supabase/supabase-js";
import { loginGoogle } from "@/api/backend";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://placeholder-project.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Automatically sync Supabase OAuth sessions (e.g. Google) with FastAPI database auth
if (typeof window !== "undefined" && import.meta.env.VITE_SUPABASE_URL) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
      const user = session.user;
      try {
        const email = user.email || undefined;
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || undefined;
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined;
        const idToken = session.access_token;

        const res = await loginGoogle(email, fullName, avatarUrl, idToken);
        if (res?.user) {
          localStorage.setItem("opticode_user", JSON.stringify(res.user));
          if (res.access_token) {
            localStorage.setItem("opticode_auth_token", res.access_token);
          }
        }
      } catch (err) {
        console.warn("FastAPI backend Google OAuth session sync warning:", err);
      }
    }
  });
}

