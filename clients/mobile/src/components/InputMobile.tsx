import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../context/ThemeContext';

interface InputProps extends TextInputProps {
    label: string;
    placeholder: string;
    icon: string;
    secureTextEntry?: boolean;
}

export const InputMobile: React.FC<InputProps> = ({label, placeholder, icon, secureTextEntry, style, onFocus, onBlur, ...rest}: InputProps) => {
    const {theme} = useTheme();
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.container}>
            <Text style={[styles.label, {color: theme.subText}]}>{label}</Text>
            <View style={[styles.wrapper, {backgroundColor: theme.inputBg, borderColor: focused ? theme.accent : theme.border}]}>
                <Ionicons name={icon} size={20} color={theme.text}/>
                <TextInput
                    style={[styles.input, {color: theme.text}, style]}
                    accessibilityLabel={label}
                    selectionColor={theme.accent}
                    onFocus={event => {setFocused(true); onFocus?.(event);}}
                    onBlur={event => {setFocused(false); onBlur?.(event);}}
                    placeholder={placeholder}
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry={secureTextEntry}
                    {...rest}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {marginBottom: 15},
    label: {fontSize: 14, marginBottom: 8, marginLeft: 5},
    wrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 15,
        paddingHorizontal: 15,
        minHeight: 54,
        borderWidth: 1,
    },
    input: {flex: 1, minWidth: 0, marginLeft: 10, fontSize: 16, paddingVertical: 14},
});
