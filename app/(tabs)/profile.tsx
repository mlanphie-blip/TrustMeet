import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Share,
  ScrollView,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

export default function ProfileScreen() {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [trustScore, setTrustScore] = useState(100);
  const [meetsCount, setMeetsCount] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Re-fetch profile every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) fetchProfile();
    }, [user])
  );

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (data) {
      setHandle(data.handle || "");
      setPhotoUrl(data.photo_url || null);
      setTrustScore(data.trust_score);
      setMeetsCount(data.meets_count);
      setIsVerified(data.is_verified ?? false);
    } else {
      await supabase.from("profiles").insert({
        id: user?.id,
        handle: "",
        trust_score: 100,
        meets_count: 0,
      });
    }
  };

  const shareProfile = async () => {
    const profileUrl = `https://trustmeet.app/u/${user?.id}`;
    const name = handle ? `@${handle}` : "a TrustMeet user";
    try {
      await Share.share({
        message: `${name} is verified on TrustMeet. View their profile: ${profileUrl}`,
      });
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>TrustMeet</Text>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>No Photo</Text>
          </View>
        )}
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedCheck}>✓</Text>
          </View>
        )}
      </View>

      {/* Handle */}
      {handle ? (
        <Text style={styles.handleText}>@{handle}</Text>
      ) : (
        <TouchableOpacity onPress={() => router.push("/(tabs)/settings")}>
          <Text style={styles.noHandleText}>Tap to set a handle</Text>
        </TouchableOpacity>
      )}

      {/* Verification Status */}
      {isVerified ? (
        <View style={styles.verifiedRow}>
          <Text style={styles.verifiedIcon}>✓</Text>
          <Text style={styles.verifiedText}>ID Verified</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.getVerifiedButton}
          onPress={() => router.push("/verify")}
        >
          <Text style={styles.getVerifiedText}>Get Verified</Text>
        </TouchableOpacity>
      )}

      {/* Trust Score & Meets */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{trustScore}</Text>
          <Text style={styles.statLabel}>Trust Score</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{meetsCount}</Text>
          <Text style={styles.statLabel}>Meets</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity style={styles.meetupButton} onPress={() => router.push("/(tabs)/meetup")}>
        <Text style={styles.meetupButtonText}>Start a Meetup</Text>
      </TouchableOpacity>

      {isVerified && (
        <TouchableOpacity style={styles.shareButton} onPress={shareProfile}>
          <Text style={styles.shareButtonText}>Share Proof of ID</Text>
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
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00e676",
    textAlign: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#00e676",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00e676",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0a0a0a",
  },
  verifiedCheck: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  handleText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  noHandleText: {
    fontSize: 15,
    color: "#888",
    marginBottom: 8,
    textDecorationLine: "underline",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d2e1a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    gap: 6,
  },
  verifiedIcon: {
    color: "#00e676",
    fontSize: 16,
    fontWeight: "bold",
  },
  verifiedText: {
    color: "#00e676",
    fontSize: 14,
    fontWeight: "600",
  },
  getVerifiedButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00e676",
    marginBottom: 24,
  },
  getVerifiedText: {
    color: "#00e676",
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 32,
  },
  statBox: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#00e676",
  },
  statLabel: {
    color: "#888",
    fontSize: 13,
    marginTop: 4,
  },
  meetupButton: {
    backgroundColor: "#00e676",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  meetupButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  shareButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00e676",
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  shareButtonText: {
    color: "#00e676",
    fontSize: 16,
    fontWeight: "600",
  },
});
