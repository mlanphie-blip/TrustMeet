import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function VerifyScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<"intro" | "camera" | "preview">("intro");
  const cameraRef = useRef<CameraView>(null);

  const takeSelfie = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: false,
    });
    if (result) {
      setPhoto(result.uri);
      setStep("preview");
    }
  };

  const submitVerification = async () => {
    if (!photo || !user) return;
    setVerifying(true);

    try {
      // Upload the selfie to Supabase storage
      const fileExt = "jpg";
      const filePath = `${user.id}/verification.${fileExt}`;

      const response = await fetch(photo);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        // Try FormData approach as fallback (works better on mobile)
        const formData = new FormData();
        formData.append("file", {
          uri: photo,
          name: `verification.${fileExt}`,
          type: `image/${fileExt}`,
        } as any);

        const { error: retryError } = await supabase.storage
          .from("avatars")
          .upload(filePath, formData, { upsert: true });

        if (retryError) {
          Alert.alert("Upload Error", retryError.message);
          setVerifying(false);
          return;
        }
      }

      // Get public URL for the selfie
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile: set photo_url and mark as verified
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          photo_url: urlData.publicUrl,
          is_verified: true,
        })
        .eq("id", user.id);

      if (updateError) {
        Alert.alert("Error", updateError.message);
        setVerifying(false);
        return;
      }

      Alert.alert(
        "Verified!",
        "You've been verified as a real person. Welcome to TrustMeet!",
        [{ text: "Let's go", onPress: () => router.replace("/(tabs)/home") }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setVerifying(false);
    }
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#00e676" size="large" />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted && step !== "intro") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          TrustMeet needs your camera to verify you're a real person.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 1: Intro
  if (step === "intro") {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🛡️</Text>
        </View>
        <Text style={styles.title}>Verify You're Real</Text>
        <Text style={styles.subtitle}>
          Take a quick selfie to prove you're a real, living human. This keeps
          TrustMeet safe for everyone.
        </Text>

        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Takes just a few seconds</Text>
          <Text style={styles.bullet}>• Your photo is stored securely</Text>
          <Text style={styles.bullet}>• Only visible to people you meet</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            if (!permission.granted) {
              await requestPermission();
            }
            setStep("camera");
          }}
        >
          <Text style={styles.buttonText}>Start Verification</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Camera
  if (step === "camera") {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.faceGuide} />
            <Text style={styles.cameraHint}>
              Position your face in the circle
            </Text>
          </View>
        </CameraView>

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep("intro")}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureButton} onPress={takeSelfie}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
      </View>
    );
  }

  // Step 3: Preview & Submit
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Looking Good!</Text>
      <Text style={styles.subtitle}>
        Make sure your face is clearly visible
      </Text>

      {photo && (
        <Image source={{ uri: photo }} style={styles.previewImage} />
      )}

      <View style={styles.previewButtons}>
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => {
            setPhoto(null);
            setStep("camera");
          }}
        >
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.confirmButton]}
          onPress={submitVerification}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Verify Me</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    padding: 30,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#00e676",
  },
  iconEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00e676",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  bulletList: {
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  bullet: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 28,
  },
  button: {
    backgroundColor: "#00e676",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  faceGuide: {
    width: 250,
    height: 320,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: "#00e676",
    borderStyle: "dashed",
  },
  cameraHint: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#0a0a0a",
  },
  captureButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#00e676",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00e676",
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    color: "#aaa",
    fontSize: 16,
  },
  // Preview styles
  previewImage: {
    width: 250,
    height: 320,
    borderRadius: 125,
    alignSelf: "center",
    marginBottom: 30,
    borderWidth: 3,
    borderColor: "#00e676",
  },
  previewButtons: {
    flexDirection: "row",
    gap: 15,
  },
  retakeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
  },
  retakeText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
  },
});
