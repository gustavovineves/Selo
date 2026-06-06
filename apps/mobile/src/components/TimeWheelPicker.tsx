import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Colors, Spacing, Radii, FontSize, FontWeight } from '../theme';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_VERTICAL = ITEM_HEIGHT * 2;

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

const TIME_SLOTS: TimeSlot[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
});

interface Props {
  hour: number;
  minute: number;
  onSelect: (hour: number, minute: number) => void;
}

export function TimeWheelPicker({ hour, minute, onSelect }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = TIME_SLOTS.findIndex(
    (s) => s.hour === hour && s.minute === minute,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, selectedIndex) * ITEM_HEIGHT,
        animated: false,
      });
    }, 80);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, TIME_SLOTS.length - 1));
      const slot = TIME_SLOTS[clamped];
      if (slot) onSelect(slot.hour, slot.minute);
    },
    [onSelect],
  );

  const handleItemPress = useCallback(
    (index: number, slot: TimeSlot) => {
      onSelect(slot.hour, slot.minute);
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    },
    [onSelect],
  );

  return (
    <View style={styles.container}>
      {/* Top fade overlay */}
      <View style={[styles.fade, styles.fadeTop]} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {TIME_SLOTS.map((slot, index) => {
          const isSelected = slot.hour === hour && slot.minute === minute;
          return (
            <TouchableOpacity
              key={slot.label}
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => handleItemPress(index, slot)}
              activeOpacity={0.7}
            >
              <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                {slot.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom fade overlay */}
      <View style={[styles.fade, styles.fadeBottom]} pointerEvents="none" />

      {/* Center selection indicator */}
      <View style={styles.selectionBar} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    overflow: 'hidden',
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: PADDING_VERTICAL,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  itemSelected: {
    backgroundColor: Colors.primaryGlow,
  },
  itemText: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    fontWeight: FontWeight.regular,
    letterSpacing: 1,
  },
  itemTextSelected: {
    fontSize: FontSize.xl,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 2,
    pointerEvents: 'none',
  },
  fadeTop: {
    top: 0,
    backgroundColor: Colors.bgCard + 'CC',
  },
  fadeBottom: {
    bottom: 0,
    backgroundColor: Colors.bgCard + 'CC',
  },
  selectionBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.primary + '50',
    zIndex: 1,
  },
});
