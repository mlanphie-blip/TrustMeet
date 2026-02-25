import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  TextInput,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [myCode, setMyCode] = useState<string | null>(null);
  const [meets, setMeets] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchMeets();
  }, [user]);

  const fetchMeets = async () => {
    const { data } = await supabase
      .from("meets")
      .select("*, user1:profiles!meets_user1_id_fkey(*), user2:profiles!meets_user2_id_fkey(*)")
      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
      .order("created_at", { ascending: false });
    if (data) setMeets(data);
  };

  const generateCode = async () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const { error } = await supabase.from("meet_codes").insert({
      creator_id: user?.id,
      code: randomCode,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setMyCode(randomCode);
    }
  };

  const enterCode = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a code");
      return;
    }

    const { data: meetCode, error } = await supabase
      .from("meet_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !meetCode) {
      Alert.alert("Error", "Invalid code");
      return;
    }

    if (meetCode.used) {
      Alert.alert("Error", "This code has already been used");
      return;
    }

    if (new Date(meetCode.expires_at) < new Date()) {
      Alert.alert("Error", "This code has expired");
      return;
    }

    if (meetCode.creator_id === user?.id) {
      Alert.alert("Error", "You can't use your own code");
      return;
    }

    // Create the meet
    const { error: meetError } = await supabase.from("meets").insert({
      user1_id: meetCode.creator_id,
      user2_id: user?.id,
    });

    if (meetError) {
      Alert.alert("Error", meetError.message);
      return;
    }

    // Mark code as used
    await supabase
      .from("meet_codes")
      .update({ used: true })
      .eq("id", meetCode.id);

    // Update meet counts for both users
    await supabase.rpc("increment_meets_count", { user_id_input: meetCode.creator_id });
    await supabase.rpc("increment_meets_count", { user_id_input: user?.id });

    Alert.alert("Success", "Meet confirmed!");
    setCode("");
    fetchMeets();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TrustMeet</Text>

      {/* Generate Code Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate a Meet Code</Text>
        <TouchableOpacity style={styles.button} onPress={generateCode}>
          <Text style={styles.buttonText}>Generate Code</Text>
        </TouchableOpacity>
        {myCode && (
          <View style={styles.codeDisplay}>
            <Text style={styles.codeText}>{myCode}</Text>
            <Text style={styles.codeHint}>Share this code with the person near you</Text>
          </View>
        )}
      </View>

      {/* Enter Code Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enter a Meet Code</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter code"
          placeholderTextColor="#888"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.button} onPress={enterCode}>
          <Text style={styles.buttonText}>Confirm Meet</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Meets */}
      <Text style={styles.sectionTitle}>Recent Meets</Text>
      <FlatList
        data={meets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const other = item.user1_id === user?.id ? item.user2 : item.user1;
          return (
            <View style={styles.meetItem}>
              <Text style={styles.meetName}>{other?.handle || "Unknown"}</Text>
              <Text style={styles.meetDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No meets yet. Generate or enter a code!</Text>
        }
      />
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
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
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
  codeDisplay: {
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  codeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#00e676",
    letterSpacing: 5,
  },
  codeHint: {
    color: "#888",
    marginTop: 8,
    fontSize: 13,
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
    textAlign: "center",
    letterSpacing: 3,
  },
  meetItem: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meetName: {
    color: "#fff",
    fontSize: 16,
  },
  meetDate: {
    color: "#888",
    fontSize: 13,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});
