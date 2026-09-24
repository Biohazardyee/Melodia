import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

// Keep the picker AND its dictionary in the lazy chunk, not the conversation route.
export default function MessageEmojiPicker({onSelect, locale, theme}: {onSelect: (emoji: {native: string}) => void; locale: string; theme: "light" | "dark"}) {
    return <Picker data={data} onEmojiSelect={onSelect} locale={locale} theme={theme} previewPosition="none"/>;
}
