import { StatusBar, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomerProfileForm from "../components/CustomerProfileForm";
import colors from "../constants/colors";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <CustomerProfileForm mode="setup" onSaved={() => router.replace("/home")} />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background } });
