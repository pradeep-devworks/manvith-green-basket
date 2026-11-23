import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { getUserCartItems, saveUserCartItems, type PersistedCartItem } from "../services/cartService";
import { getCategories, type Category } from "../services/categoryService";
import { createOrderWithItems, getOrdersWithItems } from "../services/orderService";
import { getCustomerProfile, saveCustomerProfile } from "../services/profileService";
import { getProducts, type ProductRecord } from "../services/productService";

type Product = {
  id: string;
  name: string;
  teluguName: string;
  imageUrl: string | null;
  imageAltText: string | null;
  categoryId: string | null;
  category: string;
  description: string;
  unit: string;
  quantities: number[];
  prices: number[];
};

type BasketItem = { productId: string; quantityIndex: number; count: number };
type OrderLine = { productId: string; name: string; teluguName: string; imageUrl: string | null; quantity: string; count: number; unitPrice: number };
type Order = { id: string; name: string; phone: string; address: string; createdAt: string; total: number; items: OrderLine[] };


const CATEGORY_ICON_HINTS: { id: string; label: string; icon: string }[] = [
  { id: "vegetables", label: "Vegetables", icon: "🥬" },
  { id: "fruits", label: "Fruits", icon: "🍎" },
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "snacks", label: "Snacks", icon: "🍪" },
];

function numberValue(value: number | string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function makeQuantityOptions(product: ProductRecord): number[] {
  const minimum = numberValue(product.minimum_order_quantity);
  if (!product.is_quantity_editable) return [minimum];

  const step = numberValue(product.quantity_step);
  const maximum = product.maximum_order_quantity == null ? null : numberValue(product.maximum_order_quantity);
  if (step <= 0 || (maximum !== null && maximum < minimum)) return [minimum];

  const options: number[] = [];
  const optionLimit = maximum === null ? 3 : 12;
  for (let index = 0; index < optionLimit; index += 1) {
    const quantity = Number((minimum + step * index).toFixed(4));
    if (maximum !== null && quantity > maximum) break;
    options.push(quantity);
  }
  return options.length ? options : [minimum];
}

function toProduct(record: ProductRecord, categoryName: string): Product {
  const quantities = makeQuantityOptions(record);
  const unitPrice = numberValue(record.selling_price || record.price);
  return {
    id: record.product_id,
    name: record.product_name,
    teluguName: record.product_name_te ?? "",
    imageUrl: record.image_url,
    imageAltText: record.image_alt_text,
    categoryId: record.category_id,
    category: categoryName,
    description: record.description ?? "",
    unit: record.unit,
    quantities,
    prices: quantities.map((quantity) => Number((unitPrice * quantity).toFixed(2))),
  };
}

function formatQuantity(quantity: number, unit: string): string {
  return `${Number(quantity.toFixed(3))} ${unit}`;
}

function imageSource(imageUrl: string | null) {
  return imageUrl ? { uri: imageUrl } : undefined;
}

function priceText(price: number): string {
  return price.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function getCategoryIcon(categoryName: string): string {
  const normalizedCategory = categoryName.trim().toLowerCase();
  const matchedHint = CATEGORY_ICON_HINTS.find((hint) => normalizedCategory.includes(hint.id) || normalizedCategory.includes(hint.label.toLowerCase()));
  if (matchedHint) return matchedHint.icon;
  if (normalizedCategory.includes("leaf") || normalizedCategory.includes("green")) return "🌿";
  return "🥕";
}

function toPersistedCartItems(basketItems: BasketItem[], products: Product[]): PersistedCartItem[] {
  return basketItems.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) return [];
    const quantity = product.quantities[item.quantityIndex];
    if (!Number.isFinite(quantity) || quantity <= 0) return [];
    return [{
      product_id: product.id,
      quantity: Number((quantity * item.count).toFixed(4)),
    }];
  });
}

function toBasketItemsFromPersisted(cartItems: PersistedCartItem[], products: Product[]): BasketItem[] {
  return cartItems.flatMap((cartItem) => {
    const product = products.find((entry) => entry.id === cartItem.product_id);
    if (!product || !product.quantities.length) return [];

    const totalQuantity = Number(cartItem.quantity);
    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) return [];

    const exactMatchIndex = product.quantities.findIndex((optionQuantity) => {
      const count = totalQuantity / optionQuantity;
      return optionQuantity > 0 && Number.isInteger(Number(count.toFixed(6)));
    });

    const resolvedQuantityIndex = exactMatchIndex >= 0
      ? exactMatchIndex
      : product.quantities.reduce((closestIndex, optionQuantity, index) => {
        const closestDiff = Math.abs(product.quantities[closestIndex] - totalQuantity);
        const currentDiff = Math.abs(optionQuantity - totalQuantity);
        return currentDiff < closestDiff ? index : closestIndex;
      }, 0);

    const quantityPerPack = product.quantities[resolvedQuantityIndex] || 1;
    const resolvedCount = Math.max(1, Math.round(totalQuantity / quantityPerPack));

    return [{
      productId: product.id,
      quantityIndex: resolvedQuantityIndex,
      count: resolvedCount,
    }];
  });
}

function formatOrderTimestamp(timestamp: string): string {
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) return timestamp;
  return parsedDate.toLocaleString();
}

export default function HomeScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ section?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columns = width >= 650 ? 4 : 3;
  const [query, setQuery] = useState("");
  const [productRecords, setProductRecords] = useState<ProductRecord[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
  const [hydratedCartUserId, setHydratedCartUserId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const isHydratingCartRef = useRef(false);
  const displayName = typeof authUser?.user_metadata.full_name === "string"
    ? authUser.user_metadata.full_name
    : typeof authUser?.user_metadata.name === "string"
      ? authUser.user_metadata.name
      : authUser?.email?.split("@")[0] || customerName.trim() || "Guest";

  useEffect(() => {
    let authStateChanged = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authStateChanged = true;
      setAuthUser(session?.user ?? null);
      if (!session?.user) {
        setBasket([]);
        setOrders([]);
        setHydratedCartUserId(null);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!authStateChanged) {
        setAuthUser(data.session?.user ?? null);
        if (!data.session?.user) {
          setBasket([]);
          setOrders([]);
          setHydratedCartUserId(null);
        }
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

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
    let isMounted = true;
    void Promise.all([getProducts(), getCategories()]).then(([productRows, categoryRows]) => {
      if (!isMounted) return;
      setProductRecords(productRows);
      setCategories(categoryRows);
      setProductLoadError("");
    }).catch((error: unknown) => {
      console.warn("Could not load shop catalogue.", error);
      if (isMounted) setProductLoadError("We couldn't load products. Check your connection and try again.");
    }).finally(() => {
      if (isMounted) setIsLoadingProducts(false);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!cartFeedback) return;
    const timeout = setTimeout(() => setCartFeedback(""), 2200);
    return () => clearTimeout(timeout);
  }, [cartFeedback]);

  const products = useMemo(() => {
    const categoryNames = new Map(categories.map((category) => [category.category_id, category.category_name]));
    return productRecords.map((record) => toProduct(record, record.category_id ? categoryNames.get(record.category_id) ?? "" : ""));
  }, [categories, productRecords]);

  const hasHydratedCart = !authUser || hydratedCartUserId === authUser.id;

  useEffect(() => {
    if (!authUser) return;

    let active = true;
    void getOrdersWithItems(authUser.id).then(({ orders: orderRows, itemsByOrderId }) => {
      if (!active) return;

      const hydratedOrders: Order[] = orderRows.map((orderRow) => ({
        id: orderRow.order_number,
        name: orderRow.delivery_name,
        phone: orderRow.delivery_phone,
        address: orderRow.delivery_address,
        createdAt: formatOrderTimestamp(orderRow.created_at),
        total: Number(orderRow.total_amount),
        items: (itemsByOrderId.get(orderRow.order_id) ?? []).map((itemRow) => ({
          productId: itemRow.product_id ?? "",
          name: itemRow.product_name,
          teluguName: "",
          imageUrl: itemRow.product_image_url,
          quantity: formatQuantity(Number(itemRow.quantity), itemRow.unit),
          count: 1,
          unitPrice: Number(itemRow.unit_price),
        })),
      }));

      setOrders(hydratedOrders);
    }).catch((error: unknown) => {
      console.warn("Could not load saved orders.", error);
    });

    return () => { active = false; };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    if (hasHydratedCart || isHydratingCartRef.current) return;
    if (isLoadingProducts) return;

    let active = true;
    isHydratingCartRef.current = true;
    void getUserCartItems(authUser.id).then((cartItems) => {
      if (!active) return;
      setBasket(toBasketItemsFromPersisted(cartItems, products));
      setHydratedCartUserId(authUser.id);
    }).catch((error: unknown) => {
      console.warn("Could not load saved cart items.", error);
      if (active) setHydratedCartUserId(authUser.id);
    }).finally(() => {
      if (active) isHydratingCartRef.current = false;
    });

    return () => { active = false; isHydratingCartRef.current = false; };
  }, [authUser, hasHydratedCart, isLoadingProducts, products]);

  useEffect(() => {
    if (!authUser || !hasHydratedCart || isHydratingCartRef.current) return;

    void saveUserCartItems(authUser.id, toPersistedCartItems(basket, products)).catch((error: unknown) => {
      console.warn("Could not persist cart changes.", error);
    });
  }, [authUser, basket, hasHydratedCart, products]);

  const cartCount = basket.reduce((sum, item) => sum + item.count, 0);
  const basketTotal = basket.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product?.prices[item.quantityIndex] ?? 0) * item.count;
  }, 0);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const hasSelectedDbCategory = !!selectedCategoryId && categories.some((category) => category.category_id === selectedCategoryId);
    return products.filter((product) => {
      const matchesCategory = !hasSelectedDbCategory || product.categoryId === selectedCategoryId;
      const matchesQuery = !normalizedQuery || `${product.name} ${product.teluguName} ${product.category}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [categories, products, query, selectedCategoryId]);

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

  const confirmOrder = async () => {
    const name = customerName.trim();
    const address = customerAddress.trim();
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
    if (!address) {
      setFormError("Enter your delivery address to place the order.");
      return;
    }
    if (!authUser) {
      setFormError("Please sign in to place your order.");
      return;
    }

    const items = basket.flatMap((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) return [];
      const quantityValue = product.quantities[item.quantityIndex];
      const unitPrice = product.prices[item.quantityIndex];
      return [{
        productId: product.id,
        name: product.name,
        teluguName: product.teluguName,
        imageUrl: product.imageUrl,
        quantity: formatQuantity(quantityValue, product.unit),
        count: item.count,
        unitPrice,
        unit: product.unit,
        totalQuantity: Number((quantityValue * item.count).toFixed(4)),
        lineTotal: Number((unitPrice * item.count).toFixed(2)),
      }];
    });

    if (!items.length) {
      setFormError("Add at least one valid product to your basket.");
      return;
    }

    setIsSavingOrder(true);
    setFormError("");

    try {
      await saveCustomerProfile({
        fullName: name,
        phone: customerPhone,
        address,
      });

      const persistedOrder = await createOrderWithItems({
        userId: authUser.id,
        deliveryName: name,
        deliveryPhone: customerPhone,
        deliveryAddress: address,
        items: items.map((item) => ({
          product_id: item.productId,
          product_name: item.name,
          product_image_url: item.imageUrl,
          unit: item.unit,
          quantity: item.totalQuantity,
          unit_price: item.totalQuantity > 0 ? Number((item.lineTotal / item.totalQuantity).toFixed(2)) : item.unitPrice,
          line_total: item.lineTotal,
        })),
      });

      const newOrder: Order = {
        id: persistedOrder.order_number,
        name,
        phone: customerPhone,
        address,
        createdAt: formatOrderTimestamp(persistedOrder.created_at),
        total: Number(persistedOrder.total_amount),
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          teluguName: item.teluguName,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          count: item.count,
          unitPrice: item.unitPrice,
        })),
      };

      setOrders((previous) => [newOrder, ...previous]);
      setLastConfirmedOrder(newOrder);
      setBasket([]);
      if (hasHydratedCart) {
        void saveUserCartItems(authUser.id, []).catch((error: unknown) => {
          console.warn("Could not clear saved cart after order.", error);
        });
      }
      router.setParams({ section: "orders" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not place order right now. Please try again.";
      setFormError(message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const selectTab = (tab: AppTab) => {
    if (tab === "shop" || tab === "orders" || tab === "cart") router.setParams({ section: tab });
    if (tab === "account") router.push("/profile");
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.topBar, styles.fixedTopBar]}>
        <Pressable style={styles.menuButton} onPress={() => router.push("/profile")} accessibilityLabel="Open profile">
          <Text style={styles.menuButtonText}>☰</Text>
        </Pressable>
        <View style={styles.brandTitle}>
          <Text numberOfLines={1} style={styles.brandTitleName}>{displayName}</Text>
        </View>
        <Pressable style={styles.headerCart} onPress={() => router.setParams({ section: "cart" })} accessibilityLabel={`Open cart, ${cartCount} items`}>
          <Text style={styles.headerCartIcon}>🛒</Text>
          {cartCount > 0 ? <Text style={styles.headerCartBadge}>{cartCount}</Text> : null}
        </Pressable>
      </View>

      {activeSection === "shop" && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{"\u2315"}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search fresh vegetables..."
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
            <View style={styles.heroBanner}>
              <View style={styles.heroImageLayer}>
                <Image
                  source={require("../../assets/images/home_banner.png")}
                  style={styles.heroImage}
                  contentFit="cover"
                  contentPosition="right center"
                  accessibilityLabel="Basket of fresh vegetables"
                />
              </View>
              <View style={styles.heroBlendMask} />
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroBrand}>Manvith Green Basket</Text>
                <Text style={styles.heroTitle}>Quality Vegetables,{"\n"}Chosen for Your Kitchen.</Text>
                <Text style={styles.heroSubtitle}>Good quality vegetables for everyday meals.</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              accessibilityLabel="Product categories"
            >
              {/* categories from database */}
              {false && (
                <Text style={styles.categoryPillIcon}>🥬</Text>
              )}
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.category_id;
                return (
                  <Pressable
                    key={category.category_id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedCategoryId(category.category_id)}
                    style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  >
                    <Text style={styles.categoryPillIcon}>{getCategoryIcon(category.category_name)}</Text>
                    <Text numberOfLines={1} style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>{category.category_name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Today&apos;s fresh picks</Text>
                <Text style={styles.sectionSubtitle}>Handpicked for your kitchen</Text>
              </View>
              <Pressable onPress={() => setSelectedCategoryId(null)} accessibilityRole="button"><Text style={styles.seeAllLabel}>See all</Text></Pressable>
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
                    {item.imageUrl ? <Image source={imageSource(item.imageUrl)} style={styles.orderLineImage} contentFit="contain" accessibilityLabel={item.name} /> : <View style={styles.orderLineImage} />}
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
              const product = products.find((entry) => entry.id === item.productId);
              if (!product) return null;
              const unitPrice = product.prices[item.quantityIndex];
              return (
                <View key={`${item.productId}-${item.quantityIndex}`} style={styles.basketItem}>
                  <View style={styles.basketItemImage}>{product.imageUrl ? <Image source={imageSource(product.imageUrl)} style={styles.basketItemPhoto} contentFit="contain" accessibilityLabel={product.imageAltText || product.name} /> : null}</View>
                  <View style={styles.basketItemDetails}>
                    <Text style={styles.basketItemName}>{product.name}</Text>
                    <Text style={styles.basketItemMeta}>{formatQuantity(product.quantities[item.quantityIndex], product.unit)} / INR {priceText(unitPrice)}</Text>
                    <View style={styles.quantityStepper}>
                      <Pressable onPress={() => changeBasketCount(item.productId, item.quantityIndex, -1)} style={styles.stepperButton} accessibilityLabel={`Remove one ${product.name}`}><Text style={styles.stepperText}>-</Text></Pressable>
                      <Text style={styles.stepperCount}>{item.count}</Text>
                      <Pressable onPress={() => changeBasketCount(item.productId, item.quantityIndex, 1)} style={styles.stepperButton} accessibilityLabel={`Add one ${product.name}`}><Text style={styles.stepperText}>+</Text></Pressable>
                    </View>
                  </View>
                  <Text style={styles.basketLineTotal}>INR {priceText(unitPrice * item.count)}</Text>
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
              <Pressable onPress={() => { void confirmOrder(); }} disabled={isSavingOrder} style={[styles.confirmButton, isSavingOrder && styles.confirmButtonDisabled]} accessibilityRole="button"><Text style={styles.confirmButtonText}>{isSavingOrder ? "Placing order..." : `Place order · INR ${basketTotal}`}</Text></Pressable>
              <Text style={styles.dummyNote}>Order and cart updates are saved to your account.</Text>
            </>}
          </View>
        )}
        ListEmptyComponent={activeSection === "shop" ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{isLoadingProducts ? "…" : "Fresh"}</Text>
            <Text style={styles.emptyTitle}>{isLoadingProducts ? "Loading products" : productLoadError ? "Products unavailable" : "No products found"}</Text>
            <Text style={styles.emptyText}>{productLoadError || (isLoadingProducts ? "Getting the latest products for you." : "Try a different search or category.")}</Text>
            {productLoadError ? (
              <Pressable onPress={() => {
                setIsLoadingProducts(true);
                setProductLoadError("");
                void Promise.all([getProducts(), getCategories()]).then(([productRows, categoryRows]) => {
                  setProductRecords(productRows);
                  setCategories(categoryRows);
                }).catch((error: unknown) => {
                  console.warn("Could not reload shop catalogue.", error);
                  setProductLoadError("We couldn't load products. Check your connection and try again.");
                }).finally(() => setIsLoadingProducts(false));
              }} style={styles.continueShoppingButton}>
                <Text style={styles.continueShoppingText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : undefined}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, from ?${priceText(item.prices[0])}. Tap for details.`}
            onPress={() => openProduct(item)}
            style={({ pressed }) => [styles.productCard, { width: `${100 / columns - 2}%` }, pressed && styles.cardPressed]}
          >
            <View style={styles.productImage}>
              {item.imageUrl ? <Image source={imageSource(item.imageUrl)} style={styles.productPhoto} contentFit="contain" accessibilityLabel={item.imageAltText || item.name} /> : null}
              <View style={styles.freshTag}><View style={styles.freshDot} /><Text style={styles.freshTagText}>FRESH</Text></View>
            </View>
            <View style={styles.cardInfo}>
              <Text numberOfLines={1} style={styles.productTelugu}>{item.teluguName}</Text>
              <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
              <Text style={styles.productWeight}>From {formatQuantity(item.quantities[0], item.unit)}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.productPrice}>INR {priceText(item.prices[0])}<Text style={styles.priceUnit}> / {formatQuantity(item.quantities[0], item.unit)}</Text></Text>
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
                <View style={styles.detailImage}>{selectedProduct.imageUrl ? <Image source={imageSource(selectedProduct.imageUrl)} style={styles.detailPhoto} contentFit="contain" accessibilityLabel={selectedProduct.imageAltText || selectedProduct.name} /> : null}</View>
                <Text style={styles.detailCategory}>{selectedProduct.category.toUpperCase()}</Text>
                <Text style={styles.detailTelugu}>{selectedProduct.teluguName}</Text>
                <Text style={styles.detailName}>{selectedProduct.name}</Text>
                <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
                <Text style={styles.quantityTitle}>Choose quantity</Text>
                <View style={styles.quantityOptions}>
                  {selectedProduct.quantities.map((quantity, index) => (
                    <Pressable key={quantity} onPress={() => setSelectedQuantity(index)} style={[styles.quantityOption, selectedQuantity === index && styles.quantityOptionSelected]}>
                      <Text style={[styles.quantityLabel, selectedQuantity === index && styles.quantityLabelSelected]}>{formatQuantity(quantity, selectedProduct.unit)}</Text>
                      <Text style={[styles.quantityPrice, selectedQuantity === index && styles.quantityLabelSelected]}>INR {priceText(selectedProduct.prices[index])}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.addToCartButton} onPress={() => { addToBasket(selectedProduct, selectedQuantity); setSelectedProduct(null); }}>
                  <Text style={styles.addToCartText}>Add to basket - INR {priceText(selectedProduct.prices[selectedQuantity])}</Text>
                </Pressable>
                <Text style={styles.dummyNote}>Prices shown are from the latest catalogue.</Text>
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
  listContent: { paddingHorizontal: 20, paddingTop: 6, flexGrow: 1 },
  productRow: { justifyContent: "space-between", marginBottom: 10 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fixedTopBar: { marginHorizontal: 20, marginTop: 8, marginBottom: 12, minHeight: 44 },
  menuButton: { width: 34, height: 38, justifyContent: "center" },
  menuButtonText: { color: colors.primary, fontSize: 22, fontWeight: "700" },
  brandTitle: { flex: 1, marginLeft: 12 },
  brandTitleName: { color: colors.primary, fontSize: 17, fontWeight: "900", lineHeight: 19 },
  brandTitleSubtitle: { color: colors.primary, fontSize: 13, fontWeight: "800", lineHeight: 16 },
  headerCart: { width: 42, height: 38, alignItems: "center", justifyContent: "center", position: "relative" },
  headerCartIcon: { fontSize: 22 },
  headerCartBadge: { position: "absolute", top: -1, right: 0, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, overflow: "hidden", backgroundColor: "#E94C36", color: colors.white, textAlign: "center", fontSize: 10, fontWeight: "800" },
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
  categoryList: { gap: 8, paddingTop: 10, paddingBottom: 2, paddingRight: 6 },
  categoryPill: { minHeight: 34, paddingHorizontal: 11, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: "#DDE6DA", flexDirection: "row", alignItems: "center", gap: 6 },
  categoryPillSelected: { backgroundColor: colors.lightGreen, borderColor: "#94C496" },
  categoryPillIcon: { fontSize: 13, lineHeight: 15 },
  categoryPillText: { color: colors.darkText, fontSize: 12, fontWeight: "700" },
  categoryPillTextSelected: { color: colors.primary },
  heroBanner: { width: "100%", aspectRatio: 2.2, marginTop: 0, paddingLeft: 14, paddingRight: 12, paddingVertical: 12, borderRadius: 16, backgroundColor: "#276A2D", overflow: "hidden", justifyContent: "center", position: "relative" },
  heroImageLayer: { position: "absolute", top: 0, bottom: 0, right: 0, width: "62%", backgroundColor: "#276A2D" },
  heroBlendMask: { position: "absolute", top: 0, bottom: 0, left: "34%", width: "16%", backgroundColor: "rgba(39,106,45,0.7)" },
  heroTextBlock: { width: "40%", maxWidth: "40%", justifyContent: "center", zIndex: 1 },
  heroBrand: { marginBottom: 6, color: "#E3F4C8", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: { color: colors.white, fontSize: 16, lineHeight: 20, fontWeight: "900" },
  heroSubtitle: { marginTop: 7, color: "#F0F8E9", fontSize: 10, lineHeight: 14, fontWeight: "600" },
  heroImage: { position: "absolute", right: -12, bottom: -6, width: "118%", height: "118%" },
  seeAllLabel: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  searchIcon: { color: colors.primary, fontSize: 27, lineHeight: 30, marginRight: 8 },
  searchInput: { flex: 1, height: "100%", color: colors.darkText, fontSize: 14 },
  clearSearch: { fontSize: 24, color: colors.secondaryText, paddingHorizontal: 4 },
  sectionHeading: { marginTop: 12, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.darkText },
  sectionSubtitle: { marginTop: 3, fontSize: 12, color: colors.secondaryText },
  viewLabel: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 1, backgroundColor: "#E9F2E4", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, overflow: "hidden" },
  productCard: { backgroundColor: colors.white, borderRadius: 15, padding: 6, borderWidth: 1, borderColor: "#E8EDE5", overflow: "hidden" },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  productImage: { height: 90, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  productPhoto: { width: 88, height: 88 },
  freshTag: { position: "absolute", top: 9, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 7, paddingHorizontal: 6, paddingVertical: 4 },
  freshDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#55A85A" },
  freshTagText: { color: colors.primary, fontSize: 8, fontWeight: "800", letterSpacing: 0.4 },
  cardInfo: { paddingHorizontal: 4, paddingTop: 10, paddingBottom: 3 },
  productName: { color: colors.darkText, fontSize: 11, fontWeight: "800" },
  productTelugu: { marginTop: 2, color: colors.secondaryText, fontSize: 12 },
  productWeight: { marginTop: 3, color: colors.secondaryText, fontSize: 11 },
  cardBottom: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  productPrice: { color: colors.darkText, fontSize: 10, fontWeight: "800" },
  priceUnit: { color: colors.secondaryText, fontSize: 8, fontWeight: "500" },
  addButton: { minHeight: 23, minWidth: 23, paddingHorizontal: 6, borderRadius: 7, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
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
  confirmButtonDisabled: { opacity: 0.7 },
  confirmButtonText: { color: colors.white, fontSize: 15, fontWeight: "800" },
});
