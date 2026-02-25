import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [handle, setHandle] = useState("");
  const [savedHandle, setSavedHandle] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) fetchHandle();
  }, [user]);

  const fetchHandle = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user?.id)
      .single();

    if (data) {
      setHandle(data.handle || "");
      setSavedHandle(data.handle || "");
    }
  };

  const updateHandle = async () => {
    if (!handle.trim()) {
      Alert.alert("Error", "Handle cannot be empty.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ handle: handle.trim() })
      .eq("id", user?.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSavedHandle(handle.trim());
      Alert.alert("Updated", "Your handle has been saved.");
    }
  };

  const changePassword = async () => {
    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Updated", "Your password has been changed.");
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const handleDirty = handle.trim() !== savedHandle;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Change Handle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Handle</Text>
        <TextInput
          style={styles.input}
          placeholder="Choose a handle"
          placeholderTextColor="#888"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.saveButton, !handleDirty && styles.saveButtonDisabled]}
          onPress={updateHandle}
          disabled={!handleDirty}
        >
          <Text
            style={[
              styles.saveButtonText,
              !handleDirty && styles.saveButtonTextDisabled,
            ]}
          >
            Save Handle
          </Text>
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor="#888"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#888"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.saveButton} onPress={changePassword}>
          <Text style={styles.saveButtonText}>Update Password</Text>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.emailLabel}>{user?.email}</Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
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
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00e676",
    textAlign: "center",
    marginBottom: 30,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 10,
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
  saveButton: {
    backgroundColor: "#00e676",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#333",
  },
  saveButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButtonTextDisabled: {
    color: "#888",
  },
  emailLabel: {
    color: "#888",
    fontSize: 15,
  },
  signOutButton: {
    marginTop: 10,
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
