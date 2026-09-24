import {useEffect, useRef, useState} from "react";

/** Explicit QA-build opt-in only. Never transmits metrics or records user content. */
export default function LocalPerformancePanel() {
    const lcp = useRef<number | null>(null);
    const [report, setReport] = useState("");
    useEffect(() => {
        if (!PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) return;
        const observer = new PerformanceObserver(list => {
            const entries = list.getEntries();
            lcp.current = entries[entries.length - 1]?.startTime ?? null;
        });
        observer.observe({type: "largest-contentful-paint", buffered: true});
        return () => observer.disconnect();
    }, []);
    const measure = () => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        const scripts = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
            .filter(e => e.name.includes("/assets/") && e.name.endsWith(".js"))
            .map(e => ({file: e.name.split("/").pop(), bytes: e.decodedBodySize, durationMs: Math.round(e.duration)}));
        setReport(JSON.stringify({domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd || 0),
            firstContentfulPaintMs: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0),
            largestContentfulPaintMs: lcp.current === null ? null : Math.round(lcp.current), scripts}, null, 2));
    };
    return <details className="fixed bottom-2 right-2 z-50 bg-panel text-ink border border-line rounded-xl p-3 max-w-sm shadow-xl">
        <summary className="cursor-pointer text-xs">Local QA metrics</summary>
        <button onClick={measure} className="secondary-action my-2">Measure load</button>
        <pre className="text-xs max-h-72 overflow-auto" aria-live="polite">{report}</pre>
    </details>;
}
