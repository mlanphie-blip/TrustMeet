import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(true);

  // Check verification status whenever user changes
  useEffect(() => {
    if (!user) {
      setIsVerified(null);
      setCheckingVerification(false);
      return;
    }

    const checkVerification = async () => {
      setCheckingVerification(true);
      const { data } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", user.id)
        .single();

      setIsVerified(data?.is_verified ?? false);
      setCheckingVerification(false);
    };

    checkVerification();
  }, [user]);

  // Handle routing based on auth + verification state
  useEffect(() => {
    if (loading || checkingVerification) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const onVerifyScreen = segments[0] === "verify";

    if (!user) {
      // Not logged in → go to login
      if (inAuthGroup || onVerifyScreen) {
        router.replace("/");
      }
    } else if (!isVerified) {
      // Logged in but not verified → go to verify
      if (!onVerifyScreen) {
        router.replace("/verify");
      }
    } else {
      // Logged in and verified → go to home
      if (!inAuthGroup) {
        router.replace("/(tabs)/home");
      }
    }
  }, [user, loading, isVerified, checkingVerification, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
