import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

function NativeTabLayout({ role }: { role: string }) {
  const isWorker = role === "worker";
  const isAdmin = role === "super_admin";
  const isShopOwner = role === "shop_owner";

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>{isAdmin || isShopOwner ? "Dashboard" : "Asboblar"}</Label>
      </NativeTabs.Trigger>

      {(isWorker) && (
        <NativeTabs.Trigger name="scanner">
          <Icon sf={{ default: "qrcode.viewfinder", selected: "qrcode.viewfinder" }} />
          <Label>Skaner</Label>
        </NativeTabs.Trigger>
      )}

      {(isAdmin || isShopOwner) && (
        <NativeTabs.Trigger name="tools">
          <Icon sf={{ default: "wrench.and.screwdriver", selected: "wrench.and.screwdriver.fill" }} />
          <Label>Asboblar</Label>
        </NativeTabs.Trigger>
      )}

      {(isAdmin || isShopOwner) && (
        <NativeTabs.Trigger name="rentals">
          <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
          <Label>Ijaralar</Label>
        </NativeTabs.Trigger>
      )}

      {isShopOwner && (
        <NativeTabs.Trigger name="workers">
          <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
          <Label>Hodimlar</Label>
        </NativeTabs.Trigger>
      )}

      {(!isAdmin && !isShopOwner && !isWorker) && (
        <NativeTabs.Trigger name="my-rentals">
          <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
          <Label>Ijaralarim</Label>
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ role }: { role: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const isWorker = role === "worker";
  const isAdmin = role === "super_admin";
  const isShopOwner = role === "shop_owner";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? C.surface : "#fff",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: C.border,
          elevation: 0,
          paddingBottom: insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? C.surface : "#fff" }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isAdmin || isShopOwner ? "Dashboard" : "Asboblar",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Skaner",
          href: isWorker ? undefined : null,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="qrcode.viewfinder" tintColor={color} size={24} /> : <Ionicons name="qr-code-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Asboblar",
          href: (isAdmin || isShopOwner) ? undefined : null,
          tabBarIcon: ({ color }) =>
            <MaterialCommunityIcons name="tools" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          title: "Ijaralar",
          href: (isAdmin || isShopOwner) ? undefined : null,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="doc.text" tintColor={color} size={24} /> : <Feather name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-rentals"
        options={{
          title: "Ijaralarim",
          href: (!isAdmin && !isShopOwner && !isWorker) ? undefined : null,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="doc.text" tintColor={color} size={24} /> : <Feather name="list" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workers"
        options={{
          title: "Hodimlar",
          href: isShopOwner ? undefined : null,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.2" tintColor={color} size={24} /> : <Ionicons name="people-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person" tintColor={color} size={24} /> : <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const role = user?.role || "customer";

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout role={role} />;
  }
  return <ClassicTabLayout role={role} />;
}
