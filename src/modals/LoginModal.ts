import { createDiv } from '../ui/components';
import { handleLoginSubmit } from '../ui/handlers';
import loginModalTemplate from '../templates/loginModal.html?raw'; // Import the HTML

export function createLoginModal(): void {
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

    const loginModal = createDiv(
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

    loginModal.innerHTML = loginModalTemplate;
    loginOverlay.appendChild(loginModal);
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
}

export function showLoginModal(): void {
    const overlay = document.getElementById("opensubtitles-login-overlay");
    if (overlay) {
        overlay.style.display = "flex";
    }
}

export function hideLoginModal(): void {
    const overlay = document.getElementById("opensubtitles-login-overlay");
    if (overlay) {
        overlay.style.display = "none";
    }
}