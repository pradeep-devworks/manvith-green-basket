import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";

import { completeGoogleSignIn } from "../services/googleAuth";
import { getCustomerProfile } from "../services/profileService";

export default function GoogleAuthCallback() {
  const router = useRouter();
  const callbackUrl = Linking.useLinkingURL();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!callbackUrl) return;
    let active = true;

    const finishSignIn = async () => {
      try {
        const session = await completeGoogleSignIn(callbackUrl);
        if (!session) throw new Error("Could not create a sign-in session.");
        const profile = await getCustomerProfile(session.user.id);
        if (active) router.replace(profile?.full_name.trim() ? "/home" : "/profile-setup");
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Google sign-in could not be completed.");
      }
    };

    void finishSignIn();
    return () => { active = false; };
  }, [callbackUrl, router]);

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <>
          <Text style={styles.title}>Sign-in could not be completed</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <Pressable onPress={() => router.replace("/welcome")} style={styles.button}>
            <Text style={styles.buttonText}>Back to welcome</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.message}>Completing Google sign-in...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAF5", justifyContent: "center", alignItems: "center", padding: 28 },
  title: { color: "#183B2A", fontSize: 21, fontWeight: "800", textAlign: "center" },
  message: { marginTop: 14, color: "#647568", fontSize: 14, textAlign: "center", lineHeight: 21 },
  button: { minHeight: 48, marginTop: 22, paddingHorizontal: 22, borderRadius: 14, backgroundColor: "#1B5E20", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
