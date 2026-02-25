import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function VerifyScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [step, setStep] = useState<
    "upload" | "camera" | "preview" | "confirm"
  >("upload");
  const cameraRef = useRef<CameraView>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user]);

  // Load existing reference photo from profile
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("photo_url")
        .eq("id", user.id)
        .single();
      if (data?.photo_url) {
        setReferenceUrl(data.photo_url);
      }
      setLoadingProfile(false);
    };
    load();
  }, [user]);

  const pickReferencePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && user) {
      const file = result.assets[0];
      const fileExt = file.uri.split(".").pop() || "jpg";
      const filePath = `${user.id}/reference.${fileExt}`;

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: `reference.${fileExt}`,
        type: `image/${fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, formData, { upsert: true });

      if (uploadError) {
        Alert.alert("Upload Error", uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Save as profile photo_url
      await supabase
        .from("profiles")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", user.id);

      setReferenceUrl(urlData.publicUrl);
    }
  };

  const takeSelfie = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: false,
    });
    if (result) {
      setSelfieUri(result.uri);
      setStep("confirm");
    }
  };

  const submitVerification = async () => {
    if (!selfieUri || !user) return;
    setVerifying(true);

    try {
      // Upload the selfie
      const filePath = `${user.id}/verification.jpg`;

      const formData = new FormData();
      formData.append("file", {
        uri: selfieUri,
        name: "verification.jpg",
        type: "image/jpeg",
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, formData, { upsert: true });

      if (uploadError) {
        Alert.alert("Upload Error", uploadError.message);
        setVerifying(false);
        return;
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", user.id);

      if (updateError) {
        Alert.alert("Error", updateError.message);
        setVerifying(false);
        return;
      }

      Alert.alert(
        "Verified!",
        "Your identity has been verified. You now have a verified badge on your profile!",
        [{ text: "View Profile", onPress: () => router.replace("/(tabs)/profile") }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setVerifying(false);
    }
  };

  // Don't render anything if not logged in
  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#00e676" size="large" />
      </View>
    );
  }

  if (loadingProfile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#00e676" size="large" />
      </View>
    );
  }

  // Step 1: Upload reference photo
  if (step === "upload") {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🛡️</Text>
        </View>
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          First, upload a clear photo of yourself. Then you'll take a selfie to
          confirm your identity.
        </Text>

        {referenceUrl ? (
          <View style={styles.referenceContainer}>
            <Image
              source={{ uri: `${referenceUrl}?t=${Date.now()}` }}
              style={styles.referenceImage}
            />
            <Text style={styles.referenceLabel}>Your reference photo</Text>
            <TouchableOpacity onPress={pickReferencePhoto}>
              <Text style={styles.changePhotoText}>Change photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={pickReferencePhoto}
          >
            <Text style={styles.uploadIcon}>+</Text>
            <Text style={styles.uploadText}>Upload a photo of yourself</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, !referenceUrl && styles.buttonDisabled]}
          disabled={!referenceUrl}
          onPress={async () => {
            if (!permission?.granted) {
              await requestPermission();
            }
            setStep("camera");
          }}
        >
          <Text style={styles.buttonText}>Next: Take Selfie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Permission denied
  if (!permission?.granted && step === "camera") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          TrustMeet needs your camera to take a verification selfie.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => setStep("upload")}
        >
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Camera
  if (step === "camera") {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
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
            onPress={() => setStep("upload")}
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

  // Step 3: Confirm — show reference + selfie side by side
  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.confirmContent}
    >
      <Text style={styles.title}>Confirm Your Identity</Text>
      <Text style={styles.subtitle}>
        Make sure the selfie matches your uploaded photo
      </Text>

      <View style={styles.comparisonRow}>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Reference</Text>
          {referenceUrl && (
            <Image
              source={{ uri: `${referenceUrl}?t=${Date.now()}` }}
              style={styles.comparisonImage}
            />
          )}
        </View>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Selfie</Text>
          {selfieUri && (
            <Image
              source={{ uri: selfieUri }}
              style={styles.comparisonImage}
            />
          )}
        </View>
      </View>

      <View style={styles.previewButtons}>
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => {
            setSelfieUri(null);
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
            <Text style={styles.buttonText}>Confirm & Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    padding: 30,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  confirmContent: {
    padding: 30,
    paddingTop: 80,
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
  // Reference photo upload
  referenceContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  referenceImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#00e676",
    marginBottom: 10,
  },
  referenceLabel: {
    color: "#888",
    fontSize: 13,
  },
  changePhotoText: {
    color: "#00e676",
    fontSize: 14,
    marginTop: 6,
  },
  uploadBox: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: "#333",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 30,
    backgroundColor: "#1a1a1a",
  },
  uploadIcon: {
    color: "#555",
    fontSize: 36,
    marginBottom: 4,
  },
  uploadText: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: "#00e676",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#333",
  },
  buttonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  backLink: {
    marginTop: 20,
    alignItems: "center",
  },
  backLinkText: {
    color: "#aaa",
    fontSize: 15,
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
  // Comparison / Confirm styles
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 30,
  },
  comparisonItem: {
    alignItems: "center",
  },
  comparisonLabel: {
    color: "#888",
    fontSize: 13,
    marginBottom: 8,
  },
  comparisonImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
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
