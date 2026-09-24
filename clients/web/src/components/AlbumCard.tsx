import {Link} from "react-router-dom";
import {Star} from "lucide-react";
import CoverImage from "./CoverImage";

type AlbumCardProps = {id: string; title: string; artist: string; cover: string; rating: number; genre?: string; to?: string};

export function AlbumCard({id, title, artist, cover, rating, to}: AlbumCardProps) {
    return (
        <Link to={to || `/album/${encodeURIComponent(id)}`} className="album-card group">
            <CoverImage src={cover} alt={title}/>
            <div className="album-meta">
                <h3 title={title}>{title}</h3>
                <p className="truncate" title={artist}>{artist}</p>
                <span className="album-rating"><Star size={13} fill="currentColor"/>{Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : "0.0"}<span className="text-muted">/ 5</span></span>
            </div>
        </Link>
    );
}
