import {
  type ReactNode,
  type Ref,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { SwipeDirection } from '@/api';
import { colors, radius } from '@/theme';

/** How many cards are rendered at once (the top one plus the stack behind it). */
const VISIBLE_CARDS = 3;
const FLING_DURATION_MS = 260;

export interface SwipeDeckHandle {
  /** Animates the top card off screen, as if swiped. */
  swipe(direction: SwipeDirection): void;
}

interface SwipeDeckProps<T> {
  /** items[0] is the card on top. */
  items: T[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T, index: number) => ReactNode;
  /** Called after the fling animation; remove the item from `items` here. */
  onSwiped: (item: T, direction: SwipeDirection) => void;
  ref?: Ref<SwipeDeckHandle>;
}

export function SwipeDeck<T>({ items, keyExtractor, renderCard, onSwiped, ref }: SwipeDeckProps<T>) {
  const { width } = useWindowDimensions();
  // 0..1: how far the top card has been dragged toward a swipe. Drives the stack behind it.
  const progress = useSharedValue(0);
  const topCard = useRef<SwipeDeckHandle>(null);

  useImperativeHandle(ref, () => ({ swipe: (direction) => topCard.current?.swipe(direction) }), []);

  // A new card is on top: the stack behind it starts from rest again.
  const topKey = items.length > 0 ? keyExtractor(items[0]) : null;
  useLayoutEffect(() => {
    progress.set(0);
  }, [topKey, progress]);

  const visible = items.slice(0, VISIBLE_CARDS);
  return (
    <View style={styles.deck}>
      {visible
        .map((item, index) => ({ item, index }))
        .reverse()
        .map(({ item, index }) => (
          <DeckCard
            key={keyExtractor(item)}
            ref={index === 0 ? topCard : undefined}
            index={index}
            width={width}
            progress={progress}
            onSwiped={(direction) => onSwiped(item, direction)}>
            {renderCard(item, index)}
          </DeckCard>
        ))}
    </View>
  );
}

interface DeckCardProps {
  index: number;
  width: number;
  progress: SharedValue<number>;
  onSwiped: (direction: SwipeDirection) => void;
  ref?: Ref<SwipeDeckHandle>;
  children: ReactNode;
}

// One component type for every stack position, so a card keeps its state
// (chart range, loaded data) as it moves to the top.
function DeckCard({ index, width, progress, onSwiped, ref, children }: DeckCardProps) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const isTop = index === 0;
  const threshold = width * 0.28;

  const fling = (direction: SwipeDirection) => {
    'worklet';
    progress.set(withTiming(1, { duration: FLING_DURATION_MS }));
    x.set(
      withTiming(
        (direction === 'right' ? 1 : -1) * width * 1.4,
        { duration: FLING_DURATION_MS },
        (finished) => {
          if (finished) scheduleOnRN(onSwiped, direction);
        },
      ),
    );
  };

  useImperativeHandle(ref, () => ({ swipe: (direction) => fling(direction) }));

  const pan = Gesture.Pan()
    .enabled(isTop)
    // Let taps on buttons inside the card through; only horizontal drags swipe.
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      x.set(event.translationX);
      y.set(event.translationY * 0.25);
      progress.set(Math.min(Math.abs(event.translationX) / threshold, 1));
    })
    .onEnd((event) => {
      const projected = event.translationX + event.velocityX * 0.15;
      if (Math.abs(projected) > threshold) {
        fling(projected > 0 ? 'right' : 'left');
      } else {
        x.set(withSpring(0));
        y.set(withSpring(0));
        progress.set(withSpring(0));
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    if (index === 0) {
      return {
        transform: [
          { translateX: x.get() },
          { translateY: y.get() },
          { rotate: `${interpolate(x.get(), [-width, 0, width], [-12, 0, 12])}deg` },
        ],
      };
    }
    // Cards behind the top one move up a slot as the top card leaves.
    const slot = index - progress.get();
    return {
      opacity: interpolate(slot, [1, 2, 3], [1, 0.7, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(slot, [0, 1, 2], [0, 14, 28], Extrapolation.CLAMP) },
        { scale: interpolate(slot, [0, 1, 2], [1, 0.95, 0.9], Extrapolation.CLAMP) },
      ],
    };
  });

  const watchStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [20, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-threshold, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, { zIndex: VISIBLE_CARDS - index }, cardStyle]}
        pointerEvents={isTop ? 'auto' : 'none'}>
        {children}
        {isTop && (
          <>
            <Animated.View style={[styles.stamp, styles.watchStamp, watchStyle]}>
              <Text style={[styles.stampText, { color: colors.up }]}>Watch</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.passStamp, passStyle]}>
              <Text style={[styles.stampText, { color: colors.down }]}>Pass</Text>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1 },
  card: { ...StyleSheet.absoluteFill },
  stamp: {
    position: 'absolute',
    top: 28,
    borderWidth: 4,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  watchStamp: { left: 24, borderColor: colors.up, transform: [{ rotate: '-12deg' }] },
  passStamp: { right: 24, borderColor: colors.down, transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
});
