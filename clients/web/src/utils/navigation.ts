/** Direct entry or external history must use a safe in-app fallback. */
export function backDestination(historyIndex: unknown, fallback = "/home"): -1 | string {
    return typeof historyIndex === "number" && Number.isFinite(historyIndex) && historyIndex > 0 ? -1 : fallback;
}
