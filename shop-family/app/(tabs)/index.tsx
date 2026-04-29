import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShoppingList } from '../../lib/types';
import { ShoppingListSkeleton } from '../../lib/Skeleton';

export default function ShoppingListsScreen() {
  const { family } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'weekly' | 'monthly'>('weekly');
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [family])
  );

  async function fetchLists() {
    if (!family) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('shopping_lists')
      .select(
        `
        *,
        profiles:created_by(full_name),
        shopping_items(id, is_purchased)
      `
      )
      .eq('family_id', family.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLists(data as unknown as ShoppingList[]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  async function createList() {
    if (!newTitle.trim() || !family) return;
    setCreating(true);

    const { error } = await supabase.from('shopping_lists').insert({
      family_id: family.id,
      title: newTitle.trim(),
      type: newType,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (!error) {
      setModalVisible(false);
      setNewTitle('');
      fetchLists();
    }
    setCreating(false);
  }

  async function deleteList(id: string) {
    Alert.alert('ลบรายการ', 'ต้องการลบรายการนี้ใช่ไหม?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          // Delete items first, then delete list
          await supabase.from('shopping_items').delete().eq('list_id', id);
          await supabase.from('shopping_lists').delete().eq('id', id);
          fetchLists();
        },
      },
    ]);
  }

  function getProgress(list: any) {
    const items = list.shopping_items || [];
    if (items.length === 0) return { total: 0, purchased: 0, percent: 0 };
    const purchased = items.filter((i: any) => i.is_purchased).length;
    return {
      total: items.length,
      purchased,
      percent: Math.round((purchased / items.length) * 100),
    };
  }

  function renderList({ item }: { item: any }) {
    const progress = getProgress(item);
    const isCompleted = item.is_completed;
    const typeLabel = item.type === 'monthly' ? 'ประจำเดือน' : 'ประจำสัปดาห์';
    const date = new Date(item.created_at).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });

    return (
      <TouchableOpacity
        style={[styles.listCard, isCompleted && styles.listCardCompleted]}
        onPress={() => router.push(`/list/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.listHeader}>
          <View style={styles.listTitleRow}>
            <View
              style={[
                styles.typeBadge,
                item.type === 'monthly'
                  ? styles.badgeMonthly
                  : styles.badgeWeekly,
              ]}
            >
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.completedText}>เสร็จแล้ว</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => deleteList(item.id)}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.listTitle}>{item.title}</Text>

        <View style={styles.listMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cart-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>
              {progress.purchased}/{progress.total} ชิ้น
            </Text>
          </View>
          {item.profiles?.full_name && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>{item.profiles.full_name}</Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {progress.total > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progress.percent}%`,
                    backgroundColor:
                      progress.percent === 100 ? '#10B981' : '#3B82F6',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progress.percent}%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContainer}>
          <ShoppingListSkeleton count={4} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!family ? (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={64} color="#334155" />
          <Text style={styles.emptyTitle}>ยังไม่ได้เข้าร่วมครอบครัว</Text>
          <Text style={styles.emptySubtitle}>
            ไปที่หน้าตั้งค่าเพื่อสร้างหรือเข้าร่วมครอบครัว
          </Text>
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cart-outline" size={64} color="#334155" />
          <Text style={styles.emptyTitle}>ยังไม่มีรายการซื้อของ</Text>
          <Text style={styles.emptySubtitle}>
            กดปุ่ม + เพื่อสร้างรายการแรก
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          renderItem={renderList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLists();
              }}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        />
      )}

      {/* FAB */}
      {family && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>สร้างรายการใหม่</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ชื่อรายการ</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="เช่น ของใช้ประจำสัปดาห์"
                placeholderTextColor="#64748B"
                value={newTitle}
                onChangeText={setNewTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ประเภท</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newType === 'weekly' && styles.typeButtonActive,
                  ]}
                  onPress={() => setNewType('weekly')}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={newType === 'weekly' ? '#fff' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      newType === 'weekly' && styles.typeButtonTextActive,
                    ]}
                  >
                    ประจำสัปดาห์
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newType === 'monthly' && styles.typeButtonActive,
                  ]}
                  onPress={() => setNewType('monthly')}
                >
                  <Ionicons
                    name="calendar"
                    size={18}
                    color={newType === 'monthly' ? '#fff' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      newType === 'monthly' && styles.typeButtonTextActive,
                    ]}
                  >
                    ประจำเดือน
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createButton, creating && styles.buttonDisabled]}
              onPress={createList}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>สร้างรายการ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  listCardCompleted: {
    borderColor: '#10B981',
    opacity: 0.75,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeWeekly: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  badgeMonthly: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  listMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    width: 36,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 16,
    height: 50,
    color: '#F8FAFC',
    fontSize: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  typeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
