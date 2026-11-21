import { StatusBar, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNavigation, { type AppTab } from "../components/BottomNavigation";
import CustomerProfileForm from "../components/CustomerProfileForm";
import colors from "../constants/colors";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const selectTab = (tab: AppTab) => {
    if (tab === "account") return;
    const section = tab === "orders" || tab === "cart" ? tab : "shop";
    router.navigate({
      pathname: "/home",
      params: { section },
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.kicker}>GREENBASKET</Text>
        <Text style={styles.heading}>Account</Text>
      </View>
      <CustomerProfileForm mode="edit" onSaved={() => undefined} />
      <BottomNavigation active="account" onSelect={selectTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  heading: { marginTop: 5, color: colors.darkText, fontSize: 27, fontWeight: "900" },
});
