const origin = process.env.EXPO_PUBLIC_API_URL || "https://www.traders-rewards.eu";
export const config = {
  apiOrigin: origin.replace(/\/$/, ""),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  allowDemo: process.env.EXPO_PUBLIC_ALLOW_DEMO === "true",
};
export const configurationReady = Boolean(config.supabaseUrl && config.supabaseKey
  && /^https:\/\//.test(config.supabaseUrl) && /^https:\/\//.test(config.apiOrigin));
