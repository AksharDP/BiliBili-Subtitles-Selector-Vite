import { createLoginModal, createLoginButton, updateButtonToSubtitles, showLoginModal, loginOverlay } from './modals/LoginModal'; // showLoginModal
import { createSearchModal, searchOverlay } from './modals/SearchModal';
import { createResultsModal, resultsOverlay } from './modals/ResultsModal';
import { settingsOverlay, createSettingsModal } from './modals/SettingsModal';
import { subtitleViewerOverlay } from './modals/SubtitleViewerModal';
import { openDatabase, getToken } from './db/indexedDB';
import { checkToken } from './api/openSubtitles';
import { initModalManager, hideAllModals, restoreLastActiveModal } from './modals/ModalManager';

export let openUiBtn: HTMLButtonElement;
// export let loginOverlay: HTMLDivElement | null;
// export let searchOverlay: HTMLDivElement | null;
// export let resultsOverlay: HTMLDivElement | null;
// // export let settingsOverlay: HTMLDivElement | null;
// export let subtitleViewerOverlay: HTMLDivElement | null;

async function handleButtonClick(): Promise<void> {
    const token = await getToken();
    
    if (!token || !(await checkToken(token))) {
        showLoginModal();
    } else {
        restoreLastActiveModal();
    }
}

// Handle document clicks to close modals when clicking outside
function handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Get all modal overlays
    const modalOverlays = [
        loginOverlay,
        searchOverlay,
        resultsOverlay,
        settingsOverlay,
        subtitleViewerOverlay
    ].filter(Boolean);
    
    // // Check if any overlay is visible
    // const isAnyModalOpen = modalOverlays.some(overlay => 
    //     overlay && window.getComputedStyle(overlay).display !== 'none');
    
    if (!modalOverlays.some(overlay => 
        overlay && window.getComputedStyle(overlay).display !== 'none')) return;
    
    // Check if click is inside a modal or on the button
    const isClickInsideModal = modalOverlays.some(overlay => 
        overlay && overlay.contains(target));
    const isClickOnButton = target.closest('#opensubtitles-login-btn, #opensubtitles-settings-btn');
    
    // If click is outside modals and not on control button, hide all modals
    if (!isClickInsideModal && !isClickOnButton) {
        // Use the hideAllModals function from ModalManager
        hideAllModals();
    }
}

async function init(): Promise<void> {
    await openDatabase();

    document.head.insertAdjacentHTML('beforeend', `
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap">
        <style>
            #opensubtitles-login-btn,
            #opensubtitles-login-overlay *,
            #opensubtitles-search-overlay *,
            #opensubtitles-results-overlay *,
            #opensubtitles-settings-overlay *,
            #os-settings-notification,
            #bilibili-subtitles-draggable * {
                font-family: 'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
                font-size: var(--subtitle-font-size, 16px);
            }
            .os-modal {
                animation: os-fade-in 0.2s ease-in-out;
            }
            @keyframes os-fade-in {
                from { opacity: 0; transform: translateY(-10px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        </style>
    `);
    openUiBtn = createLoginButton();
    openUiBtn.addEventListener("click", handleButtonClick);
    createLoginModal();
    createSearchModal();
    createResultsModal();
    createSettingsModal();

    initModalManager();
    const token = await getToken();
    if (token && await checkToken(token)) {
        updateButtonToSubtitles(openUiBtn);
    }

    document.addEventListener('click', handleDocumentClick);
}

init();