import { createDiv } from "../ui/components";
import { parseSubtitleContent } from "./subtitleParser";
import { setupSubtitleDisplay } from "./subtitleDisplay";
import { loadSettingsFromIndexedDB } from "../db/indexedDB";
import { BLACK } from "../utils/constants";

declare global {
    interface Window {
        subtitleApplicationInProgress: boolean;
        subtitleUpdateAnimationFrame: number | null;
        activeCues: any[] | undefined;
        subtitleSyncOffset: number;
        subtitleTimestamps: {
            startTime: number;
            endTime: number;
            startIndex: number;
            endIndex: number;
            text: string;
        }[];
        subtitleResizeObserver: ResizeObserver | null;
    }
}

export let subtitleElement: HTMLDivElement | null = null;
export let subtitleTextElement: HTMLDivElement | null = null;

export function createSubtitleOverlay(settings: any): HTMLDivElement {
    const overlayContainer = createDiv(
        `bilibili-subtitles-overlay`,
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

    const subtitleDiv = createDiv(
        `bilibili-subtitles-draggable`,
        "",
        `
        position: absolute;
        bottom: 10%; /* percentage-based positioning */
        left: 50%; /* center horizontally */
        transform: translateX(-50%);
        ${
            settings.bgEnabled
                ? `background-color: rgba(${hexToRgb(
                      settings.bgColor || BLACK
                  ).join(", ")}, ${settings.bgOpacity}); padding: 5px 10px;`
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
        user-select: none;
        `
    );
    const subtitleText = createDiv(
        `bilibili-subtitles-text`,
        "",
        `
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
    subtitleDiv.appendChild(subtitleText);
    overlayContainer.appendChild(subtitleDiv);

    subtitleElement = subtitleDiv;
    subtitleTextElement = subtitleText;

    return overlayContainer;
}

function getVideoPlayer(): HTMLVideoElement | null {
    return document.querySelector("video") as HTMLVideoElement;
}

function getVideoContainer(): Element | null {
    const videoPlayer = document.querySelector("video");
    if (!videoPlayer) return null;
    return videoPlayer ? videoPlayer.closest(".bpx-player-video-wrap") : null;
}

function getSubtitleTextElement(parentElement: Element): Element | null {
    return parentElement.querySelector('[id^="bilibili-subtitles-text-"]');
}

function clearElementCache(): void {
    subtitleElement = null;
    subtitleTextElement = null;
}

export function hexToRgb(hex: string): number[] {
    const cleanHex = hex.charAt(0) === "#" ? hex.substring(1, 7) : hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
}

function handleResize() {
    const subtitleElement = document.querySelector(
        "#bilibili-subtitles-draggable"
    );
    if (!subtitleElement) return;

    const xPercent = subtitleElement.getAttribute("data-x-percent");
    const yPercent = subtitleElement.getAttribute("data-y-percent");
    const isCentered = subtitleElement.getAttribute("data-centered") === "true";

    if (xPercent && yPercent) {
        if (isCentered) {
            (subtitleElement as HTMLElement).style.left = "50%";
            (subtitleElement as HTMLElement).style.transform =
                "translateX(-50%)";
            (subtitleElement as HTMLElement).style.top = `${yPercent}%`;
            (subtitleElement as HTMLElement).style.bottom = "auto";
        } else {
            (subtitleElement as HTMLElement).style.transform = "none";
            (subtitleElement as HTMLElement).style.left = `${xPercent}%`;
            (subtitleElement as HTMLElement).style.top = `${yPercent}%`;
            (subtitleElement as HTMLElement).style.bottom = "auto";
        }
    } else {
        (subtitleElement as HTMLElement).style.left = "50%";
        (subtitleElement as HTMLElement).style.transform = "translateX(-50%)";
        (subtitleElement as HTMLElement).style.bottom = "10%";
        (subtitleElement as HTMLElement).style.top = "auto";
        subtitleElement.setAttribute("data-centered", "true");
    }
}

export function setupSubtitleResizeHandler(): void {
    const resizeObserver = new ResizeObserver(() => {
        handleResize();
    });

    const videoContainer = getVideoContainer();
    if (videoContainer) {
        resizeObserver.observe(videoContainer);
    }

    window.addEventListener("resize", handleResize);

    window.subtitleResizeObserver = resizeObserver;
}

export function setupSubtitleDrag(subtitleElement: Element): void {
    let isDragging = false;
    let initialMouseX: number, initialMouseY: number;
    let initialElementX: number, initialElementY: number;
    let elementWidth: number, elementHeight: number;
    let isCentered = true;

    subtitleElement.setAttribute(
        "style",
        subtitleElement.getAttribute("style") + "transition: none;"
    );
    subtitleElement.setAttribute("data-centered", "true");

    subtitleElement.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    subtitleElement.addEventListener("mousedown", (e: Event) => {
        const mouseEvent = e as MouseEvent;
        if (mouseEvent.button !== 0) return;

        mouseEvent.stopPropagation();

        const videoContainer = getVideoContainer();
        if (!videoContainer) {
            console.error("Video container not found");
            return;
        }

        const videoRect = videoContainer.getBoundingClientRect();

        initialMouseX = mouseEvent.clientX;
        initialMouseY = mouseEvent.clientY;

        const elementRect = subtitleElement.getBoundingClientRect();
        elementWidth = elementRect.width;
        elementHeight = elementRect.height;

        initialElementX = elementRect.left - videoRect.left;
        initialElementY = elementRect.top - videoRect.top;

        isDragging = true;

        subtitleElement.setAttribute(
            "style",
            subtitleElement.getAttribute("style") + "transition: none;"
        );

        if (window.subtitleUpdateAnimationFrame) {
            cancelAnimationFrame(window.subtitleUpdateAnimationFrame);
            window.subtitleUpdateAnimationFrame = null;
        }

        document.body.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const currentMouseX = e.clientX;
        const currentMouseY = e.clientY;

        const deltaX = currentMouseX - initialMouseX;
        const deltaY = currentMouseY - initialMouseY;

        let newX = initialElementX + deltaX;
        let newY = initialElementY + deltaY;

        const videoPlayer = getVideoPlayer();
        if (videoPlayer) {
            const videoRect = videoPlayer.getBoundingClientRect();
            const subtitleTextElement = getSubtitleTextElement(subtitleElement);

            const centerX = videoRect.width / 2 - elementWidth / 2;
            const snapThreshold = 20;

            const distanceFromCenter = Math.abs(newX - centerX);

            if (distanceFromCenter < snapThreshold) {
                newX = centerX;
                isCentered = true;
                subtitleElement.setAttribute("data-centered", "true");

                if (subtitleTextElement) {
                    subtitleTextElement.setAttribute(
                        "style",
                        subtitleTextElement.getAttribute("style") +
                            "text-align: center;"
                    );
                }
            } else {
                isCentered = false;
                subtitleElement.setAttribute("data-centered", "false");
            }

            if (newX < 0) newX = 0;
            if (newX + elementWidth > videoRect.width)
                newX = videoRect.width - elementWidth;
            if (newY < 0) newY = 0;
            if (newY + elementHeight > videoRect.height)
                newY = videoRect.height - elementHeight;

            const xPercent = (newX / videoRect.width) * 100;
            const yPercent = (newY / videoRect.height) * 100;

            subtitleElement.setAttribute("data-x-percent", xPercent.toString());
            subtitleElement.setAttribute("data-y-percent", yPercent.toString());

            if (isCentered) {
                (subtitleElement as HTMLElement).style.left = "50%";
                (subtitleElement as HTMLElement).style.transform =
                    "translateX(-50%)";
                (subtitleElement as HTMLElement).style.top = `${yPercent}%`;
                (subtitleElement as HTMLElement).style.bottom = "auto";
            } else {
                (subtitleElement as HTMLElement).style.transform = "none";
                (subtitleElement as HTMLElement).style.left = `${xPercent}%`;
                (subtitleElement as HTMLElement).style.top = `${yPercent}%`;
                (subtitleElement as HTMLElement).style.bottom = "auto";
            }
        }
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;

        isDragging = false;

        const videoPlayer = getVideoPlayer();
        if (videoPlayer) {
            const subtitleTextElement = getSubtitleTextElement(subtitleElement);
            if (subtitleTextElement && window.activeCues) {
                setupSubtitleDisplay(
                    window.activeCues,
                    videoPlayer,
                    subtitleTextElement
                );
            }
        }

        document.body.style.cursor = "";
    });

    document.addEventListener("mouseleave", () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "";

            const videoPlayer = getVideoPlayer();
            if (videoPlayer) {
                const subtitleTextElement =
                    getSubtitleTextElement(subtitleElement);
                if (subtitleTextElement && window.activeCues) {
                    setupSubtitleDisplay(
                        window.activeCues,
                        videoPlayer,
                        subtitleTextElement
                    );
                }
            }
        }
    });
}

export function clearExistingSubtitles(videoPlayer: HTMLVideoElement): void {
    if (window.subtitleUpdateAnimationFrame) {
        cancelAnimationFrame(window.subtitleUpdateAnimationFrame);
        window.subtitleUpdateAnimationFrame = null;
    }

    if (window.subtitleResizeObserver) {
        window.subtitleResizeObserver.disconnect();
        window.subtitleResizeObserver = null;
    }

    window.removeEventListener("resize", handleResize);

    if (videoPlayer) {
        Array.from(videoPlayer.querySelectorAll("track")).forEach((track) =>
            track.remove()
        );
    }

    document
        .querySelectorAll(".bilibili-subtitles-overlay")
        .forEach((el) => el.remove());

    document
        .querySelectorAll("[id^='bilibili-subtitles-']")
        .forEach((el) => el.remove());

    window.activeCues = undefined;

    clearElementCache();
}

export async function applySubtitleToVideo(
    subtitleContent: string
): Promise<boolean> {
    try {
        const videoContainer = getVideoContainer();
        if (!videoContainer) {
            console.error("BiliBili video container not found");
            return false;
        }

        const settings = await loadSettingsFromIndexedDB();
        const overlayContainer = createSubtitleOverlay(settings);

        if (!subtitleElement || !subtitleTextElement) {
            console.error("Failed to create subtitle elements");
            return false;
        }

        videoContainer.appendChild(overlayContainer);
        setupSubtitleDrag(subtitleElement);

        setupSubtitleResizeHandler();

        window.subtitleSyncOffset = settings.syncOffset || 0;

        return await parseSubtitleContent(
            subtitleContent,
            videoContainer.querySelector("video") as HTMLVideoElement,
            subtitleTextElement
        );
    } catch (error) {
        console.error("Error applying subtitle to video:", error);
        return false;
    }
}
