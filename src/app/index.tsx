
import { useEffect } from "react";

import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import BrandLogo from "../components/BrandLogo";
import colors from "../constants/colors";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/welcome");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.logoContainer}>
        <BrandLogo />

        <Text style={styles.tagline}>
          Fresh Vegetables at Your Doorstep
        </Text>

        <Text style={styles.telugu}>
          తాజా కూరగాయలు మీ ఇంటి వద్దకు
        </Text>
      </View>

      <Text style={styles.footer}>
        Freshness You Can Trust
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  logoContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },

  tagline: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    marginTop: 20,
  },

  telugu: {
    fontSize: 15,
    color: colors.white,
    marginTop: 10,
  },

  footer: {
    position: "absolute",
    bottom: 45,
    fontSize: 13,
    color: colors.white,
  },
});
