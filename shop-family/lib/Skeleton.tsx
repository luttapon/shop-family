import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// Shimmer animation component
function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#334155',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Shopping List Card Skeleton ─────────────────────────────────
export function ShoppingListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={skeletonStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={skeletonStyles.listCard}>
          {/* Header: badge + delete */}
          <View style={skeletonStyles.row}>
            <SkeletonBox width={80} height={24} borderRadius={8} />
            <SkeletonBox width={18} height={18} borderRadius={4} />
          </View>

          {/* Title */}
          <SkeletonBox
            width="70%"
            height={20}
            borderRadius={6}
            style={{ marginTop: 12 }}
          />

          {/* Meta: date, count, person */}
          <View style={[skeletonStyles.row, { marginTop: 14, gap: 16 }]}>
            <SkeletonBox width={60} height={14} borderRadius={4} />
            <SkeletonBox width={50} height={14} borderRadius={4} />
            <SkeletonBox width={70} height={14} borderRadius={4} />
          </View>

          {/* Progress bar */}
          <View style={[skeletonStyles.row, { marginTop: 14 }]}>
            <SkeletonBox width="85%" height={6} borderRadius={3} />
            <SkeletonBox width={30} height={14} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Shopping Item Card Skeleton ─────────────────────────────────
export function ShoppingItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={skeletonStyles.container}>
      {/* Summary bar */}
      <View style={skeletonStyles.summaryBar}>
        <View style={skeletonStyles.rowBetween}>
          <SkeletonBox width={120} height={14} borderRadius={4} />
          <SkeletonBox width={36} height={14} borderRadius={4} />
        </View>
        <SkeletonBox
          width="100%"
          height={6}
          borderRadius={3}
          style={{ marginTop: 10 }}
        />
      </View>

      {/* Item cards */}
      <View style={{ padding: 16, gap: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={skeletonStyles.itemCard}>
            {/* Checkbox */}
            <SkeletonBox
              width={28}
              height={28}
              borderRadius={8}
              style={{ marginRight: 12 }}
            />

            {/* Item info */}
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width="60%" height={16} borderRadius={5} />
              <SkeletonBox width={50} height={13} borderRadius={4} />
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <SkeletonBox width={32} height={32} borderRadius={8} />
              <SkeletonBox width={32} height={32} borderRadius={8} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Price Compare Card Skeleton ─────────────────────────────────
export function PriceCompareSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={skeletonStyles.container}>
      {/* Summary row: 3 boxes */}
      <View style={skeletonStyles.summaryRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={skeletonStyles.summaryBox}>
            <SkeletonBox width={20} height={20} borderRadius={4} />
            <SkeletonBox
              width={28}
              height={24}
              borderRadius={6}
              style={{ marginTop: 6 }}
            />
            <SkeletonBox
              width={48}
              height={11}
              borderRadius={4}
              style={{ marginTop: 4 }}
            />
          </View>
        ))}
      </View>

      {/* Price cards */}
      <View style={{ padding: 16, gap: 12 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={skeletonStyles.priceCard}>
            {/* Header */}
            <View style={skeletonStyles.rowBetween}>
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width="55%" height={16} borderRadius={5} />
                <SkeletonBox width={70} height={12} borderRadius={4} />
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <SkeletonBox width={60} height={18} borderRadius={5} />
                <SkeletonBox width={48} height={22} borderRadius={8} />
              </View>
            </View>

            {/* Expand hint */}
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <SkeletonBox width={16} height={16} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Settings Members Skeleton ───────────────────────────────────
export function MembersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            skeletonStyles.memberRow,
            i < count - 1 && skeletonStyles.memberRowBorder,
          ]}
        >
          {/* Avatar */}
          <SkeletonBox
            width={40}
            height={40}
            borderRadius={12}
            style={{ marginRight: 12 }}
          />
          {/* Name + role */}
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox width="50%" height={15} borderRadius={4} />
            <SkeletonBox width={70} height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  listCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryBar: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
});
