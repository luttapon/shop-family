import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { FamilyMember } from '../../lib/types';
import { MembersSkeleton } from '../../lib/Skeleton';

export default function SettingsScreen() {
  const { profile, family, signOut, refreshFamily } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (family) fetchMembers();
    }, [family])
  );

  async function fetchMembers() {
    if (!family) {
      setMembersLoading(false);
      return;
    }
    setMembersLoading(true);
    const { data } = await supabase
      .from('family_members')
      .select('*, profiles:user_id(full_name, username)')
      .eq('family_id', family.id)
      .order('joined_at', { ascending: true });

    if (data) setMembers(data as unknown as FamilyMember[]);
    setMembersLoading(false);
  }

  async function handleShareCode() {
    if (!family?.invite_code) return;
    try {
      await Share.share({
        message: `เข้าร่วมครอบครัว "${family.name}" ในแอปของเข้าบ้าน!\nรหัสครอบครัว: ${family.invite_code}`,
      });
    } catch (e) {
      // User cancelled
    }
  }

  async function handleSignOut() {
    Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบใช่ไหม?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.section}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.full_name || 'ไม่ระบุชื่อ'}
            </Text>
            <Text style={styles.profileEmail}>{profile?.username}</Text>
          </View>
        </View>
      </View>

      {/* Family Card */}
      {family ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ครอบครัว</Text>
          <View style={styles.familyCard}>
            <View style={styles.familyHeader}>
              <View style={styles.familyIconContainer}>
                <Ionicons name="home" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.familyName}>{family.name}</Text>
                <Text style={styles.familyMeta}>
                  {members.length} สมาชิก
                </Text>
              </View>
            </View>

            {/* Invite Code */}
            {family.invite_code && (
              <TouchableOpacity
                style={styles.codeContainer}
                onPress={handleShareCode}
                activeOpacity={0.7}
              >
                <View style={styles.codeLeft}>
                  <Text style={styles.codeLabel}>รหัสครอบครัว</Text>
                  <Text style={styles.codeValue}>{family.invite_code}</Text>
                </View>
                <View style={styles.shareButton}>
                  <Ionicons name="share-outline" size={20} color="#10B981" />
                  <Text style={styles.shareText}>แชร์</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Members List */}
          <View style={styles.membersCard}>
            <Text style={styles.membersTitle}>สมาชิกในครอบครัว</Text>
            {membersLoading ? (
              <MembersSkeleton count={3} />
            ) : (
              members.map((member: any, index: number) => (
                <View
                  key={`${member.family_id}-${member.user_id}`}
                  style={[
                    styles.memberRow,
                    index < members.length - 1 && styles.memberRowBorder,
                  ]}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {member.profiles?.full_name || 'ไม่ระบุ'}
                    </Text>
                    <Text style={styles.memberRole}>
                      {member.role === 'admin' ? '👑 แอดมิน' : '👤 สมาชิก'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.noFamilyCard}>
            <Ionicons name="people-outline" size={48} color="#334155" />
            <Text style={styles.noFamilyTitle}>
              ยังไม่ได้เข้าร่วมครอบครัว
            </Text>
            <Text style={styles.noFamilySubtitle}>
              กรุณาสร้างบัญชีใหม่พร้อมสร้างหรือเข้าร่วมครอบครัว
            </Text>
          </View>
        </View>
      )}

      {/* Logout */}
      <View style={[styles.section, { marginBottom: 60 }]}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  familyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  familyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  familyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  familyMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeLeft: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 6,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  membersCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#64748B',
  },
  noFamilyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  noFamilyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
  },
  noFamilySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
});
