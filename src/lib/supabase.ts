import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null mientras no haya .env: la calculadora funciona igual y el resto muestra cómo configurarlo.
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
