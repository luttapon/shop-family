import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { PriceHistory } from '../../lib/types';
import { PriceCompareSkeleton } from '../../lib/Skeleton';

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'up':
      return { name: 'trending-up' as const, color: '#EF4444' };
    case 'down':
      return { name: 'trending-down' as const, color: '#10B981' };
    default:
      return { name: 'remove-outline' as const, color: '#64748B' };
  }
}

function getPriceDiff(latest: number, previous: number | null) {
  if (previous === null) return null;
  const diff = latest - previous;
  const percent = ((diff / previous) * 100).toFixed(1);
  return {
    diff,
    percent,
    label: diff > 0 ? `+${percent}%` : `${percent}%`,
  };
}

// Extracted as a proper component so useState hook can be used
function PriceCompareCard({ item }: { item: PriceHistory }) {
  const trend = getTrendIcon(item.trend);
  const priceDiff = getPriceDiff(item.latest_price, item.previous_price);
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.priceCount}>
            {item.prices.length} ครั้งที่ซื้อ
          </Text>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.latestPrice}>
            ฿{item.latest_price.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </Text>
          {priceDiff && (
            <View
              style={[
                styles.trendBadge,
                {
                  backgroundColor:
                    item.trend === 'up'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : item.trend === 'down'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(100, 116, 139, 0.15)',
                },
              ]}
            >
              <Ionicons name={trend.name} size={14} color={trend.color} />
              <Text style={[styles.trendText, { color: trend.color }]}>
                {priceDiff.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Price history bars */}
      {expanded && item.prices.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyDivider} />
          {item.prices.slice(0, 5).map((p, idx) => {
            const maxPrice = Math.max(...item.prices.map((x) => x.price));
            const barWidth = maxPrice > 0 ? (p.price / maxPrice) * 100 : 0;
            const date = new Date(p.date).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
            });

            return (
              <View key={idx} style={styles.historyRow}>
                <Text style={styles.historyDate}>{date}</Text>
                <View style={styles.historyBarBg}>
                  <View
                    style={[
                      styles.historyBar,
                      {
                        width: `${barWidth}%`,
                        backgroundColor:
                          idx === 0 ? '#10B981' : '#334155',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.historyPrice}>
                  ฿{p.price.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.expandHint}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#64748B"
        />
      </View>
    </TouchableOpacity>
  );
}
export default function PriceCompareScreen() {
  const { family } = useAuth();
  const [priceData, setPriceData] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPriceHistory();
    }, [family])
  );

  async function fetchPriceHistory() {
    if (!family) {
      setLoading(false);
      return;
    }

    // Get all purchased items with product info and list info
    const { data, error } = await supabase
      .from('shopping_items')
      .select(
        `
        actual_price,
        updated_at,
        products!inner(name, family_id),
        shopping_lists!inner(title, family_id, created_at)
      `
      )
      .eq('is_purchased', true)
      .not('actual_price', 'is', null)
      .eq('products.family_id', family.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      // Group by product name
      const grouped: Record<string, PriceHistory> = {};

      data.forEach((item: any) => {
        const name = item.products.name;
        if (!grouped[name]) {
          grouped[name] = {
            product_name: name,
            prices: [],
            trend: 'stable',
            latest_price: 0,
            previous_price: null,
          };
        }
        grouped[name].prices.push({
          price: item.actual_price,
          date: item.updated_at,
          list_title: item.shopping_lists.title,
        });
      });

      // Calculate trends
      const result = Object.values(grouped).map((item) => {
        item.prices.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        item.latest_price = item.prices[0]?.price || 0;
        item.previous_price =
          item.prices.length > 1 ? item.prices[1].price : null;

        if (item.previous_price !== null) {
          if (item.latest_price > item.previous_price) item.trend = 'up';
          else if (item.latest_price < item.previous_price) item.trend = 'down';
          else item.trend = 'stable';
        }
        return item;
      });

      result.sort((a, b) => a.product_name.localeCompare(b.product_name, 'th'));
      setPriceData(result);
    }

    setLoading(false);
    setRefreshing(false);
  }


  function renderItem({ item }: { item: PriceHistory }) {
    return <PriceCompareCard item={item} />;
  }

  if (loading) {
    return <PriceCompareSkeleton count={4} />;
  }

  return (
    <View style={styles.container}>
      {priceData.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={64} color="#334155" />
          <Text style={styles.emptyTitle}>ยังไม่มีข้อมูลราคา</Text>
          <Text style={styles.emptySubtitle}>
            เมื่อคุณซื้อของและบันทึกราคา ข้อมูลจะแสดงที่นี่
          </Text>
        </View>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: '#EF444433' }]}>
              <Ionicons name="trending-up" size={20} color="#EF4444" />
              <Text style={styles.summaryValue}>
                {priceData.filter((p) => p.trend === 'up').length}
              </Text>
              <Text style={styles.summaryLabel}>ราคาเพิ่ม</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#10B98133' }]}>
              <Ionicons name="trending-down" size={20} color="#10B981" />
              <Text style={styles.summaryValue}>
                {priceData.filter((p) => p.trend === 'down').length}
              </Text>
              <Text style={styles.summaryLabel}>ราคาลด</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#64748B33' }]}>
              <Ionicons name="remove-outline" size={20} color="#64748B" />
              <Text style={styles.summaryValue}>
                {priceData.filter((p) => p.trend === 'stable').length}
              </Text>
              <Text style={styles.summaryLabel}>คงที่</Text>
            </View>
          </View>

          <FlatList
            data={priceData}
            renderItem={renderItem}
            keyExtractor={(item) => item.product_name}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchPriceHistory();
                }}
                tintColor="#10B981"
                colors={['#10B981']}
              />
            }
          />
        </>
      )}
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
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  priceCount: {
    fontSize: 12,
    color: '#64748B',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  latestPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyContainer: {
    marginTop: 8,
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  historyDate: {
    fontSize: 11,
    color: '#64748B',
    width: 48,
  },
  historyBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  historyBar: {
    height: '100%',
    borderRadius: 4,
  },
  historyPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    width: 64,
    textAlign: 'right',
  },
  expandHint: {
    alignItems: 'center',
    marginTop: 4,
  },
});
