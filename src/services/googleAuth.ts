import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

function readCallbackParams(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const hashParams = new URLSearchParams(url.hash.slice(1));
  const queryParams = new URLSearchParams(url.search);
  const params = hashParams.has("access_token") || hashParams.has("error")
    ? hashParams
    : queryParams;

  const error = params.get("error_description") ?? params.get("error");
  if (error) throw new Error(error);

  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    code: params.get("code"),
  };
}

export async function completeGoogleSignIn(callbackUrl: string) {
  const { accessToken, refreshToken, code } = readCallbackParams(callbackUrl);

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data.session;
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  throw new Error("Google sign-in did not return a valid session.");
}

export async function signInWithGoogle(): Promise<boolean | void> {
  const redirectTo = Platform.OS === "web"
    ? `${window.location.origin}/welcome`
    : Linking.createURL("google-auth");
    console.log("Google OAuth Redirect URL:", redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;

  if (Platform.OS === "web") {
    window.location.assign(data.url);
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "cancel" || result.type === "dismiss") return false;
  if (result.type !== "success") throw new Error("Google sign-in was interrupted.");

  const session = await completeGoogleSignIn(result.url);
  if (!session) throw new Error("Could not create a sign-in session.");
  return true;
}
