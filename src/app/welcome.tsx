
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import colors from "../constants/colors";
import useResponsive from "../hooks/useResponsive";
import { supabase } from "../lib/supabase";
import { completeGoogleSignIn, signInWithGoogle } from "../services/googleAuth";
import { getCustomerProfile } from "../services/profileService";

export default function WelcomeScreen() {
  const router = useRouter();
  const responsive = useResponsive();

  const [language, setLanguage] = useState<"EN" | "TE">("EN");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const isEnglish = language === "EN";

  // Continue without creating an account
  const handleGuest = () => {
    router.push("/home");
  };

  useEffect(() => {
    let hasRedirected = false;
    const redirectIfSignedIn = async (session: { user: { id: string } } | null) => {
      if (!session || hasRedirected) return;
      hasRedirected = true;
      try {
        const profile = await getCustomerProfile(session.user.id);
        router.replace(profile?.full_name.trim() ? "/home" : "/profile-setup");
      } catch (error) {
        hasRedirected = false;
        Alert.alert("Profile unavailable", error instanceof Error ? error.message : "Could not load your profile.");
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectIfSignedIn(session);
    });

    void supabase.auth.getSession().then(({ data }) => {
      redirectIfSignedIn(data.session);
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const callbackUrl = window.location.href;
    if (!/[?#](?:.*&)?(?:code|access_token|error)=/.test(callbackUrl)) return;

    completeGoogleSignIn(callbackUrl)
      .then((session) => {
        if (!session) throw new Error("Could not create a sign-in session.");
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error: unknown) => {
        Alert.alert("Google sign-in failed", error instanceof Error ? error.message : "Please try again.");
      });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert("Google sign-in failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsive.horizontalPadding,
            paddingBottom: responsive.footerHeight + 15,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Language Selector */}
        <View style={styles.topBar}>
          <View style={styles.languageSelector}>

            <Pressable
              onPress={() => setLanguage("EN")}
              style={[
                styles.languageOption,
                isEnglish && styles.activeLanguage,
              ]}
            >
              <Text
                style={[
                  styles.languageText,
                  isEnglish && styles.activeLanguageText,
                ]}
              >
                EN
              </Text>
            </Pressable>

            <Text style={styles.languageDivider}>|</Text>

            <Pressable
              onPress={() => setLanguage("TE")}
              style={[
                styles.languageOption,
                !isEnglish && styles.activeLanguage,
              ]}
            >
              <Text
                style={[
                  styles.languageText,
                  !isEnglish && styles.activeLanguageText,
                ]}
              >
                తెలుగు
              </Text>
            </Pressable>

          </View>
        </View>

        {/* Brand Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/brand-logo.png")}
            style={{
              width: responsive.logoWidth,
              height: responsive.logoHeight,
              alignSelf: "center",
            }}
            resizeMode="contain"
          />
        </View>

        {/* Welcome Content */}
        <View style={styles.welcomeContainer}>

          <Text style={styles.welcomeTitle}>
            {isEnglish ? "Welcome!" : "స్వాగతం!"}
          </Text>

          <Text style={styles.teluguTitle}>
            మన్విత్ గ్రీన్ బాస్కెట్ కి స్వాగతం!
          </Text>

          <Text style={styles.description}>
            {isEnglish
              ? "Order fresh vegetables, fruits & more\nfrom your local store."
              : "మీ స్థానిక దుకాణం నుండి తాజా కూరగాయలు,\nపండ్లు మరియు మరిన్ని ఆర్డర్ చేయండి."}
          </Text>

        </View>

        {/* Guest and Google Sign-In Options */}
        <View style={styles.buttonContainer}>

          {/* Continue as Guest */}
          <Pressable
            style={({ pressed }) => [
              styles.guestButton,
              {
                minHeight: responsive.buttonHeight,
              },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleGuest}
          >
            <Text style={styles.guestButtonText}>
              {isEnglish
                ? "Continue as Guest"
                : "అతిథిగా కొనసాగండి"}
            </Text>
          </Pressable>

          {/* Continue with Google */}
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              {
                minHeight: responsive.buttonHeight,
              },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            <Text style={styles.googleButtonText}>
              {isEnglish
                ? (isSigningIn ? "Connecting to Google..." : "G  Continue with Google")
                : "G  Google తో కొనసాగండి"}
            </Text>
          </Pressable>

          <Text style={styles.loginNote}>
            {isEnglish
              ? "No account required to explore our store"
              : "మా దుకాణాన్ని చూడటానికి ఖాతా అవసరం లేదు"}
          </Text>

        </View>

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>

          <View style={styles.featureCard}>
            <View style={styles.featureIconCircle}>
              <Text style={styles.featureIcon}>🥬</Text>
            </View>

            <Text style={styles.featureTitle}>
              {isEnglish
                ? "Fresh\nVegetables"
                : "తాజా\nకూరగాయలు"}
            </Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureCard}>
            <View style={styles.featureIconCircle}>
              <Text style={styles.featureIcon}>🚚</Text>
            </View>

            <Text style={styles.featureTitle}>
              {isEnglish
                ? "Home\nDelivery"
                : "ఇంటి వద్దకు\nడెలివరీ"}
            </Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureCard}>
            <View style={styles.featureIconCircle}>
              <Text style={styles.featureIcon}>🛡️</Text>
            </View>

            <Text style={styles.featureTitle}>
              {isEnglish
                ? "Trusted\nQuality"
                : "నమ్మకమైన\nనాణ్యత"}
            </Text>
          </View>

        </View>

        {/* Bottom Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>
            Freshness You Can Trust
          </Text>
        </View>

      </ScrollView>

      {/* Vegetable Footer */}
      <View
        pointerEvents="none"
        style={[
          styles.footerDecoration,
          {
            height: responsive.footerHeight,
          },
        ]}
      >

        {/* Back Wave */}
        <View
          style={[
            styles.waveBack,
            {
              height: responsive.footerHeight * 0.75,
            },
          ]}
        />

        {/* Front Wave */}
        <View
          style={[
            styles.waveFront,
            {
              height: responsive.footerHeight * 0.48,
            },
          ]}
        />

        {/* Vegetable Image */}
        <Image
          source={require("../../assets/images/vegetable-footer.png")}
          style={[
            styles.footerImage,
            {
              height: responsive.footerHeight * 0.88,
            },
          ]}
          resizeMode="contain"
        />

      </View>

    </View>
  );
}



const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 60,
  },

  // Language Selector
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },

  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 30,
    padding: 4,
  },

  languageOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  activeLanguage: {
    backgroundColor: colors.primary,
  },

  languageText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  activeLanguageText: {
    color: colors.white,
  },

  languageDivider: {
    color: colors.secondary,
    fontWeight: "700",
  },

  // Logo
  logoContainer: {
    alignItems: "center",
    marginTop: 8,
  },

  // Welcome Content
  welcomeContainer: {
    alignItems: "center",
    marginTop: 4,
  },

  welcomeTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.primary,
  },

  teluguTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 8,
    textAlign: "center",
  },

  description: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 16,
  },

  // Authentication Options
  buttonContainer: {
    width: "100%",
    marginTop: 30,
    gap: 14,
  },

  guestButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  guestButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
  },

  googleButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  googleButtonText: {
    color: colors.darkText,
    fontSize: 16,
    fontWeight: "700",
  },

  loginNote: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: "center",
    marginTop: 2,
  },

  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  // Feature Cards
  featuresContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 34,
  },

  featureCard: {
    flex: 1,
    alignItems: "center",
  },

  featureIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lightGreen,
    alignItems: "center",
    justifyContent: "center",
  },

  featureIcon: {
    fontSize: 29,
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.darkText,
    textAlign: "center",
    marginTop: 9,
    lineHeight: 19,
  },

  featureDivider: {
    width: 1,
    height: 65,
    backgroundColor: colors.secondary,
    opacity: 0.35,
  },

  // Tagline
  taglineContainer: {
    alignItems: "center",
    marginTop: 30,
  },

  tagline: {
    color: colors.primary,
    backgroundColor: colors.lightGreen,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    fontSize: 15,
    fontWeight: "800",
    fontStyle: "italic",
  },

  // Footer Decoration
  footerDecoration: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "transparent",
    zIndex: 10,
  },

  waveBack: {
    position: "absolute",
    bottom: 0,
    left: -40,
    right: -40,
    backgroundColor: "#E8F5E9",
    borderTopLeftRadius: 150,
    borderTopRightRadius: 150,
  },

  waveFront: {
    position: "absolute",
    bottom: 0,
    left: -50,
    right: -50,
    backgroundColor: "#D5EDB8",
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },

  footerImage: {
    width: "100%",
    alignSelf: "center",
    zIndex: 2,
  },

});
