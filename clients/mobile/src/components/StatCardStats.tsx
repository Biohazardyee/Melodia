import React, {useState} from "react";
import {View, Text, StyleSheet, Pressable, PressableStateCallbackType} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {useTheme} from "../context/ThemeContext";

type StatCardProps = {
    title: string;
    count?: string;
    icon: string;
    color: string;
    showCheckbox?: boolean;
    initialChecked?: boolean;
    onPress?: (checked: boolean) => void;
};

const StatCard: React.FC<StatCardProps> = ({
                                               title,
                                               count,
                                               icon,
                                               color,
                                               showCheckbox = false,
                                               initialChecked = false,
                                               onPress,
                                           }: StatCardProps) => {
    const {theme} = useTheme();
    const [checked, setChecked] = useState(initialChecked);

    const handlePress: () => void = (): void => {
        const newCheckedStatus: boolean = !checked;
        setChecked(newCheckedStatus);
        if (onPress) {
            onPress(newCheckedStatus);
        }
    };

    return (
        <Pressable
            style={({pressed}: PressableStateCallbackType) => [
                styles.card,
                {backgroundColor: theme.card},
                checked && showCheckbox
                    ? {borderColor: color, borderWidth: 1}
                    : {borderColor: theme.border, borderWidth: 1},
                {opacity: pressed ? 0.8 : 1},
            ]}
            onPress={handlePress}
        >
            {showCheckbox && (
                <View style={styles.checkboxContainer}>
                    <Icon
                        name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={22}
                        color={checked ? color : theme.subText}
                    />
                </View>
            )}
            <View style={styles.cardHeader}>
                <Icon name={icon} size={20} color={color}/>
                <Text style={[styles.cardCount, {color: theme.text}]}>{count}</Text>
            </View>
            <Text style={[styles.cardTitle, {color: theme.subText}]}>{title}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        width: "48%",
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
    },
    checkboxContainer: {
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardCount: {
        fontSize: 22,
        fontWeight: "bold",
    },
    cardTitle: {
        marginTop: 10,
        fontSize: 13,
    },
    progressBarBg: {
        height: 4,
        borderRadius: 2,
        marginTop: 10,
    },
    progressBarFill: {
        height: 4,
        borderRadius: 2,
    },
});

export default StatCard;
