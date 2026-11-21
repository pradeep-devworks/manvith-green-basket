import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { User } from "@supabase/supabase-js";
import BottomNavigation, { type AppTab } from "../components/BottomNavigation";
import colors from "../constants/colors";
import { supabase } from "../lib/supabase";
import { getCustomerProfile } from "../services/profileService";

type Product = {
  id: string;
  name: string;
  teluguName: string;
  image: number;
  imageScale?: number;
  category: string;
  description: string;
  color: string;
  quantities: string[];
  prices: number[];
};

type BasketItem = { productId: string; quantityIndex: number; count: number };
type OrderLine = { productId: string; name: string; teluguName: string; image: number; imageScale?: number; quantity: string; count: number; unitPrice: number };
type Order = { id: string; name: string; phone: string; address: string; createdAt: string; total: number; items: OrderLine[] };

const PRODUCTS: Product[] = [
  { id: "green-mirchi", name: "Green Chilli", teluguName: "పచ్చి మిరపకాయలు", image: require("../../assets/images/01_green_mirchi.png"), category: "Green vegetables", description: "Fresh green chillies to add a lively kick to everyday cooking.", color: "#E6F1E2", quantities: ["100 g", "250 g", "500 g"], prices: [12, 28, 52] },
  { id: "tomato", name: "Tomato", teluguName: "టమాటా", image: require("../../assets/images/02_tomato.png"), category: "Everyday essential", description: "Juicy, ripe tomatoes selected for everyday cooking, salads, and chutneys.", color: "#FCE8E3", quantities: ["250 g", "500 g", "1 kg", "2 kg"], prices: [18, 32, 60, 112] },
  { id: "potato", name: "Potato", teluguName: "బంగాళాదుంప", image: require("../../assets/images/04_potato.png"), category: "Everyday essential", description: "Versatile farm potatoes, great for curries, fries, and family favourites.", color: "#F5EBDD", quantities: ["500 g", "1 kg", "2 kg"], prices: [22, 40, 76] },
  { id: "brinjal", name: "Brinjal", teluguName: "వంకాయ", image: require("../../assets/images/03_brinjal.png"), category: "Fresh picks", description: "Glossy, fresh brinjals that soak up the flavour of your favourite masalas.", color: "#EEE7F4", quantities: ["250 g", "500 g", "1 kg"], prices: [20, 38, 72] },
  { id: "onion", name: "Onion", teluguName: "ఉల్లిపాయ", image: require("../../assets/images/05_onion.png"), category: "Everyday essential", description: "Fresh onions with a balanced flavour, ready for your daily meals.", color: "#F4E7F1", quantities: ["250 g", "500 g", "1 kg", "2 kg"], prices: [16, 29, 55, 104] },
  { id: "carrot", name: "Carrot", teluguName: "క్యారెట్", image: require("../../assets/images/06_carrot.png"), category: "Root vegetables", description: "Naturally sweet, crunchy carrots for snacking, salads, and cooking.", color: "#FFF0DF", quantities: ["250 g", "500 g", "1 kg"], prices: [24, 45, 86] },
  { id: "beans", name: "Green Beans", teluguName: "బీన్స్", image: require("../../assets/images/07_beans.png"), category: "Green vegetables", description: "Crisp green beans, ready for a quick and tasty meal.", color: "#E8F2E1", quantities: ["250 g", "500 g", "1 kg"], prices: [24, 45, 86] },
  { id: "ladies-finger", name: "Ladies Finger", teluguName: "బెండకాయ", image: require("../../assets/images/08_ladies_finger.png"), imageScale: 1.9, category: "Fresh picks", description: "Tender ladies finger, carefully picked for curries and stir-fries.", color: "#E8F2E1", quantities: ["250 g", "500 g", "1 kg"], prices: [22, 42, 80] },
  { id: "beetroot", name: "Beetroot", teluguName: "బీట్‌రూట్", image: require("../../assets/images/09_beetroot.png"), category: "Root vegetables", description: "Earthy, naturally sweet beetroot for salads, soups, and sides.", color: "#F4E7F1", quantities: ["250 g", "500 g", "1 kg"], prices: [22, 40, 76] },
  { id: "bitter-gourd", name: "Bitter Gourd", teluguName: "కాకరకాయ", image: require("../../assets/images/10_bitter_gourd.png"), category: "Fresh picks", description: "Fresh bitter gourd, a traditional favourite for home-style curries.", color: "#EAF3E3", quantities: ["250 g", "500 g", "1 kg"], prices: [22, 42, 80] },
  { id: "ridge-gourd", name: "Ridge Gourd", teluguName: "బీరకాయ", image: require("../../assets/images/11_beerakaya_ridge_gourd.png"), category: "Fresh picks", description: "Tender ridge gourd with a mild flavour, ideal for curries and dals.", color: "#E8F2E1", quantities: ["250 g", "500 g", "1 kg"], prices: [20, 38, 72] },
  { id: "cauliflower", name: "Cauliflower", teluguName: "కాలీఫ్లవర్", image: require("../../assets/images/12_cauliflower.png"), category: "Fresh picks", description: "Tender cauliflower, carefully picked for curries and roasting.", color: "#F0F1E5", quantities: ["1 pc", "500 g", "1 kg"], prices: [38, 48, 90] },
  { id: "cabbage", name: "Cabbage", teluguName: "క్యాబేజీ", image: require("../../assets/images/13_cabbage.png"), category: "Fresh picks", description: "Crisp cabbage for salads, stir-fries, and comforting home cooking.", color: "#EAF3E3", quantities: ["1 pc", "500 g", "1 kg"], prices: [30, 42, 78] },
  { id: "lemon", name: "Lemon", teluguName: "నిమ్మకాయ", image: require("../../assets/images/14_lemon.png"), category: "Fresh picks", description: "Zesty lemons to brighten drinks, dressings, and home-cooked meals.", color: "#F5F2D9", quantities: ["2 pcs", "4 pcs", "6 pcs"], prices: [12, 22, 30] },
  { id: "cluster-beans", name: "Cluster Beans", teluguName: "గోరుచిక్కుడు", image: require("../../assets/images/15_cluster_beans.png"), category: "Green vegetables", description: "Fresh cluster beans, a delicious addition to traditional curries.", color: "#E8F2E1", quantities: ["250 g", "500 g", "1 kg"], prices: [24, 45, 86] },
  { id: "chikkudukaya", name: "Chikkudukaya", teluguName: "చిక్కుడుకాయ", image: require("../../assets/images/16_chikkudukaya.png"), category: "Green vegetables", description: "Tender broad beans, a fresh and tasty choice for everyday meals.", color: "#E8F2E1", quantities: ["250 g", "500 g", "1 kg"], prices: [26, 48, 92] },
];

export default function HomeScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ section?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columns = width >= 650 ? 3 : 2;
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(0);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const activeSection = routeParams.section === "orders" || routeParams.section === "cart" ? routeParams.section : "shop";
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [cartFeedback, setCartFeedback] = useState("");
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    let authStateChanged = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authStateChanged = true;
      setAuthUser(session?.user ?? null);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!authStateChanged) setAuthUser(data.session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const userName = typeof authUser?.user_metadata.full_name === "string"
    ? authUser.user_metadata.full_name
    : typeof authUser?.user_metadata.name === "string"
      ? authUser.user_metadata.name
      : authUser?.email?.split("@")[0];
  const userAvatarUrl = typeof authUser?.user_metadata.avatar_url === "string"
    ? authUser.user_metadata.avatar_url
    : typeof authUser?.user_metadata.picture === "string"
      ? authUser.user_metadata.picture
      : null;

  useEffect(() => {
    if (!authUser) return;
    void getCustomerProfile(authUser.id).then((profile) => {
      if (!profile) return;
      setCustomerName((current) => current || profile.full_name);
      setCustomerPhone((current) => current || profile.phone || "");
      setCustomerAddress((current) => current || profile.address || "");
    }).catch((error: unknown) => {
      console.warn("Could not load saved customer details.", error);
    });
  }, [authUser]);

  useEffect(() => {
    if (!cartFeedback) return;
    const timeout = setTimeout(() => setCartFeedback(""), 2200);
    return () => clearTimeout(timeout);
  }, [cartFeedback]);

  const cartCount = basket.reduce((sum, item) => sum + item.count, 0);
  const basketTotal = basket.reduce((sum, item) => {
    const product = PRODUCTS.find((entry) => entry.id === item.productId);
    return sum + (product?.prices[item.quantityIndex] ?? 0) * item.count;
  }, 0);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return PRODUCTS.filter((product) => !normalizedQuery || `${product.name} ${product.teluguName} ${product.category}`.toLowerCase().includes(normalizedQuery));
  }, [query]);

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedQuantity(0);
  };

  const addToBasket = (product: Product, quantityIndex: number) => {
    setBasket((items) => {
      const existing = items.findIndex((item) => item.productId === product.id && item.quantityIndex === quantityIndex);
      if (existing === -1) return [...items, { productId: product.id, quantityIndex, count: 1 }];
      return items.map((item, index) => index === existing ? { ...item, count: item.count + 1 } : item);
    });
    setCartFeedback(`${product.name} added to cart`);
  };

  const changeBasketCount = (productId: string, quantityIndex: number, change: number) => {
    setBasket((items) => items
      .map((item) => item.productId === productId && item.quantityIndex === quantityIndex
        ? { ...item, count: item.count + change }
        : item)
      .filter((item) => item.count > 0));
  };

  const confirmOrder = () => {
    const name = customerName.trim();
    if (!basket.length) {
      setFormError("Add at least one item to your basket.");
      return;
    }
    if (!name) {
      setFormError("Enter your name to place the order.");
      return;
    }
    if (!/^\d{10}$/.test(customerPhone)) {
      setFormError("Enter a valid 10-digit phone number.");
      return;
    }

    const items = basket.flatMap((item) => {
      const product = PRODUCTS.find((entry) => entry.id === item.productId);
      if (!product) return [];
      return [{
        productId: product.id,
        name: product.name,
        teluguName: product.teluguName,
        image: product.image,
        imageScale: product.imageScale,
        quantity: product.quantities[item.quantityIndex],
        count: item.count,
        unitPrice: product.prices[item.quantityIndex],
      }];
    });
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.count, 0);
    const newOrder: Order = {
      id: `GB-${Date.now().toString().slice(-6)}`,
      name,
      phone: customerPhone,
      address: customerAddress.trim(),
      createdAt: new Date().toLocaleString(),
      total,
      items,
    };

    setOrders((previous) => [newOrder, ...previous]);
    setLastConfirmedOrder(newOrder);
    setBasket([]);
    setFormError("");
    router.setParams({ section: "orders" });
  };

  const selectTab = (tab: AppTab) => {
    if (tab === "shop" || tab === "orders" || tab === "cart") router.setParams({ section: tab });
    if (tab === "account") router.push("/profile");
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.topBar, styles.fixedTopBar]}>
        <View style={styles.greetingGroup}>
          <View style={styles.avatar}>
            {userAvatarUrl ? (
              <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarIcon}>{userName?.charAt(0).toUpperCase() || "G"}</Text>
            )}
          </View>
          <View>
            <Text style={styles.eyebrow}>GOOD DAY</Text>
            <Text style={styles.guestName}>{userName || customerName.trim() || "Guest"}</Text>
          </View>
        </View>
      </View>

      {activeSection === "shop" && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{"\u2315"}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search vegetables"
            placeholderTextColor="#829184"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search vegetables"
          />
          {query.length > 0 && <Pressable onPress={() => setQuery("")} accessibilityLabel="Clear search"><Text style={styles.clearSearch}>{"\u00d7"}</Text></Pressable>}
        </View>
      )}

      <FlatList
        style={styles.productList}
        data={activeSection === "shop" ? filteredProducts : []}
        key={columns}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: 12 }]}
        columnWrapperStyle={styles.productRow}
        ListHeaderComponent={activeSection === "shop" ? (
          <View>
            <View style={styles.headlineBlock}>
              <Text style={styles.headline}>Fresh picks,</Text>
              <Text style={styles.headlineAccent}>picked for you <Text style={styles.leaf}>*</Text></Text>
              <Text style={styles.subtitle}>Fresh vegetables and everyday essentials, delivered to your home.</Text>
            </View>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Today&apos;s vegetables</Text>
                <Text style={styles.sectionSubtitle}>Handpicked for your kitchen</Text>
              </View>
              <Text style={styles.viewLabel}>FRESH DAILY</Text>
            </View>
          </View>
        ) : activeSection === "orders" ? (
          <View style={styles.ordersContent}>
            <Text style={styles.headline}>Your orders</Text>
            <Text style={styles.subtitle}>Track current orders and revisit past ones.</Text>
            {lastConfirmedOrder && (
              <View style={styles.confirmationCard}>
                <View style={styles.confirmationMark}><Text style={styles.confirmationMarkText}>OK</Text></View>
                <View style={styles.confirmationDetails}>
                  <Text style={styles.confirmationTitle}>Order placed</Text>
                  <Text style={styles.confirmationText}>Order {lastConfirmedOrder.id} · INR {lastConfirmedOrder.total}</Text>
                </View>
                <Pressable onPress={() => setLastConfirmedOrder(null)} accessibilityLabel="Dismiss order confirmation"><Text style={styles.dismissText}>×</Text></Pressable>
              </View>
            )}
            <Text style={styles.orderSectionTitle}>Current orders</Text>
            {orders.length > 0 ? orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardTop}>
                  <View>
                    <Text style={styles.orderId}>Order {order.id}</Text>
                    <Text style={styles.orderDate}>{order.createdAt}</Text>
                  </View>
                  <Text style={styles.orderStatus}>RECEIVED</Text>
                </View>
                {order.items.map((item, index) => (
                  <View key={`${order.id}-${item.productId}-${index}`} style={styles.orderLine}>
                    <Image source={item.image} style={[styles.orderLineImage, { transform: [{ scale: Math.min(item.imageScale ?? 1, 2) }] }]} contentFit="contain" accessibilityLabel={item.name} />
                    <View style={styles.orderLineDetails}>
                      <Text style={styles.orderItemText}>{item.teluguName} / {item.name}</Text>
                      <Text style={styles.orderMeta}>{item.quantity} x {item.count}</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderMeta}>Delivering to {order.name} / {order.phone}</Text>
                  <Text style={styles.orderTotal}>INR {order.total}</Text>
                </View>
              </View>
            )) : (
              <View style={styles.ordersEmpty}>
                <Text style={styles.emptyEmoji}>Fresh</Text>
                <Text style={styles.emptyTitle}>No current orders</Text>
                <Text style={styles.emptyText}>Confirmed orders will show here.</Text>
              </View>
            )}
            <Text style={[styles.orderSectionTitle, styles.pastOrdersTitle]}>Past orders</Text>
            <View style={styles.ordersEmpty}>
              <Text style={styles.emptyTitle}>No past orders yet</Text>
              <Text style={styles.emptyText}>Completed orders will appear here.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.cartContent}>
            <Text style={styles.headline}>Your cart</Text>
            <Text style={styles.subtitle}>{cartCount} item{cartCount === 1 ? "" : "s"} ready for checkout.</Text>
            <View style={styles.cartFormCard}>
              <Text style={styles.quantityTitle}>Delivery details</Text>
              <TextInput value={customerName} onChangeText={(value) => { setCustomerName(value); setFormError(""); }} placeholder="Full name" placeholderTextColor="#829184" autoCapitalize="words" returnKeyType="next" style={styles.customerInput} accessibilityLabel="Your name" />
              <TextInput value={customerPhone} onChangeText={(value) => { setCustomerPhone(value.replace(/\D/g, "").slice(0, 10)); setFormError(""); }} placeholder="10-digit phone number" placeholderTextColor="#829184" keyboardType="phone-pad" maxLength={10} style={styles.customerInput} accessibilityLabel="Your phone number" />
              <TextInput value={customerAddress} onChangeText={setCustomerAddress} placeholder="Delivery address (optional)" placeholderTextColor="#829184" style={[styles.customerInput, styles.addressInput]} multiline textAlignVertical="top" accessibilityLabel="Delivery address" />
            </View>
            <Text style={styles.quantityTitle}>Items</Text>
            {basket.length ? basket.map((item) => {
              const product = PRODUCTS.find((entry) => entry.id === item.productId);
              if (!product) return null;
              const unitPrice = product.prices[item.quantityIndex];
              return (
                <View key={`${item.productId}-${item.quantityIndex}`} style={styles.basketItem}>
                  <View style={styles.basketItemImage}><Image source={product.image} style={styles.basketItemPhoto} contentFit="contain" accessibilityLabel={product.name} /></View>
                  <View style={styles.basketItemDetails}>
                    <Text style={styles.basketItemName}>{product.name}</Text>
                    <Text style={styles.basketItemMeta}>{product.quantities[item.quantityIndex]} / INR {unitPrice}</Text>
                    <View style={styles.quantityStepper}>
                      <Pressable onPress={() => changeBasketCount(item.productId, item.quantityIndex, -1)} style={styles.stepperButton} accessibilityLabel={`Remove one ${product.name}`}><Text style={styles.stepperText}>-</Text></Pressable>
                      <Text style={styles.stepperCount}>{item.count}</Text>
                      <Pressable onPress={() => changeBasketCount(item.productId, item.quantityIndex, 1)} style={styles.stepperButton} accessibilityLabel={`Add one ${product.name}`}><Text style={styles.stepperText}>+</Text></Pressable>
                    </View>
                  </View>
                  <Text style={styles.basketLineTotal}>INR {unitPrice * item.count}</Text>
                </View>
              );
            }) : (
              <View style={styles.ordersEmpty}>
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptyText}>Browse fresh picks and add something you love.</Text>
                <Pressable onPress={() => router.setParams({ section: "shop" })} style={styles.continueShoppingButton}><Text style={styles.continueShoppingText}>Browse vegetables</Text></Pressable>
              </View>
            )}
            {formError.length > 0 && <Text style={styles.formError}>{formError}</Text>}
            {basket.length > 0 && <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>INR {basketTotal}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery</Text><Text style={styles.freeDelivery}>Free</Text></View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}><Text style={styles.basketTotalLabel}>Total</Text><Text style={styles.basketTotalValue}>INR {basketTotal}</Text></View>
              </View>
              <Pressable onPress={confirmOrder} style={styles.confirmButton} accessibilityRole="button"><Text style={styles.confirmButtonText}>Place order · INR {basketTotal}</Text></Pressable>
              <Text style={styles.dummyNote}>Order details are saved for this app session.</Text>
            </>}
          </View>
        )}
        ListEmptyComponent={activeSection === "shop" ? <View style={styles.emptyState}><Text style={styles.emptyEmoji}>Fresh</Text><Text style={styles.emptyTitle}>No vegetables found</Text><Text style={styles.emptyText}>Try a different search.</Text></View> : undefined}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, from ₹${item.prices[0]}. Tap for details.`}
            onPress={() => openProduct(item)}
            style={({ pressed }) => [styles.productCard, { width: `${100 / columns - 2}%` }, pressed && styles.cardPressed]}
          >
            <View style={styles.productImage}>
              <Image source={item.image} style={[styles.productPhoto, { transform: [{ scale: item.imageScale ?? 1 }] }]} contentFit="contain" accessibilityLabel={item.name} />
              <View style={styles.freshTag}><View style={styles.freshDot} /><Text style={styles.freshTagText}>FRESH</Text></View>
            </View>
            <View style={styles.cardInfo}>
              <Text numberOfLines={1} style={styles.productTelugu}>{item.teluguName}</Text>
              <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
              <Text style={styles.productWeight}>From {item.quantities[0]}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.productPrice}>₹{item.prices[0]}<Text style={styles.priceUnit}> / {item.quantities[0]}</Text></Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add ${item.name} to basket`} onPress={(event) => { event.stopPropagation(); addToBasket(item, 0); }} style={styles.addButton}><Text style={styles.addButtonText}>+</Text></Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />

      {cartFeedback.length > 0 && <View pointerEvents="none" style={styles.toast}><Text style={styles.toastCheck}>OK</Text><Text style={styles.toastText}>{cartFeedback}</Text></View>}

      <BottomNavigation active={activeSection} cartCount={cartCount} onSelect={selectTab} />

      <Modal visible={selectedProduct !== null} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedProduct(null)} accessibilityLabel="Close product details" />
          {selectedProduct && (
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
              <View style={styles.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailImage}><Image source={selectedProduct.image} style={[styles.detailPhoto, { transform: [{ scale: selectedProduct.imageScale ?? 1 }] }]} contentFit="contain" accessibilityLabel={selectedProduct.name} /></View>
                <Text style={styles.detailCategory}>{selectedProduct.category.toUpperCase()}</Text>
                <Text style={styles.detailTelugu}>{selectedProduct.teluguName}</Text>
                <Text style={styles.detailName}>{selectedProduct.name}</Text>
                <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
                <Text style={styles.quantityTitle}>Choose quantity</Text>
                <View style={styles.quantityOptions}>
                  {selectedProduct.quantities.map((quantity, index) => (
                    <Pressable key={quantity} onPress={() => setSelectedQuantity(index)} style={[styles.quantityOption, selectedQuantity === index && styles.quantityOptionSelected]}>
                      <Text style={[styles.quantityLabel, selectedQuantity === index && styles.quantityLabelSelected]}>{quantity}</Text>
                      <Text style={[styles.quantityPrice, selectedQuantity === index && styles.quantityLabelSelected]}>₹{selectedProduct.prices[index]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.addToCartButton} onPress={() => { addToBasket(selectedProduct, selectedQuantity); setSelectedProduct(null); }}>
                  <Text style={styles.addToCartText}>Add to basket · ₹{selectedProduct.prices[selectedQuantity]}</Text>
                </Pressable>
                <Text style={styles.dummyNote}>Sample prices for preview</Text>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>


    </View>
    
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  productList: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, flexGrow: 1 },
  productRow: { justifyContent: "space-between", marginBottom: 14 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fixedTopBar: { marginHorizontal: 20, marginTop: 10, marginBottom: 14 },
  greetingGroup: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: "#E4F0E2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D5E6D2" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 23 },
  avatarIcon: { fontSize: 25, color: colors.primary, lineHeight: 30 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3, color: colors.secondaryText },
  guestName: { marginTop: 2, fontSize: 17, fontWeight: "800", color: colors.darkText },
  headlineBlock: { marginTop: 27 },
  headline: { fontSize: 28, fontWeight: "800", color: colors.darkText, letterSpacing: -0.5 },
  headlineAccent: { fontSize: 28, lineHeight: 34, fontWeight: "800", color: colors.primary, letterSpacing: -0.5 },
  leaf: { color: "#78A94F", fontSize: 22 },
  subtitle: { marginTop: 6, fontSize: 13, color: colors.secondaryText },
  searchBar: { height: 52, flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 15, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  searchIcon: { color: colors.primary, fontSize: 27, lineHeight: 30, marginRight: 8 },
  searchInput: { flex: 1, height: "100%", color: colors.darkText, fontSize: 14 },
  clearSearch: { fontSize: 24, color: colors.secondaryText, paddingHorizontal: 4 },
  sectionHeading: { marginTop: 27, marginBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.darkText },
  sectionSubtitle: { marginTop: 3, fontSize: 12, color: colors.secondaryText },
  viewLabel: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 1, backgroundColor: "#E9F2E4", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, overflow: "hidden" },
  productCard: { backgroundColor: colors.white, borderRadius: 19, padding: 8, borderWidth: 1, borderColor: "#E8EDE5", overflow: "hidden" },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  productImage: { height: 140, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  productPhoto: { width: 136, height: 136 },
  freshTag: { position: "absolute", top: 9, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 7, paddingHorizontal: 6, paddingVertical: 4 },
  freshDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#55A85A" },
  freshTagText: { color: colors.primary, fontSize: 8, fontWeight: "800", letterSpacing: 0.4 },
  cardInfo: { paddingHorizontal: 4, paddingTop: 10, paddingBottom: 3 },
  productName: { color: colors.darkText, fontSize: 14, fontWeight: "800" },
  productTelugu: { marginTop: 2, color: colors.secondaryText, fontSize: 12 },
  productWeight: { marginTop: 3, color: colors.secondaryText, fontSize: 11 },
  cardBottom: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  productPrice: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  priceUnit: { color: colors.secondaryText, fontSize: 9, fontWeight: "500" },
  addButton: { minHeight: 34, paddingHorizontal: 13, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  toast: { position: "absolute", left: 20, right: 20, bottom: 88, minHeight: 46, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.darkText, flexDirection: "row", alignItems: "center", gap: 10, zIndex: 5 },
  toastCheck: { color: colors.lightGreen, fontSize: 11, fontWeight: "900" },
  toastText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  emptyState: { flex: 1, minHeight: 250, justifyContent: "center", alignItems: "center" },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { marginTop: 12, color: colors.darkText, fontSize: 17, fontWeight: "800" },
  emptyText: { marginTop: 5, color: colors.secondaryText, fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17, 32, 20, 0.42)" },
  modalSheet: { maxHeight: "88%", backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D9CE", marginBottom: 15 },
  detailImage: { height: 210, borderRadius: 19, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  detailPhoto: { width: 205, height: 205 },
  detailCategory: { marginTop: 18, color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  detailName: { marginTop: 5, color: colors.darkText, fontSize: 25, fontWeight: "900" },
  detailTelugu: { marginTop: 2, color: colors.primary, fontSize: 18, fontWeight: "700" },
  detailDescription: { marginTop: 8, color: colors.secondaryText, fontSize: 14, lineHeight: 21 },
  quantityTitle: { marginTop: 21, marginBottom: 10, color: colors.darkText, fontSize: 15, fontWeight: "800" },
  quantityOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quantityOption: { minWidth: 78, flexGrow: 1, paddingVertical: 10, paddingHorizontal: 11, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  quantityOptionSelected: { borderColor: colors.primary, backgroundColor: "#EAF3E7" },
  quantityLabel: { color: colors.darkText, fontSize: 12, fontWeight: "700" },
  quantityPrice: { marginTop: 3, color: colors.secondaryText, fontSize: 12, fontWeight: "800" },
  quantityLabelSelected: { color: colors.primary },
  addToCartButton: { marginTop: 21, minHeight: 52, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  addToCartText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  dummyNote: { marginTop: 9, marginBottom: 5, textAlign: "center", color: colors.secondaryText, fontSize: 11 },
  ordersContent: { paddingTop: 28, paddingBottom: 12 },
  cartContent: { paddingTop: 20, paddingBottom: 20 },
  cartFormCard: { marginTop: 20, padding: 14, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  addressInput: { minHeight: 74, paddingTop: 12 },
  orderSectionTitle: { marginTop: 26, marginBottom: 12, color: colors.darkText, fontSize: 17, fontWeight: "800" },
  pastOrdersTitle: { marginTop: 28 },
  orderCard: { padding: 15, marginBottom: 12, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  orderCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#EEF1EC" },
  orderId: { color: colors.darkText, fontSize: 14, fontWeight: "800" },
  orderDate: { marginTop: 3, color: colors.secondaryText, fontSize: 11 },
  orderStatus: { overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: "#E8F3E5", color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  orderLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  orderLineImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.white },
  orderLineDetails: { flex: 1 },
  orderItemText: { color: colors.darkText, fontSize: 12, fontWeight: "700" },
  orderTotalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#EEF1EC" },
  orderMeta: { flex: 1, color: colors.secondaryText, fontSize: 10 },
  orderTotal: { color: colors.primary, fontSize: 16, fontWeight: "900" },
  ordersEmpty: { alignItems: "center", justifyContent: "center", padding: 20, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  confirmationCard: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.lightGreen, borderWidth: 1, borderColor: "#CDE2C8" },
  confirmationMark: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  confirmationMarkText: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  confirmationDetails: { flex: 1 },
  confirmationTitle: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  confirmationText: { marginTop: 3, color: colors.darkText, fontSize: 11 },
  dismissText: { color: colors.secondaryText, fontSize: 22, paddingHorizontal: 4 },
  summaryCard: { marginTop: 12, padding: 15, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  summaryLabel: { color: colors.secondaryText, fontSize: 13 },
  summaryValue: { color: colors.darkText, fontSize: 13, fontWeight: "700" },
  freeDelivery: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  summaryTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  basketSheet: { maxHeight: "92%", backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  basketTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 },
  closeButton: { color: colors.secondaryText, fontSize: 30, lineHeight: 34, paddingHorizontal: 7 },
  basketContent: { paddingBottom: 12 },
  customerInput: { height: 48, marginBottom: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.darkText, fontSize: 14 },
  basketItem: { flexDirection: "row", alignItems: "center", gap: 11, padding: 10, marginBottom: 9, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E8EDE5" },
  basketItemImage: { height: 60, width: 60, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  basketItemPhoto: { height: 58, width: 58 },
  basketItemDetails: { flex: 1 },
  basketItemName: { color: colors.darkText, fontSize: 13, fontWeight: "800" },
  basketItemTelugu: { color: colors.secondaryText, fontSize: 11 },
  basketItemMeta: { marginTop: 2, color: colors.secondaryText, fontSize: 10 },
  quantityStepper: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 7 },
  stepperButton: { height: 25, width: 27, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#E8F1E5" },
  stepperText: { color: colors.primary, fontSize: 18, lineHeight: 21, fontWeight: "700" },
  stepperCount: { minWidth: 14, textAlign: "center", color: colors.darkText, fontSize: 12, fontWeight: "800" },
  basketLineTotal: { color: colors.darkText, fontSize: 13, fontWeight: "800" },
  basketEmpty: { alignItems: "center", padding: 15, borderRadius: 14, backgroundColor: colors.white },
  continueShoppingButton: { minHeight: 42, marginTop: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.lightGreen, alignItems: "center", justifyContent: "center" },
  continueShoppingText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  formError: { marginTop: 8, color: "#B3261E", fontSize: 12, fontWeight: "600" },
  basketTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 17, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  basketTotalLabel: { color: colors.darkText, fontSize: 16, fontWeight: "800" },
  basketTotalValue: { color: colors.primary, fontSize: 21, fontWeight: "900" },
  confirmButton: { minHeight: 52, marginTop: 14, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  confirmButtonText: { color: colors.white, fontSize: 15, fontWeight: "800" },
});
