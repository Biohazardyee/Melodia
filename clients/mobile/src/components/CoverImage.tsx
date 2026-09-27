import React, {useState} from 'react';
import {Image, StyleSheet, View, StyleProp, ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '../context/ThemeContext';
import Skeleton from './Skeleton';

export default function CoverImage({uri, style, label}: {uri?: string | null; style?: StyleProp<ViewStyle>; label?: string}) {
    // Remount the request state when the URL changes; late callbacks cannot affect the new image.
    return <CoverRequest key={uri || 'empty'} uri={uri} style={style} label={label}/>;
}
function CoverRequest({uri, style, label}: {uri?: string | null; style?: StyleProp<ViewStyle>; label?: string}) {
    const {theme} = useTheme();
    const [loading, setLoading] = useState(!!uri);
    const [failed, setFailed] = useState(false);
    return <View style={[{backgroundColor: theme.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}, style]}>
        {(!uri || failed) ? <Ionicons name="musical-notes-outline" size={32} color={theme.accent}/> : <Image
            source={{uri}} accessibilityLabel={label} accessible={!!label} resizeMode="cover"
            style={StyleSheet.absoluteFill} onLoad={() => setLoading(false)} onError={() => {setFailed(true); setLoading(false);}}/>}
        {loading && !failed && <Skeleton style={StyleSheet.absoluteFill}/>}
    </View>;
}
