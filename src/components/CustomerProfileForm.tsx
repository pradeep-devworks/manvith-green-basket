import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import colors from "../constants/colors";
import { supabase } from "../lib/supabase";
import { getCustomerProfile, getGoogleProfileDefaults, saveCustomerProfile } from "../services/profileService";

export default function CustomerProfileForm({
  mode,
  onSaved,
}: {
  mode: "setup" | "edit";
  onSaved: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data.user;
        if (!user) {
          router.replace("/welcome");
          return;
        }

        const defaults = getGoogleProfileDefaults(user);
        const profile = await getCustomerProfile(user.id);
        if (!active) return;
        setEmail(user.email ?? "");
        setFullName(profile?.full_name || defaults.fullName);
        setPhone(profile?.phone ?? "");
        setAddress(profile?.address ?? "");
        setAvatarUrl(defaults.avatarUrl);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Could not load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    return () => { active = false; };
  }, [router]);

  const handleSave = async () => {
    setSavedMessage("");
    const name = fullName.trim();
    if (!name) {
      setErrorMessage("Enter your name to continue.");
      return;
    }
    const normalizedPhone = phone.trim();
    if (normalizedPhone && !/^[+\d\s()-]{7,20}$/.test(normalizedPhone)) {
      setErrorMessage("Enter a valid phone number, or leave it blank.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      await saveCustomerProfile({ fullName: name, phone: normalizedPhone, address });
      if (mode === "edit") setSavedMessage("Your profile has been updated.");
      onSaved();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSaving(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/welcome");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Loading your profile...</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <View style={styles.avatar}>
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarFallback}>{fullName.trim().charAt(0).toUpperCase() || "G"}</Text>}
        </View>
        <Text style={styles.title}>{mode === "setup" ? "A few details" : "Your profile"}</Text>
        <Text style={styles.subtitle}>{mode === "setup" ? "Personalize your account before you start shopping." : "Keep your contact and delivery details up to date."}</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>Full name <Text style={styles.required}>*</Text></Text>
        <TextInput value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#829184" style={styles.input} autoCapitalize="words" maxLength={80} returnKeyType="next" />

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput value={email} editable={false} selectTextOnFocus={false} style={[styles.input, styles.readOnlyInput]} accessibilityLabel="Email address, read only" />
        <Text style={styles.helper}>Your Google account email can’t be changed here.</Text>

        <Text style={styles.fieldLabel}>Phone number <Text style={styles.optional}>Optional</Text></Text>
        <TextInput value={phone} onChangeText={setPhone} placeholder="Add a phone number" placeholderTextColor="#829184" style={styles.input} keyboardType="phone-pad" maxLength={20} />

        <Text style={styles.fieldLabel}>Delivery address <Text style={styles.optional}>Optional</Text></Text>
        <TextInput value={address} onChangeText={setAddress} placeholder="House number, street, area" placeholderTextColor="#829184" style={[styles.input, styles.addressInput]} multiline textAlignVertical="top" maxLength={300} />

        {errorMessage.length > 0 && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
        {savedMessage.length > 0 && <Text accessibilityRole="alert" style={styles.success}>{savedMessage}</Text>}

        <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => [styles.saveButton, pressed && !saving && styles.pressed, saving && styles.disabled]}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>{mode === "setup" ? "Save and continue" : "Save changes"}</Text>}
        </Pressable>

        {mode === "edit" && (
          <Pressable onPress={handleSignOut} disabled={saving} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 30 },
  intro: { alignItems: "center", marginBottom: 23 },
  avatar: { width: 74, height: 74, borderRadius: 37, marginBottom: 14, backgroundColor: colors.lightGreen, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: { color: colors.primary, fontSize: 28, fontWeight: "800" },
  title: { color: colors.darkText, fontSize: 25, fontWeight: "900", textAlign: "center" },
  subtitle: { color: colors.secondaryText, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6, maxWidth: 300 },
  formCard: { padding: 18, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  fieldLabel: { marginTop: 12, marginBottom: 7, color: colors.darkText, fontSize: 13, fontWeight: "800" },
  required: { color: colors.primary },
  optional: { color: colors.secondaryText, fontSize: 11, fontWeight: "500" },
  input: { minHeight: 48, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FBFCF9", color: colors.darkText, fontSize: 14 },
  readOnlyInput: { color: colors.secondaryText, backgroundColor: "#F1F4EF" },
  helper: { marginTop: 5, color: colors.secondaryText, fontSize: 11 },
  addressInput: { minHeight: 88, paddingTop: 12 },
  error: { marginTop: 12, color: "#B3261E", fontSize: 12, lineHeight: 17 },
  success: { marginTop: 12, color: colors.primary, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  saveButton: { minHeight: 50, marginTop: 20, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.7 },
  signOutButton: { minHeight: 48, marginTop: 8, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  signOutText: { color: "#A33B32", fontSize: 14, fontWeight: "800" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: colors.secondaryText, fontSize: 13 },
});
