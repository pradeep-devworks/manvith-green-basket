import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "../constants/colors";

export type AppTab = "shop" | "orders" | "cart" | "account";

const TABS: { id: AppTab; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "orders", label: "Orders" },
  { id: "cart", label: "Cart" },
  { id: "account", label: "Account" },
];

function TabIcon({ tab, color }: { tab: AppTab; color: string }) {
  if (tab === "shop") return (
    <View style={styles.homeIcon}>
      <View style={[styles.roof, { borderColor: color }]} />
      <View style={[styles.house, { borderColor: color }]} />
    </View>
  );
  if (tab === "orders") return (
    <View style={[styles.document, { borderColor: color }]}>
      <View style={[styles.documentLine, { backgroundColor: color }]} />
      <View style={[styles.documentLine, { backgroundColor: color }]} />
      <View style={[styles.documentLineShort, { backgroundColor: color }]} />
    </View>
  );
  if (tab === "cart") return (
    <View style={styles.cartIcon}>
      <View style={[styles.cartHandle, { backgroundColor: color }]} />
      <View style={[styles.cartBasket, { borderColor: color }]} />
      <View style={[styles.cartWheel, { backgroundColor: color, left: 7 }]} />
      <View style={[styles.cartWheel, { backgroundColor: color, right: 5 }]} />
    </View>
  );
  return (
    <View style={styles.accountIcon}>
      <View style={[styles.accountHead, { borderColor: color }]} />
      <View style={[styles.accountShoulders, { borderColor: color }]} />
    </View>
  );
}

export default function BottomNavigation({
  active,
  cartCount = 0,
  onSelect,
}: {
  active: AppTab;
  cartCount?: number;
  onSelect: (tab: AppTab) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.id)}
            style={styles.tab}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
              <TabIcon tab={tab.id} color={selected ? colors.primary : colors.secondaryText} />
              {tab.id === "cart" && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.labelRow}>
              <Text style={[styles.label, selected && styles.activeLabel]}>{tab.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: { flex: 1, minHeight: 70, alignItems: "center", justifyContent: "center", gap: 4 },
  iconWrap: { width: 44, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  iconWrapSelected: { backgroundColor: colors.lightGreen },
  labelRow: { minHeight: 18, flexDirection: "row", alignItems: "center" },
  label: { color: colors.secondaryText, fontSize: 12, fontWeight: "600" },
  activeLabel: { color: colors.primary, fontWeight: "800" },
  badge: { position: "absolute", top: -3, right: -5, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: "800" },
  homeIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "flex-end" },
  roof: { position: "absolute", top: 3, width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2, transform: [{ rotate: "45deg" }] },
  house: { width: 14, height: 11, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  document: { width: 16, height: 20, borderWidth: 2, borderRadius: 3, paddingTop: 5, paddingHorizontal: 3, gap: 2 },
  documentLine: { height: 1.5, borderRadius: 1 },
  documentLineShort: { width: 6, height: 1.5, borderRadius: 1 },
  cartIcon: { width: 24, height: 22, position: "relative" },
  cartHandle: { position: "absolute", width: 5, height: 2, top: 3, left: 1, transform: [{ rotate: "18deg" }] },
  cartBasket: { position: "absolute", top: 5, left: 6, width: 15, height: 10, borderWidth: 2, borderTopWidth: 1, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, transform: [{ skewX: "-8deg" }] },
  cartWheel: { position: "absolute", bottom: 1, width: 4, height: 4, borderRadius: 2 },
  accountIcon: { width: 23, height: 23, alignItems: "center", justifyContent: "center" },
  accountHead: { width: 8, height: 8, borderWidth: 2, borderRadius: 4 },
  accountShoulders: { width: 17, height: 9, marginTop: 2, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
});
