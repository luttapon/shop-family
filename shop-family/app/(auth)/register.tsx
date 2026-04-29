import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../lib/AuthContext";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!fullName || !email || !password) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (mode === "create" && !familyName) {
      setError("กรุณาตั้งชื่อครอบครัว");
      return;
    }
    if (mode === "join" && !inviteCode) {
      setError("กรุณากรอกรหัสครอบครัว");
      return;
    }

    setLoading(true);
    setError("");

    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      mode === "create" ? familyName.trim() : undefined,
      mode === "join" ? inviteCode.trim() : undefined,
    );

    if (signUpError) {
      setError(signUpError.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่");
    } else {
      Alert.alert('สำเร็จ', 'สมัครสำเร็จแล้ว!', [
        {
          text: 'ตกลง',
          onPress: () => router.replace('/(auth)/login'),
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={44} color="#fff" />
          </View>
          <Text style={styles.title}>สร้างบัญชี</Text>
          <Text style={styles.subtitle}>
            ลงทะเบียนเพื่อเริ่มจัดการของเข้าบ้าน
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อ - นามสกุล</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="เช่น ทยากร คุ้มภัย"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Family Mode Toggle */}
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "create" && styles.modeButtonActive,
              ]}
              onPress={() => setMode("create")}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={mode === "create" ? "#fff" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.modeText,
                  mode === "create" && styles.modeTextActive,
                ]}
              >
                สร้างครอบครัวใหม่
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "join" && styles.modeButtonActive,
              ]}
              onPress={() => setMode("join")}
            >
              <Ionicons
                name="enter-outline"
                size={18}
                color={mode === "join" ? "#fff" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.modeText,
                  mode === "join" && styles.modeTextActive,
                ]}
              >
                เข้าร่วมครอบครัว
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "create" ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ตั้งชื่อครอบครัว</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="home-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="เช่น ครอบครัวใจดี"
                  placeholderTextColor="#9CA3AF"
                  value={familyName}
                  onChangeText={setFamilyName}
                />
              </View>
              <Text style={styles.hint}>
                💡 คุณจะได้รับรหัสครอบครัวเพื่อแชร์ให้สมาชิกคนอื่น
              </Text>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสครอบครัว</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    { letterSpacing: 4, fontWeight: "700" },
                  ]}
                  placeholder="XXXXXX"
                  placeholderTextColor="#9CA3AF"
                  value={inviteCode}
                  onChangeText={(text) => setInviteCode(text.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                />
              </View>
              <Text style={styles.hint}>
                🔑 ขอรหัสจากสมาชิกในครอบครัวที่สร้างไว้แล้ว
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ลงทะเบียน</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
          >
            <Text style={styles.linkText}>
              มีบัญชีอยู่แล้ว?{" "}
              <Text style={styles.linkHighlight}>เข้าสู่ระบบ</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    position: "absolute",
    top: -10,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorText: {
    color: "#EF4444",
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CBD5E1",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#334155",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 16,
    height: "100%",
  },
  eyeButton: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    paddingLeft: 4,
  },
  modeContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  modeButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  modeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  modeTextActive: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#10B981",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  linkHighlight: {
    color: "#10B981",
    fontWeight: "700",
  },
});
