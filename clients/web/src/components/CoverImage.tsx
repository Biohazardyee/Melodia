import {useState} from "react";

const FALLBACK = "/melodia_placeholder.png";

// A changed source mounts a new loader, including when React reuses an album card.
function ImageLoader({src, alt}: {src: string; alt: string}) {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    return <div className="album-cover" aria-busy={!loaded}>
        {!loaded && <div aria-hidden="true" className="skeleton absolute inset-0"/>}
        <img src={failed ? FALLBACK : src || FALLBACK} alt={alt} loading="lazy" decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => {if (failed || !src) setLoaded(true); else setFailed(true);}}
            style={{opacity: loaded ? 1 : 0}}/>
    </div>;
}
export default function CoverImage(props: {src: string; alt: string}) {
    return <ImageLoader key={props.src} {...props}/>;
}
