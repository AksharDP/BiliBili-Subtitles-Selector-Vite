import { createDiv } from "../ui/components";
import subtitleViewerTemplate from "../templates/SubtitleViewer.html?raw";
import {
    checkSubtitleInCache,
    getToken,
    loadSettingsFromIndexedDB,
    saveSettingsToIndexedDB,
} from "../db/indexedDB";
import { fetchSubtitleData } from "../api/openSubtitles";
import { setupSubtitleDisplay } from "../utils/subtitleDisplay";
import { ActiveModal, setActiveModal } from "./ModalManager";
import {
    updateCacheStatusDisplay as updateResultsCacheStatus,
    resultsModal,
    resultsOverlay,
} from "./ResultsModal";
import { RED, GREEN, BLACK, WHITE, YELLOW } from "../utils/constants";

interface TimestampInfo {
    startTime: number;
    endTime: number;
    startIndex: number;
    endIndex: number;
    text: string;
}

export let subtitleViewerOverlay: HTMLDivElement | null = null;
export let subtitleViewerModal: HTMLDivElement | null = null;
let closeBtn: HTMLButtonElement | null = null;
let copyBtn: HTMLButtonElement | null = null;
let syncBtn: HTMLButtonElement | null = null;
let subtitleContentArea: HTMLTextAreaElement | null = null;
let loadingIndicator: HTMLElement | null = null;
let viewerTitleElement: HTMLElement | null = null;
let syncStatusElement: HTMLElement | null = null;
let cacheIndicatorElement: HTMLElement | null = null;

declare global {
    interface Window {
        subtitleTimestamps: TimestampInfo[];
        activeCues: any[] | undefined;
        currentActiveModal: ActiveModal | undefined;
    }
}

export function createSubtitleViewer(): void {
    if (document.getElementById("subtitle-viewer-overlay")) return;

    const overlayDiv = createDiv(
        "subtitle-viewer-overlay",
        "",
        `position: fixed; top: 0; left: 0; width: 0; height: 100%; background-color: transparent;
        z-index: 9999; display: none; justify-content: center; align-items: center; pointer-events: none;`
    );

    const modalDiv = createDiv(
        "subtitle-viewer-content",
        "",
        `background-color: ${WHITE}; padding: 0; border-radius: 6px; box-shadow: 0 4px 10px rgba(${BLACK}, 0.3);
        width: 500px; max-width: 90%; height: 80vh; display: flex; flex-direction: column; overflow: hidden;
        opacity: 0; position: absolute; pointer-events: auto; transition: transform 0.3s ease, opacity 0.3s ease;`
    );

    modalDiv.innerHTML = subtitleViewerTemplate;
    overlayDiv.appendChild(modalDiv);
    document.body.appendChild(overlayDiv);

    subtitleViewerOverlay = overlayDiv;
    subtitleViewerModal = modalDiv;
    closeBtn = subtitleViewerModal.querySelector(
        "#subtitle-viewer-close-btn"
    ) as HTMLButtonElement;
    copyBtn = subtitleViewerModal.querySelector(
        "#subtitle-copy-btn"
    ) as HTMLButtonElement;
    syncBtn = subtitleViewerModal.querySelector(
        "#subtitle-sync"
    ) as HTMLButtonElement;
    subtitleContentArea = subtitleViewerModal.querySelector(
        "#subtitle-content"
    ) as HTMLTextAreaElement;
    loadingIndicator = subtitleViewerModal.querySelector(
        "#subtitle-loading"
    ) as HTMLElement;
    viewerTitleElement = subtitleViewerModal.querySelector(
        "#subtitle-viewer-title"
    ) as HTMLElement;
    syncStatusElement = subtitleViewerModal.querySelector(
        "#subtitle-sync-status"
    ) as HTMLElement;
    cacheIndicatorElement = subtitleViewerModal.querySelector(
        "#subtitle-cache-indicator"
    ) as HTMLElement;

    closeBtn?.addEventListener("click", hideSubtitleViewer);
    copyBtn?.addEventListener("click", copySubtitleToClipboard);
    syncBtn?.addEventListener("click", autoSyncSubtitles);
    subtitleContentArea?.addEventListener("click", handleTimestampClick);

    if (!document.getElementById("subtitle-viewer-styles")) {
        const style = document.createElement("style");
        style.id = "subtitle-viewer-styles";
        style.textContent = `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .timestamp-highlight { background-color: ${YELLOW}; cursor: pointer; }`;
        document.head.appendChild(style);
    }
}

export function showSubtitleViewer(subtitleId: string | null): void {
    if (!subtitleId) {
        console.error("Invalid subtitle ID:", subtitleId);
        return;
    }

    if (
        subtitleViewerOverlay &&
        subtitleViewerOverlay.style.display === "flex" &&
        subtitleViewerOverlay.dataset.currentSubtitle === subtitleId
    ) {
        console.log("Already showing this subtitle.");
        return;
    }

    createSubtitleViewer();

    const resModal = resultsModal;
    const resOverlay = resultsOverlay;

    const vOverlay = subtitleViewerOverlay;
    const vContent = subtitleViewerModal;
    const loadingEl = loadingIndicator;
    const contentArea = subtitleContentArea;
    const titleEl = viewerTitleElement;

    if (
        !vOverlay ||
        !vContent ||
        !loadingEl ||
        !contentArea ||
        !titleEl ||
        !resModal ||
        !resOverlay
    ) {
        console.error(
            "Required elements (viewer or results) not found or initialized"
        );
        return;
    }

    vOverlay.dataset.currentSubtitle = subtitleId;

    contentArea.style.whiteSpace = "pre-wrap";
    contentArea.style.overflowWrap = "break-word";
    contentArea.style.overflowX = "hidden";
    contentArea.style.fontFamily =
        "'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";
    contentArea.style.fontSize = "16px";

    setActiveModal(ActiveModal.SUBTITLE_VIEWER, {
        subtitleId,
        resultsVisible: true,
    });

    const windowWidth = window.innerWidth;
    const resultsWidth = 500;
    const viewerWidth = 500;
    const gap = 20;
    const totalWidth = resultsWidth + viewerWidth + gap;
    const startPositionX = Math.max(20, (windowWidth - totalWidth) / 2);

    resOverlay.style.pointerEvents = "none";

    vOverlay.style.backgroundColor = "transparent";
    vOverlay.style.width = "100%";
    vOverlay.style.height = "100%";
    vOverlay.style.display = "flex";
    vOverlay.style.pointerEvents = "none";
    vOverlay.style.zIndex = "10000";

    resModal.style.position = "fixed";
    resModal.style.left = `${startPositionX}px`;
    resModal.style.top = "50%";
    resModal.style.transform = "translateY(-50%)";
    resModal.style.margin = "0";
    resModal.style.zIndex = "10001";
    resModal.style.width = `${resultsWidth}px`;
    resModal.style.pointerEvents = "auto";

    vContent.style.position = "fixed";
    vContent.style.left = `${startPositionX + resultsWidth + gap}px`;
    vContent.style.top = "50%";
    vContent.style.transform = "translateY(-50%)";
    vContent.style.margin = "0";
    vContent.style.opacity = "0";
    vContent.style.zIndex = "10002";
    vContent.style.width = `${viewerWidth}px`;
    vContent.style.pointerEvents = "auto";

    setTimeout(() => {
        vContent.style.transition = "opacity 0.3s ease";
        vContent.style.opacity = "1";

        loadingEl.style.display = "flex";
        contentArea.value = "";

        loadSubtitleContent(subtitleId)
            .then((data) => {
                if (data && data.content) {
                    titleEl.textContent =
                        data.title || data.fileName || "Subtitle Content";
                    contentArea.value = data.content;

                    const timestamps = processSubtitleTimestamps(data.content);
                    window.subtitleTimestamps = timestamps;

                    if (syncStatusElement) {
                        syncStatusElement.textContent = `Found ${timestamps.length} timestamps. Click any timestamp to sync with video.`;
                    }
                    if (
                        cacheIndicatorElement &&
                        cacheIndicatorElement.style.backgroundColor !== "green"
                    ) {
                    }
                } else {
                    contentArea.value = `No subtitle content found.\n\n${JSON.stringify(
                        data,
                        null,
                        2
                    )}`;
                }
            })
            .catch((error) => {
                console.error("Error loading subtitle:", error);
                contentArea.value = `Error: ${
                    error.message || "Failed to load subtitle"
                }`;
                if (syncStatusElement) {
                    syncStatusElement.textContent = "Error loading subtitle.";
                }
            })
            .finally(() => {
                loadingEl.style.display = "none";
            });
    }, 10);
}

export function hideSubtitleViewer(): void {
    const resModal = resultsModal;
    const resOverlay = resultsOverlay;
    const vContent = subtitleViewerModal;
    const vOverlay = subtitleViewerOverlay;

    if (!vContent || !vOverlay || !resModal || !resOverlay) return;

    if (vOverlay.dataset.currentSubtitle) {
        delete vOverlay.dataset.currentSubtitle;
    }

    vContent.style.opacity = "0";

    setTimeout(() => {
        vOverlay.style.display = "none";
        vOverlay.style.width = "0";

        resModal.style.position = "fixed";
        resModal.style.left = "";
        resModal.style.top = "";
        resModal.style.transform = "";
        resModal.style.margin = "";
        resModal.style.width = "500px";
        resModal.style.zIndex = "";
        resModal.style.transition = "";
        resModal.style.display = "flex";

        if (subtitleContentArea) subtitleContentArea.value = "";
        if (syncStatusElement) syncStatusElement.textContent = "";

        if (getActiveModal() === ActiveModal.SUBTITLE_VIEWER) {
            setActiveModal(ActiveModal.RESULTS);
        }
    }, 300);
}

async function loadSubtitleContent(subtitleId: string): Promise<any> {
    try {
        const cachedSubtitle = await checkSubtitleInCache(subtitleId);
        if (cachedSubtitle) {
            console.log("Found subtitle in cache:", subtitleId);
            setTimeout(() => updateResultsCacheStatus(subtitleId), 300);
            return cachedSubtitle;
        }

        console.log("Subtitle not in cache, fetching from API:", subtitleId);
        const tokenData = await getToken();
        if (!tokenData) {
            throw new Error("Authentication required");
        }

        const subtitleData = await fetchSubtitleData(tokenData, subtitleId);
        setTimeout(() => updateResultsCacheStatus(subtitleId), 300);
        return subtitleData;
    } catch (error) {
        console.error("Error loading subtitle content:", error);
        throw error;
    }
}

function processSubtitleTimestamps(content: string): TimestampInfo[] {
    if (!content) return [];
    const timestampRegex =
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/g;
    const timestamps: TimestampInfo[] = [];
    let match;

    while ((match = timestampRegex.exec(content)) !== null) {
        const textStartIndex = match.index + match[0].length;
        let nextMatchIndex = content.indexOf("\n\n", textStartIndex);
        if (nextMatchIndex === -1) {
            nextMatchIndex = content.length;
        }
        let textEndIndex = nextMatchIndex;
        const potentialNextNumberMatch = /^\d+\s*$/m.exec(
            content.substring(textStartIndex, textEndIndex)
        );
        if (potentialNextNumberMatch) {
            textEndIndex = textStartIndex + potentialNextNumberMatch.index;
        }

        const subtitleText = content
            .substring(textStartIndex, textEndIndex)
            .trim();

        timestamps.push({
            startTime: timeToSeconds(match[1]),
            endTime: timeToSeconds(match[2]),
            startIndex: match.index,
            endIndex: textEndIndex,
            text: subtitleText,
        });
    }
    return timestamps;
}

function handleTimestampClick(): void {
    if (!subtitleContentArea || !window.subtitleTimestamps?.length) return;

    const clickPosition = getTextareaClickPosition(subtitleContentArea);

    let timestamp = window.subtitleTimestamps.find(
        (t) => clickPosition >= t.startIndex && clickPosition <= t.endIndex
    );

    if (!timestamp) {
        const sortedTimestamps = [...window.subtitleTimestamps].sort((a, b) => {
            const distA = Math.min(
                Math.abs(clickPosition - a.startIndex),
                Math.abs(clickPosition - a.endIndex)
            );
            const distB = Math.min(
                Math.abs(clickPosition - b.startIndex),
                Math.abs(clickPosition - b.endIndex)
            );
            return distA - distB;
        });

        if (sortedTimestamps.length > 0) {
            const closestTimestamp = sortedTimestamps[0];
            const distance = Math.min(
                Math.abs(clickPosition - closestTimestamp.startIndex),
                Math.abs(clickPosition - closestTimestamp.endIndex)
            );

            if (distance < 50) {
                timestamp = closestTimestamp;
            }
        }
    }

    if (!timestamp) return;

    const videoPlayer = document.querySelector("video");
    if (
        !videoPlayer ||
        videoPlayer.getAttribute("src")?.indexOf("error") != -1
    ) {
        if (syncStatusElement) {
            syncStatusElement.textContent = `Video Player not found or not loaded.`;
            syncStatusElement.style.color = RED;
        }
        return;
    }

    const offset = videoPlayer.currentTime - timestamp.startTime;
    window.subtitleSyncOffset = offset;

    loadSettingsFromIndexedDB()
        .then((settings) => {
            const newSettings = { ...settings, syncOffset: offset };
            saveSettingsToIndexedDB(newSettings);

            if (syncStatusElement) {
                syncStatusElement.textContent = `Synced! Offset: ${offset.toFixed(
                    2
                )}s`;
                syncStatusElement.style.color = GREEN;
            }

            const textElement = document.querySelector(
                "[id^='bilibili-subtitles-text-']"
            );
            if (textElement && window.activeCues && videoPlayer) {
                setupSubtitleDisplay(
                    window.activeCues,
                    videoPlayer,
                    textElement
                );
            }
        })
        .catch((error) => console.error("Failed to save sync offset:", error));
}

function getTextareaClickPosition(textarea: HTMLTextAreaElement): number {
    if (typeof textarea.selectionStart === "number") {
        try {
            return textarea.selectionStart;
        } catch (err) {
            console.warn(
                "Error estimating textarea click position, using selectionStart",
                err
            );
            return textarea.selectionStart ?? 0;
        }
    }
    console.warn("Cannot determine textarea click position accurately.");
    return 0;
}

function autoSyncSubtitles(): void {
    if (!subtitleContentArea) {
        if (syncStatusElement)
            syncStatusElement.textContent = "Subtitle content area not found.";
        return;
    }

    const cursorPos = subtitleContentArea.selectionStart;
    if (cursorPos === null || isNaN(cursorPos)) {
        if (syncStatusElement)
            syncStatusElement.textContent = "Cannot determine cursor position.";
        return;
    }

    if (!window.subtitleTimestamps?.length) {
        if (syncStatusElement)
            syncStatusElement.textContent =
                "No timestamps processed for syncing.";
        return;
    }

    let selectedTimestamp = window.subtitleTimestamps.find(
        (ts) => cursorPos >= ts.startIndex && cursorPos <= ts.endIndex
    );

    if (!selectedTimestamp) {
        selectedTimestamp = window.subtitleTimestamps
            .filter((ts) => ts.startTime !== undefined)
            .reduce((prev, curr) =>
                Math.abs(cursorPos - prev.startIndex) <=
                Math.abs(cursorPos - curr.startIndex)
                    ? prev
                    : curr
            );
    }
    if (!selectedTimestamp || selectedTimestamp.startTime === undefined) {
        if (syncStatusElement)
            syncStatusElement.textContent =
                "Could not find a valid timestamp near cursor.";
        return;
    }

    const videoPlayer = document.querySelector("video");
    if (!videoPlayer) {
        if (syncStatusElement)
            syncStatusElement.textContent = "Video player not found.";
        return;
    }

    const currentVideoTime = videoPlayer.currentTime;
    const offset = currentVideoTime - selectedTimestamp.startTime;
    window.subtitleSyncOffset = offset;

    loadSettingsFromIndexedDB()
        .then((settings) => {
            const newSettings = { ...settings, syncOffset: offset };
            saveSettingsToIndexedDB(newSettings);

            if (syncStatusElement) {
                syncStatusElement.textContent = `Synced at cursor! Offset: ${offset.toFixed(
                    2
                )}s`;
                syncStatusElement.style.color = GREEN;
            }

            const textElement = document.querySelector(
                "[id^='bilibili-subtitles-text-']"
            );
            if (textElement && window.activeCues && videoPlayer) {
                setupSubtitleDisplay(
                    window.activeCues,
                    videoPlayer,
                    textElement
                );
            }
        })
        .catch((error) => {
            console.error("Failed to save sync offset:", error);
            if (syncStatusElement) {
                syncStatusElement.textContent = `Error saving sync offset.`;
                syncStatusElement.style.color = RED;
            }
        });
}

function copySubtitleToClipboard(): void {
    if (!subtitleContentArea || !subtitleContentArea.value) {
        if (syncStatusElement)
            syncStatusElement.textContent = "Nothing to copy.";
        return;
    }

    navigator.clipboard
        .writeText(subtitleContentArea.value)
        .then(() => {
            if (syncStatusElement) {
                const originalText = syncStatusElement.textContent || "";
                syncStatusElement.textContent = "Copied to clipboard!";
                syncStatusElement.style.color = GREEN;
                setTimeout(() => {
                    if (syncStatusElement) {
                        syncStatusElement.textContent =
                            originalText.startsWith("Synced") ||
                            originalText.startsWith("Found")
                                ? originalText
                                : "";
                        syncStatusElement.style.color = "";
                    }
                }, 2000);
            }
        })
        .catch((err) => {
            console.error("Failed to copy text: ", err);
            if (syncStatusElement) {
                syncStatusElement.textContent = "Failed to copy!";
                syncStatusElement.style.color = RED;
            }
        });
}

function timeToSeconds(timeString: string): number {
    try {
        const parts = timeString.split(":");
        const secondsAndMillis = parts[2].split(",");
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(secondsAndMillis[0], 10);
        const milliseconds = parseInt(secondsAndMillis[1], 10);

        if (
            isNaN(hours) ||
            isNaN(minutes) ||
            isNaN(seconds) ||
            isNaN(milliseconds)
        ) {
            throw new Error("Invalid time component");
        }

        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    } catch (e) {
        console.error(`Error parsing time string: ${timeString}`, e);
        return 0;
    }
}

function getActiveModal(): ActiveModal {
    return (window as any).currentActiveModal || ActiveModal.NONE;
}
