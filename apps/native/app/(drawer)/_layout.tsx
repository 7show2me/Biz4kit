import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";
import React, { useCallback } from "react";
import { Pressable, Text } from "react-native";
import type { ColorValue } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";

interface DrawerLabelArgs {
  color: ColorValue;
  focused: boolean;
}

interface DrawerIconArgs {
  color: ColorValue;
  focused: boolean;
  size: number;
}

function AddModalButton({ color }: { color: string }) {
  return (
    <Link href="/modal" asChild>
      <Pressable className="mr-4">
        <Ionicons name="add-outline" size={24} style={{ color }} />
      </Pressable>
    </Link>
  );
}

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  const renderHomeLabel = useCallback(
    ({ color, focused }: DrawerLabelArgs) => (
      <Text style={{ color: focused ? color : themeColorForeground }}>
        Home
      </Text>
    ),
    [themeColorForeground]
  );

  const renderHomeIcon = useCallback(
    ({ size, color, focused }: DrawerIconArgs) => (
      <Ionicons
        name="home-outline"
        size={size}
        style={{ color: focused ? color : themeColorForeground }}
      />
    ),
    [themeColorForeground]
  );

  const renderTabsLabel = useCallback(
    ({ color, focused }: DrawerLabelArgs) => (
      <Text style={{ color: focused ? color : themeColorForeground }}>
        Tabs
      </Text>
    ),
    [themeColorForeground]
  );

  const renderTabsIcon = useCallback(
    ({ size, color, focused }: DrawerIconArgs) => (
      <MaterialIcons
        name="border-bottom"
        size={size}
        style={{ color: focused ? color : themeColorForeground }}
      />
    ),
    [themeColorForeground]
  );

  const renderAddModalButton = useCallback(
    () => <AddModalButton color={themeColorForeground} />,
    [themeColorForeground]
  );

  return (
    <Drawer
      screenOptions={{
        headerTintColor: themeColorForeground,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTitleStyle: {
          fontWeight: "600",
          color: themeColorForeground,
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: renderHomeLabel,
          drawerIcon: renderHomeIcon,
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Tabs",
          drawerLabel: renderTabsLabel,
          drawerIcon: renderTabsIcon,
          headerRight: renderAddModalButton,
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
