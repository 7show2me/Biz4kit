import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Card, Chip, useThemeColor } from "heroui-native";
import { Text, View, Pressable, Alert } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { queryClient, orpc } from "@/utils/orpc";

import { ENV } from "../../src/env";

async function openPolarLink(url: string, returnUrl: string) {
  await WebBrowser.openAuthSessionAsync(url, returnUrl);
}

function getPolarReturnUrl(returnUrl: string) {
  const url = new URL("/polar/success", ENV.EXPO_PUBLIC_SERVER_URL);
  url.searchParams.set("returnUrl", returnUrl);
  return url.toString();
}

function getConnectionLabel(isLoading: boolean, isConnected: boolean) {
  if (isLoading) {
    return "Checking connection...";
  }
  return isConnected ? "Connected to API" : "API Disconnected";
}

async function handlePolarCheckout() {
  const returnUrl = Linking.createURL("/");
  const polarReturnUrl = getPolarReturnUrl(returnUrl);
  const { data, error } = await authClient.checkout({
    slug: "pro",
    redirect: false,
    successUrl: polarReturnUrl,
    returnUrl: polarReturnUrl,
  });

  if (error || !data?.url) {
    Alert.alert(
      "Checkout unavailable",
      error?.message ?? "Unable to create a checkout session."
    );
    return;
  }

  await openPolarLink(data.url, returnUrl);
}

async function handlePolarPortal() {
  const returnUrl = Linking.createURL("/");
  const { data, error } = await authClient.customer.portal({
    redirect: false,
  });

  if (error || !data?.url) {
    Alert.alert(
      "Portal unavailable",
      error?.message ?? "Unable to open the customer portal."
    );
    return;
  }

  await openPolarLink(data.url, returnUrl);
}

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const privateData = useQuery(orpc.privateData.queryOptions());
  const isConnected = healthCheck?.data === "OK";
  const isLoading = healthCheck?.isLoading;
  const { data: session } = authClient.useSession();

  const mutedColor = useThemeColor("muted");
  const successColor = useThemeColor("success");
  const dangerColor = useThemeColor("danger");

  return (
    <Container className="p-6">
      <View className="mb-6 py-4">
        <Text className="text-foreground mb-2 text-4xl font-bold">
          BETTER T STACK
        </Text>
      </View>

      {session?.user ? (
        <Card variant="secondary" className="mb-6 p-4">
          <Text className="text-foreground mb-2 text-base">
            Welcome, <Text className="font-medium">{session.user.name}</Text>
          </Text>
          <Text className="text-muted mb-4 text-sm">{session.user.email}</Text>
          <Pressable
            className="bg-danger self-start rounded-lg px-4 py-3 active:opacity-70"
            onPress={() => {
              authClient.signOut();
              queryClient.invalidateQueries();
            }}
          >
            <Text className="text-foreground font-medium">Sign Out</Text>
          </Pressable>
          <View className="mt-4 gap-3">
            <Pressable
              className="bg-primary self-start rounded-lg px-4 py-3 active:opacity-70"
              onPress={handlePolarCheckout}
            >
              <Text className="text-foreground font-medium">
                Upgrade to Pro
              </Text>
            </Pressable>
            <Pressable
              className="border-border self-start rounded-lg border px-4 py-3 active:opacity-70"
              onPress={handlePolarPortal}
            >
              <Text className="text-foreground font-medium">
                Manage Subscription
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      <Card variant="secondary" className="p-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Card.Title>System Status</Card.Title>
          <Chip
            variant="secondary"
            color={isConnected ? "success" : "danger"}
            size="sm"
          >
            <Chip.Label>{isConnected ? "LIVE" : "OFFLINE"}</Chip.Label>
          </Chip>
        </View>

        <Card className="p-4">
          <View className="flex-row items-center">
            <View
              className={`mr-3 h-3 w-3 rounded-full ${isConnected ? "bg-success" : "bg-muted"}`}
            />
            <View className="flex-1">
              <Text className="text-foreground mb-1 font-medium">
                ORPC Backend
              </Text>
              <Card.Description>
                {getConnectionLabel(isLoading, isConnected)}
              </Card.Description>
            </View>
            {isLoading && (
              <Ionicons name="hourglass-outline" size={20} color={mutedColor} />
            )}
            {!isLoading && isConnected && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={successColor}
              />
            )}
            {!isLoading && !isConnected && (
              <Ionicons name="close-circle" size={20} color={dangerColor} />
            )}
          </View>
        </Card>
      </Card>

      <Card variant="secondary" className="mt-6 p-4">
        <Card.Title className="mb-3">Private Data</Card.Title>
        {privateData && (
          <Card.Description>{privateData.data?.message}</Card.Description>
        )}
      </Card>

      {!session?.user && (
        <>
          <SignIn />
          <SignUp />
        </>
      )}
    </Container>
  );
}
