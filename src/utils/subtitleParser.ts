import {
    setupSubtitleDisplay,
    createSubtitleAnimationStyles,
    stopSubtitleDisplay,
} from "./subtitleDisplay";

export interface SubtitleCue {
    startTime: number;
    endTime: number;
    text: string;
}

export async function parseSubtitleContent(
    subtitleContent: string,
    videoPlayer: HTMLVideoElement,
    subtitleTextElement: Element
): Promise<boolean> {
    try {
        await createSubtitleAnimationStyles();
        const trimmedContent = subtitleContent.trim();
        const isWebVTT = trimmedContent.startsWith("WEBVTT");
        let subtitleCues: SubtitleCue[];
        if (isWebVTT)
            subtitleCues = await parseWebVTTCues(subtitleContent, videoPlayer);
        else subtitleCues = parseSRTCues(subtitleContent);

        if (!subtitleCues || subtitleCues.length === 0) {
            console.error("No valid cues found in subtitle content");
            return false;
        }

        window.activeCues = subtitleCues;

        stopSubtitleDisplay();
        await setupSubtitleDisplay(
            subtitleCues,
            videoPlayer,
            subtitleTextElement
        );

        return true;
    } catch (error) {
        console.error("Error parsing subtitle content:", error);
        return false;
    }
}

export async function parseWebVTTCues(
    subtitleContent: string,
    videoPlayer: HTMLVideoElement
): Promise<SubtitleCue[]> {
    const blob = new Blob([subtitleContent], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);

    try {
        const track = document.createElement("track");
        track.src = url;
        track.kind = "subtitles";
        track.label = "OpenSubtitles";
        track.default = true;

        videoPlayer.appendChild(track);
        track.track.mode = "hidden";

        const cues = await waitForCuesToLoad(track.track);

        return cues.map((cue) => {
            const vttCue = cue as VTTCue;
            return {
                startTime: cue.startTime,
                endTime: cue.endTime,
                text: vttCue.text || "",
            };
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

function waitForCuesToLoad(track: TextTrack): Promise<TextTrackCue[]> {
    return new Promise((resolve, reject) => {
        if (track.cues && track.cues.length > 0) {
            resolve(Array.from(track.cues));
            return;
        }

        const handleLoad = () => {
            track.removeEventListener("load", handleLoad);
            clearTimeout(timeoutId);
            resolve(Array.from(track.cues || []));
        };

        const handleError = () => {
            track.removeEventListener("error", handleError);
            clearTimeout(timeoutId);
            reject(new Error("Failed to load WebVTT track"));
        };

        track.addEventListener("load", handleLoad);
        track.addEventListener("error", handleError);

        const timeoutId = setTimeout(() => {
            track.removeEventListener("load", handleLoad);
            track.removeEventListener("error", handleError);

            if (track.cues && track.cues.length > 0) {
                resolve(Array.from(track.cues));
            } else {
                reject(new Error("Timed out waiting for WebVTT cues to load"));
            }
        }, 500);
    });
}

export function parseSRTCues(subtitleContent: string): SubtitleCue[] {
    const regex =
        /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+\r?\n|$)/g;

    const cues: SubtitleCue[] = [];
    let match;

    while ((match = regex.exec(subtitleContent)) !== null) {
        const startTime = timeStringToSeconds(match[2]);
        const endTime = timeStringToSeconds(match[3]);

        const text = match[4]
            .trim()
            .replace(/\r?\n/g, "<br>")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/&lt;br&gt;/g, "<br>");

        cues.push({ startTime, endTime, text });
    }

    return cues.sort((a, b) => a.startTime - b.startTime);
}

const timeCache: Record<string, number> = {};

function timeStringToSeconds(timeString: string): number {
    if (timeCache[timeString] !== undefined) {
        return timeCache[timeString];
    }

    const [time, ms] = timeString.split(",");
    const [hours, minutes, seconds] = time.split(":").map(Number);

    const result = hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;

    timeCache[timeString] = result;

    return result;
}

export function cleanupParser(): void {
    if (Object.keys(timeCache).length > 1000) {
        Object.keys(timeCache).length = 0;
    }
}
