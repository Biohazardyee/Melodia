import {
  FeedItem,
} from "../../../types/activities/activities.dto.js";
import { bufferToImageDataUri } from "../../../utils/imageDataUri.js";

const placeholder_img = "";

export const getImageUrl = (images: any[]) => {
  if (!images || !images.length) return placeholder_img;

  const img =
    images.find((i): boolean => i.size === "extralarge") || images[images.length - 1];

  const url = img["#text"];
  if (url && url.includes("2a96cbd8b46e4423")) return placeholder_img;

  return url || placeholder_img;
};

export const formatBinaryToImage = (data: any): string | null => {
  if (!data) return null;

  if (typeof data === "string") return data;

  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    return bufferToImageDataUri(data);
  }

  if (typeof data === "object" && data.type === "Buffer" && data.data) {
    return bufferToImageDataUri(Buffer.from(data.data));
  }

  return null;
};

export interface DiscoveryCandidate {
  key: string;
  albumName: string;
  artistName: string;
  cover: string;
  dbId: string | null;
  globalRating: number;
  source: "favorite" | "similar" | "collaborative";
  closeness: number;
  socialProofCount: number;
}

const normalizeKeyPart = (value: string): string => value.trim().toLowerCase();

/**
 * Ajoute (ou fusionne avec) un candidat de recommandation dans la map,
 * dédupliqué par artiste+album. En cas de doublon (le même album peut
 * arriver via plusieurs sources), on garde le meilleur signal de chaque
 * dimension plutôt que d'écraser bêtement l'entrée existante.
 */
export const addDiscoveryCandidate = (
  map: Map<string, DiscoveryCandidate>,
  data: Omit<DiscoveryCandidate, "key">,
): void => {
  const key = `${normalizeKeyPart(data.artistName)}||${normalizeKeyPart(data.albumName)}`;
  const existing: DiscoveryCandidate | undefined = map.get(key);

  if (!existing) {
    map.set(key, {...data, key});
    return;
  }

  map.set(key, {
    ...existing,
    dbId: existing.dbId || data.dbId,
    cover: existing.cover || data.cover,
    globalRating: Math.max(existing.globalRating || 0, data.globalRating || 0),
    socialProofCount: Math.max(existing.socialProofCount || 0, data.socialProofCount || 0),
    closeness: Math.max(existing.closeness, data.closeness),
    source: existing.closeness >= data.closeness ? existing.source : data.source,
  });
};

/**
 * Résout une URL de cover à partir d'un `content` de Media stocké en base
 * (peut contenir soit une string `cover` déjà résolue, soit un tableau
 * d'images au format LastFM).
 */
export const coverFromContent = (content: any): string => {
  if (!content) return "";
  if (typeof content.cover === "string" && content.cover) return content.cover;
  if (Array.isArray(content.image)) return extractLastFmImage(content.image) || "";
  if (content.album?.image) return extractLastFmImage(content.album.image) || "";
  return "";
};

export type DiscoveryReasonType = "favorite" | "similar" | "social" | "popular";

/**
 * Renvoie une catégorie de raison plutôt qu'un texte déjà formaté, pour que
 * le frontend puisse traduire côté client (avec interpolation de l'artiste)
 * au lieu de recevoir du texte figé en français.
 */
export const discoveryReasonType = (candidate: DiscoveryCandidate): DiscoveryReasonType => {
  if (candidate.source === "favorite") return "favorite";
  if (candidate.source === "similar") return "similar";
  if (candidate.socialProofCount > 0) return "social";
  return "popular";
};

const extractLastFmImage = (imageArray: any) => {
  if (!Array.isArray(imageArray)) return null;

  const image =
    imageArray.find((i: any): boolean => i.size === "extralarge") ||
    imageArray[imageArray.length - 1];

  const url = image ? image["#text"] : null;

  if (url && url.includes("2a96cbd8b46e4423")) return null;

  return url;
};

export const mapToFeedItem = (act: any, feedType: string): FeedItem => {
  const review = act.review;
  const media = act.media || review?.media;
  const content = media?.content;

  const user = act.user || review?.user;

  const rawUserImage = user?.profile_picture || user?.image;

  const formattedUserImage: string | null = formatBinaryToImage(rawUserImage);

  let foundCover = null;

  if (content) {
    if (typeof content.cover === "string") {
      foundCover = content.cover;
    } else if (content.album?.image) {
      foundCover = extractLastFmImage(content.album.image);
    } else if (content.image) {
      foundCover = extractLastFmImage(content.image);
    }
  }

  const albumCover =
    foundCover && foundCover.trim() !== ""
      ? foundCover
      : media?.cover_url || review?.media?.cover_url || "";

  const isReview: boolean = act.action === "review_created";

  return {
    id: act.id,
    type: isReview ? "review" : "like",

    user_id: user?.id,
    user_name: user?.pseudo || user?.username || "Utilisateur",

    user_image: formattedUserImage || undefined,
    equipped_avatar_border: user?.equipped_avatar_border ?? null,
    equipped_font: user?.equipped_font ?? null,
    equipped_text_effect: user?.equipped_text_effect ?? null,

    album:
      content?.name ||
      content?.album?.name ||
      media?.title ||
      review?.album_title ||
      "Album inconnu",

    artist:
      content?.artist ||
      content?.album?.artist ||
      media?.artist ||
      review?.artist_name ||
      "Artiste inconnu",

    cover: albumCover,

    media_id: media?.id || act.media_id || review?.media_id,
    review_id: review?.id || act.review_id,
    rating: review?.rating || act.rating_from_user,
    title: review?.title,
    content: review?.content,
    likes_count: review?._count?.likes || 0,
    comments_count: review?._count?.comments || 0,
    isLiked: !!(review?.likes && review.likes.length > 0),
    created_at: act.created_at,
  };
};
