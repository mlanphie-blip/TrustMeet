import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = "https://ivjdnrobixctamawajib.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2amRucm9iaXhjdGFtYXdhamliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzA1ODcsImV4cCI6MjA4NzU0NjU4N30.kYOhNm5gMs_ncOVVdFpdz0DaXLZbzFs_gek-vMM7HaI";

const storage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return null;
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") return;
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
