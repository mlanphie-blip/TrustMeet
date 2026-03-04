import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(tabs)";

    // Routes accessible without any authentication
    const publicRoutes = ["proof"];
    if (publicRoutes.includes(segments[0] as string)) return;

    const allowedOutsideTabs = ["verify", "subscribe"];

    if (!user) {
      // Not logged in → send to login (root index)
      if (inAuthGroup || allowedOutsideTabs.includes(segments[0] as string)) {
        router.replace("/");
      }
    } else {
      // Logged in → send to tabs (allow verify/subscribe as exceptions)
      if (!inAuthGroup && !allowedOutsideTabs.includes(segments[0] as string)) {
        router.replace("/(tabs)/profile");
      }
    }
  }, [user, loading, segments]);

  // Block all rendering until auth state is determined
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#00e676" size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
