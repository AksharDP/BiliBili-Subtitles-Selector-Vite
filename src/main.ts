import { createLoginModal, showLoginModal } from './modals/LoginModal';
import { createSearchModal } from './modals/SearchModal';
import { createResultsModal } from './modals/ResultsModal';
import { createSettingsModal } from './modals/SettingsModal';
import { openDatabase, getToken } from './db/indexedDB';
import { checkToken } from './api/openSubtitles';
import { createUIButton, updateButtonToSubtitles } from './ui/components';
import { handleButtonClick } from './ui/handlers';
import { initModalManager, hideAllModals } from './modals/ModalManager';

async function init(): Promise<void> {
    await openDatabase();
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const globalStyle = document.createElement('style');
    globalStyle.textContent = `
        #opensubtitles-login-btn,
        #opensubtitles-login-overlay *,
        #opensubtitles-search-overlay *,
        #opensubtitles-results-overlay *,
        #opensubtitles-settings-overlay *,
        #os-settings-notification,
        #bilibili-subtitles-draggable * {
            font-family: 'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
            font-size: max(1px, var(--subtitle-font-size, 16px));
        }
        
        /* Add animation for modals */
        .os-modal {
            animation: os-fade-in 0.2s ease-in-out;
        }
        
        @keyframes os-fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(globalStyle);

    createUIButton();
    document.getElementById("opensubtitles-login-btn")?.addEventListener("click", handleButtonClick);
    createLoginModal();
    createSearchModal();
    createResultsModal();
    createSettingsModal();
    
    // Initialize modal manager for click-outside behavior and state preservation
    initModalManager();

    const token = await getToken();
    if (token && await checkToken(token)) {
        updateButtonToSubtitles();
    }
    
    // Add global click listener to detect clicks outside modals
    document.addEventListener('click', handleDocumentClick);
}

// Handle document clicks to close modals when clicking outside
function handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Get all modal overlays
    const modalOverlays = [
        document.getElementById('opensubtitles-login-overlay'),
        document.getElementById('opensubtitles-search-overlay'),
        document.getElementById('opensubtitles-results-overlay'),
        document.getElementById('opensubtitles-settings-overlay'),
        document.getElementById('subtitle-viewer-overlay')
    ].filter(Boolean);
    
    // Check if any overlay is visible
    const isAnyModalOpen = modalOverlays.some(overlay => 
        overlay && window.getComputedStyle(overlay).display !== 'none');
    
    if (!isAnyModalOpen) return;
    
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

function start(): void {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}

start();