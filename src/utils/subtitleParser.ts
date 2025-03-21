import { setupSubtitleDisplay } from './subtitleDisplay';

/**
 * Parse and display subtitles (WebVTT or SRT)
 */
export async function parseSubtitleContent(
    subtitleContent: string,
    videoPlayer: HTMLVideoElement,
    subtitleTextElement: Element
): Promise<boolean> {
    try {
        // Add animation style if not already present
        if (!document.getElementById("subtitle-animation-style")) {
            const style = document.createElement("style");
            style.id = "subtitle-animation-style";
            style.textContent = `@keyframes subtitleFadeIn { from { opacity: 0; } to { opacity: 1; } } .subtitle-fade-in { animation: subtitleFadeIn 0.3s ease-in-out; }`;
            document.head.appendChild(style);
        }

        // Determine if WebVTT or SRT
        const isWebVTT = subtitleContent.trim().startsWith("WEBVTT");
        
        // Parse the subtitle content
        const subtitleCues = isWebVTT 
            ? await parseWebVTTCues(subtitleContent, videoPlayer)
            : parseSRTCues(subtitleContent);
        
        if (subtitleCues && subtitleCues.length > 0) {
            // Store cues globally for access in event handlers
            window.activeCues = subtitleCues;
            
            // Setup subtitle display
            setupSubtitleDisplay(subtitleCues, videoPlayer, subtitleTextElement);
            return true;
        } else {
            console.error("No valid cues found in subtitle content");
            return false;
        }
    } catch (error) {
        console.error("Error parsing subtitle content:", error);
        return false;
    }
}

/**
 * Parse WebVTT subtitle content
 */
export async function parseWebVTTCues(
    subtitleContent: string, 
    videoPlayer: HTMLVideoElement
): Promise<any[]> {
    const blob = new Blob([subtitleContent], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    const track = createTrackElement(url);
    videoPlayer.appendChild(track);

    track.track.mode = "hidden"; // Load cues but don't display

    return new Promise((resolve) => {
        // Wait for cues to load
        setTimeout(() => {
            const cues = Array.from(track.track.cues || []);
            resolve(cues);
        }, 100);
    });
}

/**
 * Create track element for WebVTT subtitles
 */
function createTrackElement(url: string): HTMLTrackElement {
    const track = document.createElement("track");
    track.src = url;
    track.kind = "subtitles";
    track.label = "OpenSubtitles";
    track.default = true;
    track.style.display = "none"; // Hide track element
    return track;
}

/**
 * Parse SRT subtitle content
 */
export function parseSRTCues(subtitleContent: string): any[] {
    const cues: any[] = [];
    
    // Regular expression to match SRT entries
    const regex = /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+\r?\n|$)/g;
    
    let match;
    while ((match = regex.exec(subtitleContent)) !== null) {
        const startTime = timeStringToSeconds(match[2]);
        const endTime = timeStringToSeconds(match[3]);
        const text = match[4].trim().replace(/\r?\n/g, '<br>');
        
        cues.push({
            startTime,
            endTime,
            text
        });
    }
    
    return cues;
}

/**
 * Convert SRT time string to seconds
 */
function timeStringToSeconds(timeString: string): number {
    const [time, ms] = timeString.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
}