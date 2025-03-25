import {createDiv} from '../ui/components';
import subtitleViewerTemplate from '../templates/SubtitleViewer.html?raw';
import {checkSubtitleInCache, getToken, loadSettingsFromIndexedDB} from '../db/indexedDB';
import {fetchSubtitleData} from '../api/openSubtitles';
import {setupSubtitleDisplay} from '../utils/subtitleDisplay';
import {ActiveModal, setActiveModal} from './ModalManager';

// Store timestamps for syncing
interface TimestampInfo {
    startTime: number;
    endTime: number;
    startIndex: number;
    endIndex: number;
    text: string;
}

/**
 * Create the subtitle viewer modal
 */
export function createSubtitleViewer(): void {
    if (document.getElementById("subtitle-viewer-overlay")) return;
    
    // Create overlay container - transparent to allow interaction with elements underneath
    const viewerOverlay = createDiv(
        "subtitle-viewer-overlay",
        "",
        `
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 100%;
        background-color: transparent;
        z-index: 9999;
        display: none;
        justify-content: center;
        align-items: center;
        pointer-events: none;
        `
    );

    // Create content container with initial position off-screen
    const viewerContent = createDiv(
        "subtitle-viewer-content",
        "",
        `
        background-color: white;
        padding: 0;
        border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        width: 500px;
        max-width: 90%;
        height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        position: absolute;
        pointer-events: auto;
        transition: transform 0.3s ease, opacity 0.3s ease;
        `
    );
    
    // Add the HTML template
    viewerContent.innerHTML = subtitleViewerTemplate;
    
    // Add to the DOM
    viewerOverlay.appendChild(viewerContent);
    document.body.appendChild(viewerOverlay);
    
    // Add event listeners
    document.getElementById("subtitle-viewer-close-btn")?.addEventListener("click", hideSubtitleViewer);
    document.getElementById("subtitle-copy-btn")?.addEventListener("click", copySubtitleToClipboard);
    document.getElementById("subtitle-sync")?.addEventListener("click", autoSyncSubtitles);
    
    // Add click handler for timestamps in textarea
    document.getElementById("subtitle-content")?.addEventListener("click", handleTimestampClick);
    
    // Add animation styles if not already present
    if (!document.getElementById("subtitle-viewer-styles")) {
        const style = document.createElement("style");
        style.id = "subtitle-viewer-styles";
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Style for timestamp highlighting */
            .timestamp-highlight {
                background-color: #ffff99;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Show the subtitle viewer with content for the specified subtitle
 */
export function showSubtitleViewer(resultElement: HTMLElement): void {
    const osViewBtn = resultElement.querySelector('.os-view-btn') as HTMLElement;
    const subtitleId = osViewBtn?.dataset.subtitleId || '';
    if (!subtitleId) {
        console.error("Invalid subtitle ID:", subtitleId);
        return;
    }
    // Check if already showing this subtitle to prevent recursion
    const currentViewer = document.getElementById("subtitle-viewer-overlay");
    if (currentViewer && currentViewer.style.display === "flex" && 
        currentViewer.dataset.currentSubtitle === subtitleId) {
        console.log("Already showing this subtitle, preventing duplicate call");
        return;
    }
    
    createSubtitleViewer(); // Ensure the viewer exists
    
    const resultsModal = document.getElementById("opensubtitles-results-modal");
    const resultsOverlay = document.getElementById("opensubtitles-results-overlay");
    const viewerOverlay = document.getElementById("subtitle-viewer-overlay");
    const viewerContent = document.getElementById("subtitle-viewer-content");
    const loading = document.getElementById("subtitle-loading");
    const content = document.getElementById("subtitle-content") as HTMLTextAreaElement;
    const title = document.getElementById("subtitle-viewer-title");
    
    if (!viewerOverlay || !viewerContent || !loading || !content || !title || !resultsModal || !resultsOverlay) {
        console.error("Required elements not found");
        return;
    }
    
    // Store current subtitle ID to prevent multiple calls
    viewerOverlay.dataset.currentSubtitle = subtitleId;
    
    // Fix the textarea styling to prevent horizontal scrollbar
    content.style.whiteSpace = "pre-wrap";
    content.style.overflowWrap = "break-word";
    content.style.overflowX = "hidden";
    
    // Set the active modal for state tracking - mark both modals as active
    setActiveModal(ActiveModal.SUBTITLE_VIEWER, { subtitleId, resultsVisible: true });
    
    // Calculate window center and position modals side by side
    const windowWidth = window.innerWidth;
    const resultsWidth = 500;
    const viewerWidth = 500;
    const gap = 20;
    const totalWidth = resultsWidth + viewerWidth + gap;
    const startPositionX = Math.max(20, (windowWidth - totalWidth) / 2);
    
    // CRITICAL FIXES:
    
    // 1. Make sure we don't manipulate the results overlay directly - it should stay as is
    resultsOverlay.style.pointerEvents = "none"; // Allow clicks to pass through the overlay
    
    // 2. Set up viewer overlay with pointer-events properly configured
    viewerOverlay.style.backgroundColor = "transparent";
    viewerOverlay.style.width = "100%";
    viewerOverlay.style.height = "100%";
    viewerOverlay.style.display = "flex";
    viewerOverlay.style.pointerEvents = "none"; // Allow clicks to pass through overlay
    viewerOverlay.style.zIndex = "10000";
    
    // 3. Position the results modal and ensure it stays visible
    resultsModal.style.position = "fixed";
    resultsModal.style.left = `${startPositionX}px`;
    resultsModal.style.top = "50%";
    resultsModal.style.transform = "translateY(-50%)";
    resultsModal.style.margin = "0";
    resultsModal.style.zIndex = "10001";
    resultsModal.style.width = `${resultsWidth}px`;
    resultsModal.style.pointerEvents = "auto"; // Ensure results modal captures clicks
    
    // 4. Position the viewer content and ensure it captures clicks
    viewerContent.style.position = "fixed";
    viewerContent.style.left = `${startPositionX + resultsWidth + gap}px`;
    viewerContent.style.top = "50%";
    viewerContent.style.transform = "translateY(-50%)";
    viewerContent.style.margin = "0";
    viewerContent.style.opacity = "0";
    viewerContent.style.zIndex = "10002";
    viewerContent.style.width = `${viewerWidth}px`;
    viewerContent.style.pointerEvents = "auto"; // Ensure content captures clicks
    
    // Load subtitle content with better debugging - using setTimeout to ensure UI updates first
    setTimeout(() => {
        // Animate viewer fading in
        viewerContent.style.transition = "opacity 0.3s ease";
        viewerContent.style.opacity = "1";
        
        // Show loading state
        loading.style.display = "flex";
        content.value = "";
        
        // Load subtitle content
        loadSubtitleContent(subtitleId)
            .then(data => {
                console.log("Subtitle data loaded:", !!data);
                console.log(data);
                if (data && data.content) {
                    // Display the subtitle content
                    title.textContent = data.title || data.fileName || "Subtitle Content";
                    content.value = data.content;
                    
                    // Process the subtitle for timestamp detection
                    const timestamps = processSubtitleTimestamps(data.content);
                    window.subtitleTimestamps = timestamps;
                    
                    // Update the sync status with timestamp count
                    const syncStatus = document.getElementById("subtitle-sync-status");
                    if (syncStatus) {
                        syncStatus.textContent = `Found ${timestamps.length} timestamps. Click any timestamp to sync with video.`;
                    }

                    // Turn the indicator green if not already green
                    const indicator = document.getElementById("subtitle-cache-indicator");
                    if (indicator && indicator.style.backgroundColor !== "green") {
                        indicator.style.backgroundColor = "green";
                    }
                } else {
                    // Detailed error when content isn't available
                    content.value = `No subtitle content found.\n\nData object: ${typeof data}\nHas content: ${!!(data && data.content)}\n\n${JSON.stringify(data, null, 2)}`;
                }
            })
            .catch(error => {
                console.error("Error loading subtitle:", error);
                content.value = `Error: ${error.message || "Failed to load subtitle"}`;
            })
            .finally(() => {
                loading.style.display = "none";
            });
    }, 10);
}

/**
 * Hide the subtitle viewer
 */
export function hideSubtitleViewer(): void {
    const resultsModal = document.getElementById("opensubtitles-results-modal");
    const resultsOverlay = document.getElementById("opensubtitles-results-overlay");
    const viewerContent = document.getElementById("subtitle-viewer-content");
    const viewerOverlay = document.getElementById("subtitle-viewer-overlay");
    
    if (!viewerContent || !viewerOverlay || !resultsModal || !resultsOverlay) return;
    
    // Remove stored subtitle ID
    if (viewerOverlay.dataset.currentSubtitle) {
        delete viewerOverlay.dataset.currentSubtitle;
    }
    
    // Fade out the viewer content
    viewerContent.style.opacity = "0";
    
    // Reset everything after animation completes
    setTimeout(() => {
        viewerOverlay.style.display = "none";
        viewerOverlay.style.width = "0";
        
        // CRITICAL FIX: Properly restore pointer events
        resultsOverlay.style.pointerEvents = "auto";
        resultsModal.style.pointerEvents = "auto";
        
        // Reset all positioning
        resultsModal.style.position = "";
        resultsModal.style.left = "";
        resultsModal.style.top = "";
        resultsModal.style.transform = "";
        resultsModal.style.margin = "";
        resultsModal.style.width = "";
        resultsModal.style.zIndex = "";
        resultsModal.style.transition = "";
        
        // Clear content
        const content = document.getElementById("subtitle-content") as HTMLTextAreaElement;
        if (content) content.value = "";
        
        const syncStatus = document.getElementById("subtitle-sync-status");
        if (syncStatus) syncStatus.textContent = "";
        
        // Restore the active modal state to just the results
        setActiveModal(ActiveModal.RESULTS);
    }, 300); // Match transition duration
}

/**
 * Load subtitle content with caching
 */
async function loadSubtitleContent(subtitleId: string): Promise<any> {
    try {
        // Try to get from cache first
        const cachedSubtitle = await checkSubtitleInCache(subtitleId);
        
        if (cachedSubtitle) {
            console.log("Found subtitle in cache:", subtitleId);
            
            // Even for cached subtitles, update the indicator (might be from another session)
            setTimeout(() => {
                import('./ResultsModal').then(module => {
                    module.updateCacheStatusDisplay(subtitleId);
                });
            }, 300);
            
            return cachedSubtitle;
        }
        
        console.log("Subtitle not in cache, fetching from API:", subtitleId);
        
        // Get current search results from ResultsModal
        const resultsModal = await import('./ResultsModal');
        const results = resultsModal.getCurrentSearchResults();
        console.log("Current search results:", results.length);
        
        // Not in cache, find in search results and download
        // const result = results.find((r: any) => r.id === subtitleId);
        // if (!result) {
        //     throw new Error("Subtitle not found in current results");
        // }
        
        const tokenData = await getToken();
        if (!tokenData) {
            throw new Error("Authentication required");
        }
        
        // Download and cache the subtitle
        const subtitleData = await fetchSubtitleData(tokenData, subtitleId);
        
        // Update cache status with a slight delay to ensure DOM is stable
        setTimeout(() => {
            import('./ResultsModal').then(module => {
                module.updateCacheStatusDisplay(subtitleId);
            });
        }, 300);
        
        return subtitleData;
    } catch (error) {
        console.error("Error loading subtitle content:", error);
        throw error;
    }
}

/**
 * Process subtitle to identify timestamps
 */
function processSubtitleTimestamps(content: string): TimestampInfo[] {
    if (!content) return [];
    
    const timestampRegex = /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g;
    const timestamps: TimestampInfo[] = [];
    let match;
    
    while ((match = timestampRegex.exec(content)) !== null) {
        timestamps.push({
            startTime: timeToSeconds(match[1]),
            endTime: timeToSeconds(match[2]),
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            text: match[0]
        });
    }
    
    return timestamps;
}

/**
 * Handle click on timestamp in subtitle content
 */
function handleTimestampClick(e: MouseEvent): void {
    const textarea = e.target as HTMLTextAreaElement;
    if (!textarea || !window.subtitleTimestamps?.length) return;
    
    // Get click position in textarea content
    const clickPosition = getTextareaClickPosition(textarea, e);
    
    // Find timestamp at this position
    const timestamp = window.subtitleTimestamps.find(t => 
        clickPosition >= t.startIndex && clickPosition <= t.endIndex);
    
    if (!timestamp) return;
    
    // Get current video time
    const videoPlayer = document.querySelector('video');
    if (!videoPlayer) return;
    
    // Calculate the offset between video time and subtitle time
    const offset = videoPlayer.currentTime - timestamp.startTime;
    
    // Update global sync offset
    window.subtitleSyncOffset = offset;
    
    // Update settings
    loadSettingsFromIndexedDB().then(settings => {
        settings.syncOffset = offset;
        // saveSettingsToIndexedDB(settings);
        
        // Update sync status
        const syncStatus = document.getElementById("subtitle-sync-status");
        if (syncStatus) {
            syncStatus.textContent = `Synced! Offset: ${offset.toFixed(2)}s`;
        }
        
        // Apply the new offset to current subtitles if they're visible
        const textElement = document.querySelector("[id^='bilibili-subtitles-text-']");
        if (textElement && window.activeCues) {
            setupSubtitleDisplay(window.activeCues, videoPlayer, textElement);
        }
    });
}

/**
 * Helper function to get click position in textarea
 */
function getTextareaClickPosition(textarea: HTMLTextAreaElement, e: MouseEvent): number {
    const style = window.getComputedStyle(textarea);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = fontSize * 1.2; // Approximate line height
    
    // Get coordinates relative to textarea
    const rect = textarea.getBoundingClientRect();
    const x = e.clientX - rect.left + textarea.scrollLeft;
    const y = e.clientY - rect.top + textarea.scrollTop;
    
    // Calculate line and character position
    const lineIndex = Math.floor(y / lineHeight);
    const charIndex = Math.floor(x / (fontSize * 0.6)); // Approximate character width
    
    // Convert to absolute position in text
    const lines = textarea.value.split('\n');
    let position = 0;
    
    // Add up all characters in previous lines
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
        position += lines[i].length + 1; // +1 for the newline
    }
    
    // Add characters in current line
    if (lineIndex < lines.length) {
        position += Math.min(charIndex, lines[lineIndex].length);
    }
    
    return position;
}

/**
 * Auto sync with current video position
 */
function autoSyncSubtitles(): void {
    const textarea = document.getElementById("subtitle-content") as HTMLTextAreaElement;
    if (!textarea) {
        const syncStatus = document.getElementById("subtitle-sync-status");
        if (syncStatus) {
            syncStatus.textContent = "No subtitle content element found.";
        }
        return;
    }
    
    // Get the current cursor position in the textarea
    const cursorPos = textarea.selectionStart;
    if (cursorPos === null || isNaN(cursorPos)) {
        const syncStatus = document.getElementById("subtitle-sync-status");
        if (syncStatus) {
            syncStatus.textContent = "Unable to determine cursor position.";
        }
        return;
    }
    
    if (!window.subtitleTimestamps?.length) {
        const syncStatus = document.getElementById("subtitle-sync-status");
        if (syncStatus) {
            syncStatus.textContent = "No timestamps found for syncing.";
        }
        return;
    }
    
    // Try to find a timestamp that covers the cursor position
    let selectedTimestamp = window.subtitleTimestamps.find(ts => cursorPos >= ts.startIndex && cursorPos <= ts.endIndex);
    
    // If not found, find the closest timestamp based on startIndex
    if (!selectedTimestamp) {
        selectedTimestamp = window.subtitleTimestamps.reduce((prev, curr) => {
            return (Math.abs(cursorPos - prev.startIndex) <= Math.abs(cursorPos - curr.startIndex)) ? prev : curr;
        });
    }
    
    const videoPlayer = document.querySelector('video');
    if (!videoPlayer) {
        const syncStatus = document.getElementById("subtitle-sync-status");
        if (syncStatus) {
            syncStatus.textContent = "Error: Video player not found!";
        }
        return;
    }
    
    const currentVideoTime = videoPlayer.currentTime;
    
    // Calculate the offset from the timestamp time to the current video time
    const offset = currentVideoTime - selectedTimestamp.startTime;
    window.subtitleSyncOffset = offset;
    
    loadSettingsFromIndexedDB().then(settings => {
        settings.syncOffset = offset;
        // saveSettingsToIndexedDB(settings);
        
        // Update UI
        const syncStatus = document.getElementById("subtitle-sync-status");
        if (syncStatus) {
            syncStatus.textContent = `Cursor sync applied! Offset: ${offset.toFixed(2)}s`;
        }
        
        // Refresh subtitle display
        const textElement = document.querySelector("[id^='bilibili-subtitles-text-']");
        if (textElement && window.activeCues) {
            setupSubtitleDisplay(window.activeCues, videoPlayer, textElement);
        }
    });
}

/**
 * Copy subtitle content to clipboard
 */
function copySubtitleToClipboard(): void {
    const textarea = document.getElementById("subtitle-content") as HTMLTextAreaElement;
    if (!textarea || !textarea.textContent) return;
    navigator.clipboard.writeText(textarea.textContent);
    // Show feedback
    const statusElement = document.getElementById("subtitle-sync-status");
    if (statusElement) {
        const originalText = statusElement.textContent || "";
        statusElement.textContent = "Copied to clipboard!";
        
        // Reset after a delay
        setTimeout(() => {
            statusElement.textContent = originalText;
        }, 2000);
    }
}

/**
 * Convert timestamp string to seconds
 */
function timeToSeconds(timeString: string): number {
    const [hours, minutes, secondsMillis] = timeString.split(':');
    const [seconds, milliseconds] = secondsMillis.split(',');
    
    return (
        parseInt(hours) * 3600 +
        parseInt(minutes) * 60 +
        parseInt(seconds) +
        parseInt(milliseconds) / 1000
    );
}