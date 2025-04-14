import { createDiv, createButton } from "../ui/components";
import loginModalTemplate from "../templates/loginModal.html?raw";
import { validateToken } from "../api/openSubtitles.ts";
import { storeToken } from "../db/indexedDB";
import { openUiBtn } from "../main.ts";
import { showSearchModal } from "./SearchModal.ts";
import { ActiveModal, setActiveModal } from "./ModalManager.ts";
import { RED, BLUE } from "../utils/constants.ts";

export let loginOverlay: HTMLDivElement | null = null;
export let loginModal: HTMLDivElement | null = null;
let loginForm: HTMLFormElement | null = null;
let tokenInput: HTMLInputElement | null = null;
let cancelBtn: HTMLButtonElement | null = null;
let statusElement: HTMLElement | null = null;

export function createLoginButton(): HTMLButtonElement {
    const button = createButton(
        "opensubtitles-login-btn",
        "OpenSubtitles Login",
        undefined,
        `
        position: fixed; bottom: 50px; right: 20px; z-index: 9999;
        padding: 10px 15px; background-color: ${BLUE}; color: white;
        border: none; border-radius: 4px; cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    `
    );
    document.body.appendChild(button);
    return button;
}

export function createLoginModal(): void {
    if (document.getElementById("opensubtitles-login-overlay")) return;

    const overlayDiv = createDiv(
        "opensubtitles-login-overlay",
        "",
        `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.5); z-index: 10000;
            display: none; justify-content: center; align-items: center;
        `
    );

    const modalDiv = createDiv(
        "opensubtitles-login-modal",
        "",
        `
            background-color: white; padding: 20px; border-radius: 6px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 300px;
            max-width: 90%;
        `
    );

    modalDiv.innerHTML = loginModalTemplate;
    overlayDiv.appendChild(modalDiv);
    document.body.appendChild(overlayDiv);

    loginOverlay = overlayDiv;
    loginModal = modalDiv;
    loginForm = loginModal.querySelector(
        "#opensubtitles-login-form"
    ) as HTMLFormElement;
    tokenInput = loginModal.querySelector("#os-token") as HTMLInputElement;
    cancelBtn = loginModal.querySelector("#os-cancel-btn") as HTMLButtonElement;
    statusElement = loginModal.querySelector("#os-login-status") as HTMLElement;

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
    if (loginOverlay) {
        loginOverlay.style.display = "flex";
    }
    if (statusElement) {
        statusElement.textContent = "";
        statusElement.style.display = "none";
    }
    setActiveModal(ActiveModal.LOGIN);
}

export function hideLoginModal(): void {
    if (loginOverlay) {
        loginOverlay.style.display = "none";
    }
    if (tokenInput) {
        tokenInput.value = "";
    }
    setActiveModal(ActiveModal.LOGIN);
}

export function updateButtonToSubtitles(btn: HTMLButtonElement): void {
    btn.textContent = "Subtitles";
    btn.style.backgroundColor = BLUE;
    setActiveModal(ActiveModal.SEARCH);
}

export async function handleLoginSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const tokenValue = tokenInput?.value;
    const statusEl = statusElement;

    if (!tokenValue) {
        if (statusEl) {
            statusEl.textContent = "Please enter your API token.";
            statusEl.style.display = "block";
            statusEl.style.color = RED;
        }
        return;
    }

    if (statusEl) {
        statusEl.textContent = "Validating token...";
        statusEl.style.color = BLUE;
        statusEl.style.display = "block";
    }

    try {
        const result = await validateToken(tokenValue);

        if (result.valid) {
            await storeToken({
                token: result.token,
                base_url: result.base_url,
                timestamp: Date.now(),
                userData: result.userData,
            });

            updateButtonToSubtitles(openUiBtn);
            hideLoginModal();
            showSearchModal();
        } else {
            throw new Error("Invalid token provided.");
        }
    } catch (error) {
        console.error("Login error:", error);
        if (statusEl) {
            statusEl.textContent =
                error instanceof Error
                    ? error.message
                    : "Login failed. Please check your token and network connection.";
            statusEl.style.color = RED;
            statusEl.style.display = "block";
        }
    }
}
