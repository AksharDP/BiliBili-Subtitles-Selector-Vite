import { createDiv } from '../ui/components';
import { navigateResults, backToSearch, showSubtitleViewer } from '../ui/handlers';

export function createResultsModal(): void {
    if (document.getElementById("opensubtitles-results-overlay")) return;

    const resultsOverlay = createDiv("opensubtitles-results-overlay", "", `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); z-index: 10000; display: none;
        justify-content: center; align-items: center;
    `);

    const resultsModal = createDiv("opensubtitles-results-modal", "", `
        background-color: white; padding: 0; border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 500px; max-width: 90%;
        max-height: 80vh; display: flex; flex-direction: column; overflow: hidden;
    `);

    resultsModal.innerHTML = `
        <div id="os-results-header" style="padding: 15px 20px; border-bottom: 1px solid #eee; background-color: #f9f9f9;">
            <h2 id="os-results-title" style="margin: 0; color: #00a1d6; font-family: Arial, sans-serif; font-size: 18px;">Search Results</h2>
            <div id="os-results-summary" style="margin-top: 5px; font-size: 14px; color: #666; font-family: Arial, sans-serif;"></div>
        </div>
        <div id="os-results-container" style="flex: 1; overflow-y: auto; padding: 15px 20px;"></div>
        <div id="os-results-controls" style="padding: 15px 20px; border-top: 1px solid #eee; background-color: white;">
            <div style="display: flex; justify-content: space-between; gap: 10px;">
                <button type="button" id="os-prev-btn" style="padding: 8px 15px; background-color: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; flex: 1;">Previous</button>
                <button type="button" id="os-back-search-btn" style="padding: 8px 15px; background-color: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; flex: 1;">Back to Search</button>
                <button type="button" id="os-next-btn" style="padding: 8px 15px; background-color: #00a1d6; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; flex: 1;">Next</button>
            </div>
            <div id="os-pagination-info" style="text-align: center; margin-top: 10px; font-family: Arial, sans-serif; font-size: 14px; color: #666;"></div>
        </div>
    `;

    resultsOverlay.appendChild(resultsModal);
    document.body.appendChild(resultsOverlay);

    document.getElementById("os-prev-btn")?.addEventListener("click", () => navigateResults("prev"));
    document.getElementById("os-next-btn")?.addEventListener("click", () => navigateResults("next"));
    document.getElementById("os-back-search-btn")?.addEventListener("click", backToSearch);
}

export function showResultsModal(): void {
    const overlay = document.getElementById("opensubtitles-results-overlay");
    if (overlay) overlay.style.display = "flex";
}

export function hideResultsModal(): void {
    const overlay = document.getElementById("opensubtitles-results-overlay");
    if (overlay) overlay.style.display = "none";
    // Assuming hideSubtitleViewer is called here as in original code
    if (document.getElementById("subtitle-viewer-overlay")?.style.display === "flex") {
        hideSubtitleViewer();
    }
}

export function createSubtitleViewer(): void {
    if (document.getElementById("subtitle-viewer-overlay")) return;

    const viewerOverlay = createDiv("subtitle-viewer-overlay", "", `
        position: fixed; top: 0; left: 0; width: 0; height: 100%;
        background-color: transparent !important; z-index: 9999; display: none;
        justify-content: center; align-items: center; pointer-events: none !important;
    `);

    const viewerContent = createDiv("subtitle-viewer-content", "", `
        background-color: white; padding: 0; border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 500px; max-width: 90%;
        height: 80vh; display: flex; flex-direction: column; overflow: hidden;
        opacity: 0; position: absolute; pointer-events: auto;
    `);

    viewerContent.innerHTML = `
        <div id="subtitle-viewer-header" style="padding: 15px 20px; border-bottom: 1px solid #eee; background-color: #f9f9f9; display: flex; justify-content: space-between; align-items: center;">
            <h2 id="subtitle-viewer-title" style="margin: 0; color: #00a1d6; font-family: Arial, sans-serif; font-size: 18px;">Subtitle Content</h2>
            <button id="subtitle-viewer-close-btn" style="background: none; border: none; cursor: pointer; padding: 5px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div id="subtitle-viewer-container" style="flex: 1; overflow-y: auto; padding: 15px 20px; position: relative;">
            <div id="subtitle-loading" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; z-index: 2;">
                <div style="text-align: center;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #00a1d6; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                    <p style="margin-top: 10px; color: #333;">Loading subtitle...</p>
                </div>
            </div>
            <textarea id="subtitle-content" style="width: 100%; height: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-family: monospace; font-size: 14px; resize: none; white-space: pre; overflow-wrap: normal; overflow-x: auto;"></textarea>
        </div>
        <div id="subtitle-viewer-footer" style="padding: 15px 20px; border-top: 1px solid #eee; background-color: #f9f9f9;">
            <div style="margin-bottom: 10px;">
                <p style="font-size: 14px; margin: 0 0 5px 0;">Click on a timestamp to sync with the current video position:</p>
                <div id="subtitle-sync-status" style="font-size: 12px; color: #666;"></div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="subtitle-sync-auto" style="padding: 8px 15px; background-color: #00a1d6; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; flex: 1;">Auto-Sync</button>
                <button id="subtitle-copy-btn" style="padding: 8px 15px; background-color: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; flex: 1;">Copy to Clipboard</button>
            </div>
        </div>
    `;

    viewerOverlay.appendChild(viewerContent);
    document.body.appendChild(viewerOverlay);

    document.getElementById("subtitle-viewer-close-btn")?.addEventListener("click", hideSubtitleViewer);
    // Additional event listeners added in ui/handlers.ts
}

export function hideSubtitleViewer(): void {
    const viewerOverlay = document.getElementById("subtitle-viewer-overlay");
    if (viewerOverlay) viewerOverlay.style.display = "none";
}