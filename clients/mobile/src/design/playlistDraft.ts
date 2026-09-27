export const PLAYLIST_NAME_LIMIT = 30;
export const validPlaylistName = (name: string) => name.trim().length > 0 && name.trim().length <= PLAYLIST_NAME_LIMIT;

/** Omit untouched server images; null explicitly removes a cover. */
export function playlistDraft(name: string, isPublic: boolean, image: string | null, imageChanged: boolean) {
    return {name: name.trim(), is_public: isPublic, ...(imageChanged ? {image_url: image} : {})};
}
