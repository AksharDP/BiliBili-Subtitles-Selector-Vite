import { createDiv, createButton } from '../ui/components';
import loginModalTemplate from '../templates/loginModal.html?raw';
import { validateToken } from '../api/openSubtitles.ts';
import { storeToken } from '../db/indexedDB';
import { openUiBtn } from '../main.ts';
import { showSearchModal } from './SearchModal.ts';
import {ActiveModal, setActiveModal} from "./ModalManager.ts"; // Import the HTML

export let loginModal: HTMLDivElement;

export function createLoginButton(): HTMLButtonElement {
    const button = createButton("opensubtitles-login-btn", "OpenSubtitles Login", undefined, `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        padding: 10px 15px; background-color: #00a1d6; color: white;
        border: none; border-radius: 4px; cursor: pointer;
        font-family: 'Nunito', 'Inter', sans-serif; font-size: 14px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    `);
    document.body.appendChild(button);
    return button;
}

export function createLoginModal(): HTMLDivElement {
    const loginOverlay = createDiv(
        "opensubtitles-login-overlay",
        "",
        `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
        `
    );

    const loginModalDiv = createDiv(
        "opensubtitles-login-modal",
        "",
        `
            background-color: white;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            width: 300px;
            max-width: 90%;
        `
    );

    loginModalDiv.innerHTML = loginModalTemplate;
    loginOverlay.appendChild(loginModalDiv);
    document.body.appendChild(loginOverlay);

    const loginForm = document.getElementById("opensubtitles-login-form");
    const cancelBtn = document.getElementById("os-cancel-btn");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    } else {
        console.error("Login form not found");
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", hideLoginModal);
    } else {
        console.error("Cancel button not found");
    }

    return loginOverlay;
}

export function showLoginModal(): void {
    const overlay = document.getElementById("opensubtitles-login-overlay");
    if (overlay) {
        overlay.style.display = "flex";
    }
    setActiveModal(ActiveModal.LOGIN);
}

export function hideLoginModal(): void {
    const overlay = document.getElementById("opensubtitles-login-overlay");
    if (overlay) {
        overlay.style.display = "none";
    }
}

export function updateButtonToSubtitles(openUiBtn: HTMLButtonElement): void {
    openUiBtn.textContent = "Subtitles";
    openUiBtn.style.backgroundColor = "#2ecc71";
    setActiveModal(ActiveModal.SEARCH);
}

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
            
            updateButtonToSubtitles(openUiBtn);
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