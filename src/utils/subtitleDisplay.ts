import { getAnimationDuration, getAnimationType, getAnimationEnabled } from "../db/indexedDB";

let cachedAnimationDuration: number | null = null;
let styleElement: HTMLStyleElement | null = null;
let animationFrameId: number | null = null;
let lastCueId: string | null = null;

export async function createSubtitleAnimationStyles(forceUpdate = false): Promise<HTMLStyleElement> {
    if (cachedAnimationDuration === null || forceUpdate) {
        cachedAnimationDuration = await getAnimationDuration();
    }
    
    if (!styleElement) {
        styleElement = document.getElementById("subtitle-animation-styles") as HTMLStyleElement;
        
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = "subtitle-animation-styles";
            document.head.appendChild(styleElement);
        }
    }

    styleElement.textContent = `
        @keyframes subtitleFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes subtitleFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes subtitleSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes subtitleSlideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes subtitleZoomIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        .subtitle-animation-fade {
            animation: subtitleFadeIn ${cachedAnimationDuration}s ease-in-out;
        }
        .subtitle-animation-slideUp {
            animation: subtitleSlideUp ${cachedAnimationDuration}s ease-out;
        }
        .subtitle-animation-slideDown {
            animation: subtitleSlideDown ${cachedAnimationDuration}s ease-out;
        }
        .subtitle-animation-zoom {
            animation: subtitleZoomIn ${cachedAnimationDuration}s ease-out;
        }
    `;
    
    return styleElement;
}

export async function setupSubtitleDisplay(
    subtitleCues: any[], 
    videoPlayer: HTMLVideoElement, 
    subtitleTextElement: Element
): Promise<() => void> {
    stopSubtitleDisplay();
    
    await createSubtitleAnimationStyles();
    
    const animationEnabled = await getAnimationEnabled();
    const animationType = await getAnimationType() || 'fade';
    let currentCue: any = null;
    let isPlaying = !videoPlayer.paused;
    
    const onPlay = () => {
        isPlaying = true;
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(updateSubtitles);
        }
    };
    
    const onPause = () => {
        isPlaying = false;
    };
    
    videoPlayer.addEventListener('play', onPlay);
    videoPlayer.addEventListener('playing', onPlay);
    videoPlayer.addEventListener('pause', onPause);
    videoPlayer.addEventListener('seeking', updateSubtitles);

    function updateSubtitles() {
        const currentTime = videoPlayer.currentTime - (window.subtitleSyncOffset || 0);
        
        const activeCue = subtitleCues.find(
            (cue) => currentTime >= cue.startTime && currentTime < cue.endTime
        );
        
        const activeCueId = activeCue ? `${activeCue.startTime}-${activeCue.endTime}` : null;
        
        if (activeCueId !== lastCueId) {
            // Update state
            lastCueId = activeCueId;
            currentCue = activeCue;
            
            // Apply animation only if enabled
            if (activeCue) {
                subtitleTextElement.innerHTML = activeCue.text;
                
                // Only apply animation class if animations are enabled
                if (animationEnabled) {
                    subtitleTextElement.className = `subtitle-animation-${animationType}`;
                } else {
                    subtitleTextElement.className = ''; // No animation class
                }
            } else {
                subtitleTextElement.innerHTML = '';
                subtitleTextElement.className = '';
            }
        }
        
        if (isPlaying) {
            animationFrameId = requestAnimationFrame(updateSubtitles);
        }
    }
    
    if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateSubtitles);
    } else {
        updateSubtitles();
    }
    
    return function cleanup() {
        stopSubtitleDisplay();
        videoPlayer.removeEventListener('play', onPlay);
        videoPlayer.removeEventListener('playing', onPlay);
        videoPlayer.removeEventListener('pause', onPause);
        videoPlayer.removeEventListener('seeking', updateSubtitles);
    };
}

export function stopSubtitleDisplay(): void {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

export async function updateSubtitleAnimationSettings(): Promise<void> {
    cachedAnimationDuration = null;
    await createSubtitleAnimationStyles(true);
}
