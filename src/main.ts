import { createLoginModal, showLoginModal } from './modals/LoginModal';
import { createSearchModal } from './modals/SearchModal';
import { createResultsModal } from './modals/ResultsModal';
import { createSettingsModal } from './modals/SettingsModal';
import { openDatabase, getToken } from './db/indexedDB';
import { checkToken } from './api/openSubtitles';
import { createUIButton, updateButtonToSubtitles } from './ui/components';
import { handleButtonClick } from './ui/handlers';

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
    `;
    document.head.appendChild(globalStyle);

    createUIButton();
    document.getElementById("opensubtitles-login-btn")?.addEventListener("click", handleButtonClick);
    createLoginModal();
    createSearchModal();
    createResultsModal();
    createSettingsModal();

    const token = await getToken();
    if (token && await checkToken(token)) {
        updateButtonToSubtitles();
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