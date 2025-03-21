import { createDiv } from '../ui/components';
import { 
    parseSubtitleContent, 
    parseSRTCues,
    parseWebVTTCues 
} from './subtitleParser';
import { setupSubtitleDisplay } from './subtitleDisplay';
import { loadSettingsFromIndexedDB } from '../db/indexedDB';

/**
 * Create a subtitle overlay container to display subtitles on video
 */
export function createSubtitleOverlay(settings: any, uniqueId: number): HTMLElement {
    const overlayContainer = createDiv(
        `bilibili-subtitles-overlay-${uniqueId}`,
        "",
        `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
        `
    );
    
    overlayContainer.classList.add("bilibili-subtitles-overlay");

    const subtitleElement = createDiv(
        `bilibili-subtitles-draggable-${uniqueId}`,
        "",
        `
        position: absolute;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        ${
            settings.bgEnabled
                ? `background-color: rgba(${hexToRgb(settings.bgColor || "#000000").join(", ")}, ${settings.bgOpacity}); padding: 5px 10px;`
                : "padding: 0; background-color: transparent;"
        }
        color: ${settings.fontColor};
        border-radius: 4px;
        text-align: center;
        max-width: 90%;
        width: auto;
        display: inline-block;
        pointer-events: auto;
        cursor: move;
        user-select: text;
        `
    );

    const subtitleTextElement = createDiv(
        `bilibili-subtitles-text-${uniqueId}`,
        "",
        `
        font-family: Arial, sans-serif;
        font-size: ${Math.max(1, settings.fontSize)}px;
        line-height: 1.2;
        color: ${settings.fontColor};
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        display: inline;
        ${
            settings.outlineEnabled
                ? `text-shadow: -1px -1px 0 ${settings.outlineColor}, 1px -1px 0 ${settings.outlineColor}, -1px 1px 0 ${settings.outlineColor}, 1px 1px 0 ${settings.outlineColor};`
                : ""
        }
        `
    );

    subtitleElement.appendChild(subtitleTextElement);
    overlayContainer.appendChild(subtitleElement);
    return overlayContainer;
}

/**
 * Convert hex color to RGB array
 */
export function hexToRgb(hex: string): number[] {
    const cleanHex = hex.charAt(0) === "#" ? hex.substring(1, 7) : hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
}

/**
 * Setup drag functionality for subtitle element
 */
export function setupSubtitleDrag(subtitleElement: Element): void {
    let isDragging = false;
    let initialMouseX: number, initialMouseY: number;
    let initialElementX: number, initialElementY: number;
    let elementWidth: number, elementHeight: number;
    
    // Remove all transition effects
    subtitleElement.setAttribute("style", subtitleElement.getAttribute("style") + "transition: none;");
    
    // Prevent clicks from reaching the video
    subtitleElement.addEventListener("click", (e) => {
        e.stopPropagation();
    });
    
    subtitleElement.addEventListener("mousedown", (e: Event) => {
        const mouseEvent = e as MouseEvent;
        // Only handle left mouse button
        if (mouseEvent.button !== 0) return;
        
        mouseEvent.stopPropagation();
        
        // Get the video container dimensions
        const videoContainer = document.querySelector(".bpx-player-video-wrap");
        if (!videoContainer) return;
        
        const videoRect = videoContainer.getBoundingClientRect();
        
        // Get the initial mouse position
        initialMouseX = mouseEvent.clientX;
        initialMouseY = mouseEvent.clientY;
        
        // Get the element dimensions
        const elementRect = subtitleElement.getBoundingClientRect();
        elementWidth = elementRect.width;
        elementHeight = elementRect.height;
        
        // Calculate the current position relative to the video
        initialElementX = elementRect.left - videoRect.left;
        initialElementY = elementRect.top - videoRect.top;
        
        isDragging = true;
        
        // Ensure no transition during dragging
        subtitleElement.setAttribute("style", subtitleElement.getAttribute("style") + "transition: none;");
        
        // Pause subtitle updates during dragging to prevent flickering
        if (window.subtitleUpdateAnimationFrame) {
            cancelAnimationFrame(window.subtitleUpdateAnimationFrame);
            window.subtitleUpdateAnimationFrame = null;
        }
        
        // Change cursor style
        document.body.style.cursor = "grabbing";
    });
    
    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        
        // Get the current mouse position
        const currentMouseX = e.clientX;
        const currentMouseY = e.clientY;
        
        // Calculate how much the mouse has moved
        const deltaX = currentMouseX - initialMouseX;
        const deltaY = currentMouseY - initialMouseY;
        
        // Calculate the new position
        let newX = initialElementX + deltaX;
        let newY = initialElementY + deltaY;
        
        // Get video boundaries for constraint checking
        const videoPlayer = document.querySelector('video');
        if (videoPlayer) {
            const videoRect = videoPlayer.getBoundingClientRect();
            
            // Get subtitle text element to adjust width if needed
            const subtitleTextElement = subtitleElement.querySelector('[id^="bilibili-subtitles-text-"]');
            
            // Calculate center position and snap zone
            const centerX = videoRect.width / 2 - elementWidth / 2;
            const snapThreshold = 20; // Pixels from center to trigger snap
            
            // Check if the element is close to the center
            const distanceFromCenter = Math.abs(newX - centerX);
            
            if (distanceFromCenter < snapThreshold) {
                // Snap to center
                newX = centerX;
                // Visual indicator that we're snapped to center
                if (subtitleTextElement) {
                    subtitleTextElement.setAttribute("style", subtitleTextElement.getAttribute("style") + "text-align: center;");
                }
            }
            
            // Apply boundary constraints
            // Left boundary
            if (newX < 0) {
                newX = 0;
                
                // Adjust subtitle text width when touching left edge
                if (subtitleTextElement) {
                    subtitleTextElement.setAttribute("style", subtitleTextElement.getAttribute("style") + 
                        `max-width: ${videoRect.width * 0.8}px; white-space: normal; text-align: left;`);
                }
            } 
            // Right boundary
            else if (newX + elementWidth > videoRect.width) {
                newX = videoRect.width - elementWidth;
                
                // Adjust subtitle text width when touching right edge
                if (subtitleTextElement) {
                    subtitleTextElement.setAttribute("style", subtitleTextElement.getAttribute("style") + 
                        `max-width: ${videoRect.width * 0.8}px; white-space: normal; text-align: right;`);
                }
            }
            // Center positioning when not at edges and not snapped to center
            else if (subtitleTextElement && distanceFromCenter >= snapThreshold) {
                subtitleTextElement.setAttribute("style", subtitleTextElement.getAttribute("style") + 
                    "max-width: ; white-space: normal; text-align: center;");
            }
            
            // Top boundary
            if (newY < 0) newY = 0;
            // Bottom boundary
            if (newY + elementHeight > videoRect.height) newY = videoRect.height - elementHeight;
        }
        
        // Update the element position
        (subtitleElement as HTMLElement).style.transform = 'none';
        (subtitleElement as HTMLElement).style.left = newX + 'px';
        (subtitleElement as HTMLElement).style.top = newY + 'px';
        (subtitleElement as HTMLElement).style.bottom = 'auto';
    });
    
    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        
        isDragging = false;
        
        // Resume subtitle updates
        const videoPlayer = document.querySelector('video');
        if (videoPlayer) {
            const subtitleTextElement = subtitleElement.querySelector('[id^="bilibili-subtitles-text-"]');
            if (subtitleTextElement && window.activeCues) {
                setupSubtitleDisplay(window.activeCues, videoPlayer, subtitleTextElement);
            }
        }
        
        document.body.style.cursor = "";
    });
    
    // Handle if mouse leaves window
    document.addEventListener("mouseleave", () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "";
            
            // Resume subtitle updates
            const videoPlayer = document.querySelector('video');
            if (videoPlayer) {
                const subtitleTextElement = subtitleElement.querySelector('[id^="bilibili-subtitles-text-"]');
                if (subtitleTextElement && window.activeCues) {
                    setupSubtitleDisplay(window.activeCues, videoPlayer, subtitleTextElement);
                }
            }
        }
    });
}

/**
 * Clear existing subtitles from the video player
 */
export function clearExistingSubtitles(videoPlayer: HTMLVideoElement): void {
    // Cancel any existing animation frames
    if (window.subtitleUpdateAnimationFrame) {
        cancelAnimationFrame(window.subtitleUpdateAnimationFrame);
        window.subtitleUpdateAnimationFrame = null;
    }
    
    // Remove track elements
    if (videoPlayer) {
        Array.from(videoPlayer.querySelectorAll("track")).forEach(track => track.remove());
    }
    
    // Remove subtitle overlays
    document.querySelectorAll(".bilibili-subtitles-overlay").forEach(el => el.remove());
    
    // Also look for elements by ID pattern
    document.querySelectorAll("[id^='bilibili-subtitles-']").forEach(el => el.remove());
    
    // Reset global variables
    window.activeCues = null;
}

/**
 * Main function to apply subtitle to the video player
 */
export async function applySubtitleToVideo(subtitleContent: string): Promise<boolean> {
    try {
        const videoPlayer = document.querySelector('video');
        if (!videoPlayer) {
            console.error("BiliBili video player not found");
            return false;
        }
        
        const videoContainer = videoPlayer.closest(".bpx-player-video-wrap");
        if (!videoContainer) {
            console.error("BiliBili video container not found");
            return false;
        }
        
        // Load settings and create overlay
        const settings = await loadSettingsFromIndexedDB();
        const uniqueId = Date.now();
        const overlayContainer = createSubtitleOverlay(settings, uniqueId);
        const subtitleElement = overlayContainer.querySelector(`#bilibili-subtitles-draggable-${uniqueId}`);
        const subtitleTextElement = subtitleElement?.querySelector(`#bilibili-subtitles-text-${uniqueId}`);
        
        if (!subtitleElement || !subtitleTextElement) {
            console.error("Failed to create subtitle elements");
            return false;
        }
        
        videoContainer.appendChild(overlayContainer);
        setupSubtitleDrag(subtitleElement);
        
        window.subtitleSyncOffset = settings.syncOffset || 0;
        
        // Parse and display subtitles
        return await parseSubtitleContent(subtitleContent, videoPlayer as HTMLVideoElement, subtitleTextElement);
    } catch (error) {
        console.error("Error applying subtitle to video:", error);
        return false;
    }
}

// Define global types
declare global {
    interface Window {
        subtitleApplicationInProgress: boolean;
        subtitleUpdateAnimationFrame: number | null;
        activeCues: any[] | null;
        subtitleSyncOffset: number;
        subtitleTimestamps: string[];
    }
}