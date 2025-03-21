/**
 * Setup subtitle display update loop
 */
export function setupSubtitleDisplay(
    subtitleCues: any[], 
    videoPlayer: HTMLVideoElement, 
    subtitleTextElement: Element
): void {
    let currentCue: any = null;

    // Ensure updateSubtitles is not already running before starting a new loop
    if (window.subtitleUpdateAnimationFrame) {
        cancelAnimationFrame(window.subtitleUpdateAnimationFrame);
        window.subtitleUpdateAnimationFrame = null;
    }

    // Create animation styles if they don't exist
    if (!document.getElementById("subtitle-animation-styles")) {
        const style = document.createElement("style");
        style.id = "subtitle-animation-styles";
        const animationDuration = 0.3; // Default animation duration
        
        style.textContent = `
            @keyframes subtitleFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes subtitleFadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes subtitleSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes subtitleSlideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes subtitleZoomIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            
            .subtitle-animation-fade {
                animation: subtitleFadeIn ${animationDuration}s ease-in-out;
            }
            .subtitle-animation-slideUp {
                animation: subtitleSlideUp ${animationDuration}s ease-out;
            }
            .subtitle-animation-slideDown {
                animation: subtitleSlideDown ${animationDuration}s ease-out;
            }
            .subtitle-animation-zoom {
                animation: subtitleZoomIn ${animationDuration}s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    function updateSubtitles() {
        const currentTime = videoPlayer.currentTime - (window.subtitleSyncOffset || 0);
        const activeCue = subtitleCues.find(
            (cue) => currentTime >= cue.startTime && currentTime < cue.endTime
        );

        if (activeCue !== currentCue) {
            // Remove any existing animation classes
            subtitleTextElement.classList.remove(
                "subtitle-animation-fade",
                "subtitle-animation-slideUp",
                "subtitle-animation-slideDown",
                "subtitle-animation-zoom"
            );
            
            // Apply new subtitle
            currentCue = activeCue;
            if (activeCue) {
                subtitleTextElement.innerHTML = activeCue.text;
                
                // Apply animation
                subtitleTextElement.classList.add("subtitle-animation-fade");
            } else {
                subtitleTextElement.innerHTML = "";
            }
        }

        // Store reference to animation frame for proper cancellation
        window.subtitleUpdateAnimationFrame = requestAnimationFrame(updateSubtitles);
    }

    // Start the update loop
    updateSubtitles();
}

/**
 * Process subtitle to identify timestamps for syncing
 */
export function processSubtitleTimestamps(content: string): string[] {
    const timestamps: string[] = [];
    const timestampRegex = /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g;
    let match;
    
    while ((match = timestampRegex.exec(content)) !== null) {
        timestamps.push(match[1], match[2]);
    }
    
    return timestamps;
}

/**
 * Sync video to a timestamp
 */
export function syncVideoToTimestamp(videoPlayer: HTMLVideoElement, timestamp: string): void {
    if (!videoPlayer || !timestamp) return;
    
    // Convert SRT timestamp to seconds
    const time = timeStringToSeconds(timestamp);
    
    // Set video time
    try {
        videoPlayer.currentTime = time;
    } catch (e) {
        console.error("Error syncing video to timestamp:", e);
    }
}

/**
 * Convert time string to seconds
 */
function timeStringToSeconds(timeString: string): number {
    const [time, ms] = timeString.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
}