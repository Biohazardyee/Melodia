import React, {useEffect, useRef} from 'react';
import {AccessibilityInfo, Animated, StyleProp, ViewStyle} from 'react-native';
import {useTheme} from '../context/ThemeContext';

export default function Skeleton({style}: {style?: StyleProp<ViewStyle>}) {
    const {theme} = useTheme();
    const opacity = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        let disposed = false;
        let animation: Animated.CompositeAnimation | undefined;
        const update = (reduce: boolean) => {
            if (disposed) return;
            animation?.stop();
            opacity.setValue(1);
            if (!reduce) {
                animation = Animated.loop(Animated.sequence([
                    Animated.timing(opacity, {toValue: 0.4, duration: 800, useNativeDriver: true}),
                    Animated.timing(opacity, {toValue: 1, duration: 800, useNativeDriver: true}),
                ]));
                animation.start();
            }
        };
        AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {});
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
        return () => {disposed = true; animation?.stop(); subscription.remove();};
    }, [opacity]);
    return <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={[{backgroundColor: theme.surface, borderRadius: 12, opacity}, style]}/>;
}
