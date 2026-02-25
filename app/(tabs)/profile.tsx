import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [handle, setHandle] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [trustScore, setTrustScore] = useState(100);
  const [meetsCount, setMeetsCount] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

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
      // Create profile if it doesn't exist
      await supabase.from("profiles").insert({
        id: user?.id,
        handle: "",
        trust_score: 100,
        meets_count: 0,
      });
    }
  };

  const updateHandle = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ handle })
      .eq("id", user?.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Handle updated!");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      const fileExt = file.uri.split(".").pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: `avatar.${fileExt}`,
        type: `image/${fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, formData, { upsert: true });

      if (uploadError) {
        Alert.alert("Error", uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      await supabase
        .from("profiles")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", user?.id);

      setPhotoUrl(urlData.publicUrl);
      Alert.alert("Success", "Photo updated!");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Avatar */}
      <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>Tap to add photo</Text>
          </View>
        )}
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedCheck}>✓</Text>
          </View>
        )}
      </TouchableOpacity>

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

      {/* Debug: remove this later */}
      <Text style={{ color: "#ff5252", textAlign: "center", fontSize: 12, marginBottom: 10 }}>
        verified={String(isVerified)}
      </Text>

      {/* Trust Score */}
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

      {/* Handle */}
      <View style={styles.section}>
        <Text style={styles.label}>Handle</Text>
        <TextInput
          style={styles.input}
          placeholder="Choose a handle"
          placeholderTextColor="#888"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={updateHandle}>
          <Text style={styles.buttonText}>Save Handle</Text>
        </TouchableOpacity>
      </View>

      {/* Email */}
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.emailText}>{user?.email}</Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00e676",
    textAlign: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 10,
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
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d2e1a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
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
    alignSelf: "center",
    backgroundColor: "#1a1a1a",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00e676",
    marginBottom: 20,
  },
  getVerifiedText: {
    color: "#00e676",
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    marginBottom: 30,
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
  section: {
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  button: {
    backgroundColor: "#00e676",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  emailText: {
    color: "#888",
    fontSize: 16,
  },
  signOutButton: {
    marginTop: 30,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ff5252",
    alignItems: "center",
  },
  signOutText: {
    color: "#ff5252",
    fontSize: 16,
    fontWeight: "600",
  },
});
