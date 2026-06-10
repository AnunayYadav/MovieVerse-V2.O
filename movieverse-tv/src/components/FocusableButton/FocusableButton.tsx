import React, { useRef } from 'react';
import { Pressable, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolateColor 
} from 'react-native-reanimated';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';

interface FocusableButtonProps {
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  children: React.ReactNode | ((state: { focused: boolean }) => React.ReactNode);
  scaleOnFocus?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FocusableButton: React.FC<FocusableButtonProps> = ({
  onPress,
  onFocus,
  onBlur,
  style,
  children,
  scaleOnFocus = 1.05,
}) => {
  const isFocused = useSharedValue(0); // 0 = false, 1 = true

  const focusAnim = useSharedValue(0);

  const handleFocus = () => {
    focusAnim.value = withTiming(1, { duration: 150 });
    isFocused.value = 1;
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    focusAnim.value = withTiming(0, { duration: 150 });
    isFocused.value = 0;
    if (onBlur) {
      onBlur();
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withTiming(isFocused.value ? scaleOnFocus : 1.0, { duration: 150 });
    
    // Smoothly transition border color
    const borderColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.08)', Colors.focus]
    );

    return {
      transform: [{ scale }],
      borderColor,
      borderWidth: 2,
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={({ pressed }) => [
        styles.button,
        style,
        animatedStyle as any,
        pressed && styles.pressed,
      ]}
    >
      {typeof children === 'function' 
        ? (state: any) => children({ focused: isFocused.value === 1 }) 
        : children
      }
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default FocusableButton;
