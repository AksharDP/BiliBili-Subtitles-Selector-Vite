import {updateButtonToSubtitles} from './components';
import {hideLoginModal, showLoginModal} from '../modals/LoginModal';
import {getToken, storeToken} from '../db/indexedDB';
import {checkToken, validateToken} from '../api/openSubtitles';
import {restoreLastActiveModal} from '../modals/ModalManager';

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