import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function SubscribeScreen() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [sharesUsed, setSharesUsed] = useState(0);
  const [meetupsUsed, setMeetupsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchUsage();
  }, [user]);

  const fetchUsage = async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [profileRes, sharesRes, meetupsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user?.id)
        .single(),
      supabase
        .from("proof_shares")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("meet_codes")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user?.id)
        .gte("created_at", monthStart.toISOString()),
    ]);

    setIsPremium(profileRes.data?.is_premium ?? false);
    setSharesUsed(sharesRes.count ?? 0);
    setMeetupsUsed(meetupsRes.count ?? 0);
    setLoading(false);
  };

  const handleSubscribe = () => {
    // Placeholder — integrate RevenueCat or Stripe here
    Alert.alert(
      "Coming Soon",
      "Premium subscriptions will be available soon. Thanks for your interest!"
    );
  };

  const handleRestore = () => {
    Alert.alert(
      "Restore",
      "If you've previously subscribed, your premium status will be restored automatically."
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>

      <Text style={styles.title}>TrustMeet Premium</Text>
      <Text style={styles.subtitle}>
        Unlimited access to all TrustMeet features
      </Text>

      {/* Current Usage */}
      {!isPremium && (
        <View style={styles.usageCard}>
          <Text style={styles.usageTitle}>Your Free Usage This Month</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>ID Shares</Text>
            <View style={styles.usageBarOuter}>
              <View
                style={[
                  styles.usageBarInner,
                  { width: `${Math.min((sharesUsed / 5) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.usageCount}>{sharesUsed}/5</Text>
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Meetup Codes</Text>
            <View style={styles.usageBarOuter}>
              <View
                style={[
                  styles.usageBarInner,
                  { width: `${Math.min((meetupsUsed / 5) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.usageCount}>{meetupsUsed}/5</Text>
          </View>
        </View>
      )}

      {/* Plan Comparison */}
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>Free</Text>
        <Text style={styles.planPrice}>$0/month</Text>
        <View style={styles.featureList}>
          <Text style={styles.feature}>5 ID shares per month</Text>
          <Text style={styles.feature}>5 meetup codes per month</Text>
          <Text style={styles.feature}>Basic profile</Text>
          <Text style={styles.feature}>ID verification</Text>
        </View>
        {!isPremium && (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
        )}
      </View>

      <View style={styles.premiumCard}>
        <Text style={styles.planTitle}>Premium</Text>
        <Text style={styles.premiumPrice}>$4.99/month</Text>
        <View style={styles.featureList}>
          <Text style={styles.premiumFeature}>Unlimited ID shares</Text>
          <Text style={styles.premiumFeature}>Unlimited meetup codes</Text>
          <Text style={styles.premiumFeature}>Priority support</Text>
          <Text style={styles.premiumFeature}>Early access to new features</Text>
        </View>
        {isPremium ? (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
          >
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isPremium && (
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchase</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    fontSize: 16,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
  closeText: {
    color: "#aaa",
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffd600",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
  },
  usageCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  usageTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  usageLabel: {
    color: "#aaa",
    fontSize: 13,
    width: 100,
  },
  usageBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
  },
  usageBarInner: {
    height: "100%",
    backgroundColor: "#00e676",
    borderRadius: 4,
  },
  usageCount: {
    color: "#888",
    fontSize: 12,
    width: 30,
    textAlign: "right",
  },
  planCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  premiumCard: {
    backgroundColor: "#1a1a0a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#ffd600",
  },
  planTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  planPrice: {
    color: "#888",
    fontSize: 16,
    marginBottom: 16,
  },
  premiumPrice: {
    color: "#ffd600",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
    marginBottom: 16,
  },
  feature: {
    color: "#aaa",
    fontSize: 14,
    paddingLeft: 8,
  },
  premiumFeature: {
    color: "#fff",
    fontSize: 14,
    paddingLeft: 8,
  },
  currentPlanBadge: {
    backgroundColor: "#0d2e1a",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  currentPlanText: {
    color: "#00e676",
    fontSize: 14,
    fontWeight: "600",
  },
  subscribeButton: {
    backgroundColor: "#ffd600",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  restoreText: {
    color: "#888",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
