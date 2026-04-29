import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShoppingItem, ShoppingList } from '../../lib/types';
import { ShoppingItemSkeleton } from '../../lib/Skeleton';

// Extracted as a proper component so hooks (useState, useEffect) can be used
function ShoppingItemCard({
  item,
  onTogglePurchase,
  onEdit,
  onDelete,
  getPreviousPrice,
}: {
  item: ShoppingItem;
  onTogglePurchase: (item: ShoppingItem) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
  getPreviousPrice: (productId: string) => Promise<number | null>;
}) {
  const productName = (item.products as any)?.name || 'ไม่ระบุ';
  const purchasedBy = (item.profiles as any)?.full_name;
  const [prevPrice, setPrevPrice] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (item.is_purchased && item.actual_price && item.product_id) {
      getPreviousPrice(item.product_id).then(setPrevPrice);
    }
  }, [item.is_purchased, item.actual_price]);

  const priceDiff =
    prevPrice !== null &&
    prevPrice !== undefined &&
    item.actual_price !== null
      ? item.actual_price - prevPrice
      : null;

  return (
    <View style={[styles.itemCard, item.is_purchased && styles.itemPurchased]}>
      {/* Checkbox */}
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onTogglePurchase(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkboxInner,
            item.is_purchased && styles.checkboxChecked,
          ]}
        >
          {item.is_purchased && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
      </TouchableOpacity>

      {/* Item info */}
      <View style={styles.itemInfo}>
        <Text
          style={[
            styles.itemName,
            item.is_purchased && styles.itemNamePurchased,
          ]}
        >
          {productName}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.unit || 'ชิ้น'}
          </Text>
          {item.is_purchased && item.actual_price !== null && (
            <View style={styles.priceDisplay}>
              <Text style={styles.itemPrice}>
                ฿{item.actual_price.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Text>
              {priceDiff !== null && priceDiff !== 0 && (
                <View
                  style={[
                    styles.priceDiffBadge,
                    {
                      backgroundColor:
                        priceDiff > 0
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(16,185,129,0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name={priceDiff > 0 ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={priceDiff > 0 ? '#EF4444' : '#10B981'}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: priceDiff > 0 ? '#EF4444' : '#10B981',
                    }}
                  >
                    {priceDiff > 0 ? '+' : ''}
                    {priceDiff.toFixed(0)}
                  </Text>
                </View>
              )}
            </View>
          )}
          {purchasedBy && (
            <Text style={styles.purchasedBy}>ซื้อโดย {purchasedBy}</Text>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={styles.actionBtn}
        >
          <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={styles.actionBtn}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { family } = useAuth();
  const router = useRouter();

  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [saving, setSaving] = useState(false);

  // Purchase modal state
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<ShoppingItem | null>(null);
  const [actualPrice, setActualPrice] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  async function fetchData() {
    if (!id) return;

    // Fetch list info
    const { data: listData } = await supabase
      .from('shopping_lists')
      .select('*, profiles:created_by(full_name)')
      .eq('id', id)
      .single();

    if (listData) setList(listData as unknown as ShoppingList);

    // Fetch items
    const { data: itemsData } = await supabase
      .from('shopping_items')
      .select(
        `
        *,
        products(name),
        profiles:purchased_by(full_name)
      `
      )
      .eq('list_id', id)
      .order('is_purchased', { ascending: true })
      .order('updated_at', { ascending: false });

    if (itemsData) setItems(itemsData as unknown as ShoppingItem[]);
    setLoading(false);
    setRefreshing(false);
  }

  async function handleAddOrEdit() {
    if (!productName.trim() || !family) return;
    setSaving(true);

    if (editingItem) {
      // Update product name
      if (editingItem.products) {
        await supabase
          .from('products')
          .update({ name: productName.trim() })
          .eq('id', editingItem.product_id!);
      }

      // Update item
      await supabase
        .from('shopping_items')
        .update({
          quantity: Number(quantity) || 1,
          unit: unit.trim() || null,
        })
        .eq('id', editingItem.id);
    } else {
      // Create product first
      const { data: product } = await supabase
        .from('products')
        .insert({ name: productName.trim(), family_id: family.id })
        .select()
        .single();

      if (product) {
        await supabase.from('shopping_items').insert({
          list_id: id,
          product_id: product.id,
          quantity: Number(quantity) || 1,
          unit: unit.trim() || null,
        });
      }
    }

    setModalVisible(false);
    resetForm();
    fetchData();
    setSaving(false);
  }

  async function handleTogglePurchase(item: ShoppingItem) {
    if (!item.is_purchased) {
      // Show price input modal
      setPurchaseItem(item);
      setActualPrice('');
      setPurchaseModalVisible(true);
    } else {
      // Unmark as purchased
      await supabase
        .from('shopping_items')
        .update({
          is_purchased: false,
          actual_price: null,
          purchased_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      fetchData();
    }
  }

  async function confirmPurchase() {
    if (!purchaseItem) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;

    await supabase
      .from('shopping_items')
      .update({
        is_purchased: true,
        actual_price: actualPrice ? Number(actualPrice) : null,
        purchased_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseItem.id);

    setPurchaseModalVisible(false);
    setPurchaseItem(null);
    fetchData();

    // Check if all items purchased => Mark list as completed
    const { data: remainingItems } = await supabase
      .from('shopping_items')
      .select('id')
      .eq('list_id', id!)
      .eq('is_purchased', false);

    if (remainingItems && remainingItems.length === 0) {
      await supabase
        .from('shopping_lists')
        .update({ is_completed: true })
        .eq('id', id!);
    }
  }

  async function deleteItem(itemId: string) {
    Alert.alert('ลบสินค้า', 'ต้องการลบสินค้านี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('shopping_items').delete().eq('id', itemId);
          fetchData();
        },
      },
    ]);
  }

  function openEditModal(item: ShoppingItem) {
    setEditingItem(item);
    setProductName((item.products as any)?.name || '');
    setQuantity(String(item.quantity));
    setUnit(item.unit || '');
    setModalVisible(true);
  }

  function resetForm() {
    setEditingItem(null);
    setProductName('');
    setQuantity('1');
    setUnit('');
  }

  // Get previous price for comparison
  async function getPreviousPrice(productId: string): Promise<number | null> {
    const { data } = await supabase
      .from('shopping_items')
      .select('actual_price')
      .eq('product_id', productId)
      .eq('is_purchased', true)
      .not('actual_price', 'is', null)
      .neq('list_id', id!)
      .order('updated_at', { ascending: false })
      .limit(1);

    return data && data.length > 0 ? data[0].actual_price : null;
  }

  function renderItem({ item }: { item: ShoppingItem }) {
    return (
      <ShoppingItemCard
        item={item}
        onTogglePurchase={handleTogglePurchase}
        onEdit={openEditModal}
        onDelete={deleteItem}
        getPreviousPrice={getPreviousPrice}
      />
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'กำลังโหลด...',
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <ShoppingItemSkeleton count={5} />
      </>
    );
  }

  const purchased = items.filter((i) => i.is_purchased).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((purchased / total) * 100) : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: list?.title || 'รายละเอียดรายการ',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <View style={styles.container}>
        {/* Summary Bar */}
        {total > 0 && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryText}>
                ซื้อแล้ว {purchased}/{total} ชิ้น
              </Text>
              <Text style={styles.summaryPercent}>{percent}%</Text>
            </View>
            <View style={styles.summaryBarBg}>
              <View
                style={[
                  styles.summaryBarFill,
                  {
                    width: `${percent}%`,
                    backgroundColor: percent === 100 ? '#10B981' : '#3B82F6',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {items.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="bag-outline" size={64} color="#334155" />
            <Text style={styles.emptyTitle}>ยังไม่มีสินค้า</Text>
            <Text style={styles.emptySubtitle}>กดปุ่ม + เพื่อเพิ่มสินค้า</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchData();
                }}
                tintColor="#10B981"
                colors={['#10B981']}
              />
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Add/Edit Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ชื่อสินค้า</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="เช่น น้ำมันพืช, ไข่ไก่"
                  placeholderTextColor="#64748B"
                  value={productName}
                  onChangeText={setProductName}
                  autoFocus
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>จำนวน</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="1"
                    placeholderTextColor="#64748B"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>หน่วย</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="ชิ้น, ขวด, กก."
                    placeholderTextColor="#64748B"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleAddOrEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingItem ? 'บันทึก' : 'เพิ่มสินค้า'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Purchase Price Modal */}
        <Modal
          visible={purchaseModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPurchaseModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>บันทึกการซื้อ</Text>
                <TouchableOpacity
                  onPress={() => setPurchaseModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.purchaseItemName}>
                📦 {(purchaseItem?.products as any)?.name}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ราคาที่ซื้อ (บาท)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="ใส่ราคา (ไม่บังคับ)"
                  placeholderTextColor="#64748B"
                  value={actualPrice}
                  onChangeText={setActualPrice}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={confirmPurchase}
              >
                <Text style={styles.saveButtonText}>✅ ยืนยันซื้อแล้ว</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
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
  },
  summaryBar: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  summaryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  summaryPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  summaryBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  summaryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemPurchased: {
    opacity: 0.65,
    borderColor: '#10B98133',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  itemMeta: {
    gap: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#64748B',
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  priceDiffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  purchasedBy: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
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
  purchaseItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
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
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
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
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
