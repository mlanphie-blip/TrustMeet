import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

const PROOF_API_URL =
  "https://ivjdnrobixctamawajib.supabase.co/functions/v1/proof-viewer";

interface ProofData {
  id: string;
  handle: string | null;
  photo_url: string | null;
  share_type: "full" | "incognito";
  created_at: string;
  expires_at: string;
}

export default function ProofScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [proof, setProof] = useState<ProofData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("Missing proof ID");
      setLoading(false);
      return;
    }

    fetch(`${PROOF_API_URL}?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProof(data);
        }
      })
      .catch(() => setError("Failed to load proof"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#00e676" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.logo}>ChatVerify</Text>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>✕</Text>
          </View>
          <Text style={styles.errorTitle}>{error}</Text>
          <Text style={styles.subtitle}>
            This verification proof is no longer available.
          </Text>
        </View>
      </View>
    );
  }

  const isIncognito = proof!.share_type === "incognito";
  const handle = proof!.handle ? `@${proof!.handle}` : "Anonymous";
  const proofLabel = isIncognito ? "Verified Human" : "ID Verified";
  const proofDescription = isIncognito
    ? "This user has been verified as a real person on ChatVerify. No personal photo was shared with this proof."
    : "This user has completed full identity verification on ChatVerify, including a photo match.";

  const sharedAt = new Date(proof!.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const expiresAt = new Date(proof!.expires_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <Text style={styles.logo}>ChatVerify</Text>

        {isIncognito || !proof!.photo_url ? (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarIcon}>✓</Text>
          </View>
        ) : (
          <Image
            source={{ uri: proof!.photo_url }}
            style={styles.avatar}
          />
        )}

        <Text style={styles.handle}>{handle}</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeCheck}>✓</Text>
          <Text style={styles.badgeText}>{proofLabel}</Text>
        </View>

        <Text style={styles.description}>{proofDescription}</Text>

        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Shared</Text>
            <Text style={styles.metaValue}>{sharedAt}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Expires</Text>
            <Text style={styles.metaValue}>{expiresAt}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Verified by ChatVerify</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 40,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  logo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00e676",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#00e676",
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#0d2e1a",
    borderWidth: 3,
    borderColor: "#00e676",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarIcon: {
    fontSize: 48,
    color: "#00e676",
  },
  handle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e1a",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeCheck: {
    fontWeight: "bold",
    color: "#00e676",
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00e676",
  },
  description: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
  meta: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  metaLabel: {
    color: "#888",
    fontSize: 13,
  },
  metaValue: {
    color: "#ccc",
    fontSize: 13,
  },
  footer: {
    color: "#555",
    fontSize: 12,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2a1a1a",
    borderWidth: 3,
    borderColor: "#ff5252",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 36,
    color: "#ff5252",
  },
  errorTitle: {
    fontSize: 20,
    color: "#ff5252",
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});
