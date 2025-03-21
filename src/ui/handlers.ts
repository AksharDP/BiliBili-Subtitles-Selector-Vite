import { updateButtonToSubtitles } from './components';
import { hideResultsModal, showResultsModal } from '../modals/ResultsModal';
import { showLoginModal, hideLoginModal } from '../modals/LoginModal';
import { getToken, storeToken } from '../db/indexedDB';
import { checkToken, validateToken } from '../api/openSubtitles';
import { restoreLastActiveModal, setActiveModal, ActiveModal } from '../modals/ModalManager';

export async function handleLoginSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const token = (document.getElementById("os-token") as HTMLInputElement).value;
    const status = document.getElementById("os-login-status");
    
    if (!token) {
        if (status) {
            status.textContent = "Please enter your API token.";
            status.style.display = "block";
        }
        return;
    }
    
    try {
        const result = await validateToken(token);
        
        if (result.valid) {
            // Store token and user data
            await storeToken({ 
                token: result.token,
                base_url: result.base_url,
                timestamp: Date.now(),
                userData: result.userData
            });
            
            updateButtonToSubtitles();
            hideLoginModal();
            showSearchModal();
        } else {
            throw new Error("Invalid token");
        }
    } catch (error) {
        console.error("Login error:", error);
        if (status) {
            status.textContent = "Login failed. Please check your token.";
            status.style.display = "block";
        }
    }
}

// export function hideLoginModal(): void {
//     const overlay = document.getElementById("opensubtitles-login-overlay");
//     if (overlay) overlay.style.display = "none";
// }

function showSearchModal(): void {
    const overlay = document.getElementById("opensubtitles-search-overlay");
    if (overlay) overlay.style.display = "flex";
}

function hideSearchModal(): void {
    const overlay = document.getElementById("opensubtitles-search-overlay");
    if (overlay) overlay.style.display = "none";
}

export async function handleSearchSubmit(e: Event): Promise<void> {
    e.preventDefault();
    // Implement search logic here (assumed truncated in original)
    hideSearchModal();
    showResultsModal();
}

export async function handleButtonClick(): Promise<void> {
    const token = await getToken();
    
    if (!token || !(await checkToken(token))) {
        // User needs to log in
        showLoginModal();
    } else {
        // User is logged in, restore last active modal
        restoreLastActiveModal();
    }
}

export async function navigateResults(direction: "prev" | "next"): Promise<void> {
    // Implement navigation logic (assumed truncated in original)
    console.log(`Navigate ${direction}`);
}


export async function showSubtitleViewer(subtitleId: string): Promise<void> {
    // Implement subtitle viewer logic (assumed truncated in original)
    console.log(`Showing subtitle viewer for ID: ${subtitleId}`);
}

export function handleSettingsEvents(): void {
    const closeBtn = document.getElementById("os-settings-close-btn");
    const saveBtn = document.getElementById("os-settings-save-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => {
        const overlay = document.getElementById("opensubtitles-settings-overlay");
        if (overlay) overlay.style.display = "none";
    });
    if (saveBtn) saveBtn.addEventListener("click", () => console.log("Save settings"));
    // Add more event listeners as needed
}