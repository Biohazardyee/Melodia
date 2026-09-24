export interface RoomParticipantDto {
    id: string;
    username: string;
    pseudo: string;
    profile_picture: string | null;
}

export interface RoomQueueItemDto {
    id: string;
    track_uri: string;
    track_name: string;
    artist_name: string;
    album_art_url: string | null;
    duration_ms: number;
    added_by_id: string;
    position: number;
}

export interface RoomResponseDto {
    id: string;
    host_id: string;
    host?: RoomParticipantDto;
    name: string;
    is_public: boolean;
    current_track_uri: string | null;
    current_track_name: string | null;
    current_artist_name: string | null;
    current_album_art_url: string | null;
    current_duration_ms: number | null;
    position_ms: number;
    is_playing: boolean;
    position_updated_at: Date;
    is_host?: boolean;
    participant_count?: number;
    participants?: RoomParticipantDto[];
    queue_items?: RoomQueueItemDto[];
    created_at: Date;
    updated_at: Date;
}

export interface RoomAddDto {
    host_id: string;
    name: string;
    is_public: boolean;
    password?: string;
}

export interface RoomQueueAddDto {
    room_id: string;
    added_by_id: string;
    track_uri: string;
    track_name: string;
    artist_name: string;
    album_art_url?: string | null;
    duration_ms: number;
}
