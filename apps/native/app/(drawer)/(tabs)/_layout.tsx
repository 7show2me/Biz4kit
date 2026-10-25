import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

interface TabIconProps {
  name: ComponentProps<typeof Ionicons>["name"];
  color: ColorValue | undefined;
  fallbackColor: string;
  size: number;
}

function TabIcon({ name, color, fallbackColor, size }: TabIconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      style={{ color: color ?? fallbackColor }}
    />
  );
}

interface TabBarIconArgs {
  color: ColorValue;
  size: number;
}

export default function TabLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const renderHomeIcon = useCallback(
    ({ color, size }: TabBarIconArgs) => (
      <TabIcon
        name="home"
        color={color}
        fallbackColor={themeColorForeground}
        size={size}
      />
    ),
    [themeColorForeground]
  );

  const renderExploreIcon = useCallback(
    ({ color, size }: TabBarIconArgs) => (
      <TabIcon
        name="compass"
        color={color}
        fallbackColor={themeColorForeground}
        size={size}
      />
    ),
    [themeColorForeground]
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: themeColorBackground,
        },
        headerTintColor: themeColorForeground,
        headerTitleStyle: {
          color: themeColorForeground,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: themeColorBackground,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: "Explore",
          tabBarIcon: renderExploreIcon,
        }}
      />
    </Tabs>
  );
}
