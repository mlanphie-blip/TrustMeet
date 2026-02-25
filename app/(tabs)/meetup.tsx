import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

type Mode = "menu" | "generate" | "scan";

export default function MeetupScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("menu");
  const [myCode, setMyCode] = useState<string | null>(null);
  const [meets, setMeets] = useState<any[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (user) fetchMeets();
  }, [user]);

  const fetchMeets = async () => {
    const { data } = await supabase
      .from("meets")
      .select(
        "*, user1:profiles!meets_user1_id_fkey(*), user2:profiles!meets_user2_id_fkey(*)"
      )
      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setMeets(data);
  };

  const generateCode = async () => {
    const randomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { error } = await supabase.from("meet_codes").insert({
      creator_id: user?.id,
      code: randomCode,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setMyCode(randomCode);
      setMode("generate");
    }
  };

  const processCode = async (code: string) => {
    const { data: meetCode, error } = await supabase
      .from("meet_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !meetCode) {
      Alert.alert("Invalid Code", "That code was not found.");
      return;
    }
    if (meetCode.used) {
      Alert.alert("Already Used", "This code has already been used.");
      return;
    }
    if (new Date(meetCode.expires_at) < new Date()) {
      Alert.alert("Expired", "This code has expired.");
      return;
    }
    if (meetCode.creator_id === user?.id) {
      Alert.alert("Error", "You can't use your own code.");
      return;
    }

    const { error: meetError } = await supabase.from("meets").insert({
      user1_id: meetCode.creator_id,
      user2_id: user?.id,
    });

    if (meetError) {
      Alert.alert("Error", meetError.message);
      return;
    }

    await supabase
      .from("meet_codes")
      .update({ used: true })
      .eq("id", meetCode.id);

    await supabase.rpc("increment_meets_count", {
      user_id_input: meetCode.creator_id,
    });
    await supabase.rpc("increment_meets_count", {
      user_id_input: user?.id,
    });

    Alert.alert("Success", "Meet confirmed!");
    setMode("menu");
    fetchMeets();
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Extract code from QR data (format: "TRUSTMEET:CODE")
    const code = data.startsWith("TRUSTMEET:") ? data.slice(10) : data;
    processCode(code);
  };

  const startScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Required",
          "Camera permission is needed to scan QR codes."
        );
        return;
      }
    }
    setScanned(false);
    setMode("scan");
  };

  // QR code display via web API
  const qrImageUrl = myCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`TRUSTMEET:${myCode}`)}`
    : null;

  if (mode === "generate" && myCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Meetup Code</Text>

        <View style={styles.qrContainer}>
          <Image
            source={{ uri: qrImageUrl! }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.codeText}>{myCode}</Text>
        <Text style={styles.hint}>
          Have the other person scan this QR code
        </Text>
        <Text style={styles.expiry}>Expires in 5 minutes</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setMyCode(null);
            setMode("menu");
          }}
        >
          <Text style={styles.secondaryButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === "scan") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scan QR Code</Text>

        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
          </View>
        </View>

        <Text style={styles.hint}>Point camera at a TrustMeet QR code</Text>

        {scanned && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.secondaryButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setMode("menu")}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Default: menu mode
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meetup</Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={generateCode}>
          <Text style={styles.primaryButtonIcon}>⊞</Text>
          <Text style={styles.primaryButtonText}>Generate Code</Text>
          <Text style={styles.primaryButtonHint}>Show QR for others to scan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={startScan}>
          <Text style={styles.primaryButtonIcon}>⊟</Text>
          <Text style={styles.primaryButtonText}>Scan Code</Text>
          <Text style={styles.primaryButtonHint}>Scan someone's QR code</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Meets */}
      <Text style={styles.sectionTitle}>Recent Meets</Text>
      <FlatList
        data={meets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const other =
            item.user1_id === user?.id ? item.user2 : item.user1;
          return (
            <View style={styles.meetItem}>
              <Text style={styles.meetName}>
                {other?.handle ? `@${other.handle}` : "Unknown"}
              </Text>
              <Text style={styles.meetDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No meets yet. Start a meetup!
          </Text>
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
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#00e676",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  primaryButtonIcon: {
    fontSize: 32,
    color: "#00e676",
    marginBottom: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  primaryButtonHint: {
    color: "#888",
    fontSize: 11,
    textAlign: "center",
  },
  qrContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 20,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  codeText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#00e676",
    textAlign: "center",
    letterSpacing: 6,
    marginBottom: 8,
  },
  hint: {
    color: "#888",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 8,
  },
  expiry: {
    color: "#ff9800",
    textAlign: "center",
    fontSize: 13,
    marginBottom: 24,
  },
  secondaryButton: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#00e676",
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: "#00e676",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#ff5252",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraWrapper: {
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "#00e676",
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
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
