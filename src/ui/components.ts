export function createButton(id: string, text: string, onClick?: () => void, style: string = ""): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = id;
    button.textContent = text;
    button.type = "button";
    button.style.cssText = `
        padding: 8px 15px; background-color: #f0f0f0; color: #333;
        border: none; border-radius: 4px; cursor: pointer;
        font-family: Arial, sans-serif; ${style}
    `;
    if (onClick) button.addEventListener("click", onClick);
    return button;
}

export function createDiv(id: string, innerHTML: string = "", style: string = ""): HTMLDivElement {
    const div = document.createElement("div");
    div.id = id;
    div.innerHTML = innerHTML;
    div.style.cssText = style;
    return div;
}

export function createUIButton(): void {
    const button = createButton("opensubtitles-login-btn", "OpenSubtitles Login", undefined, `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        padding: 10px 15px; background-color: #00a1d6; color: white;
        border: none; border-radius: 4px; cursor: pointer;
        font-family: 'Nunito', 'Inter', sans-serif; font-size: 14px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    `);
    document.body.appendChild(button);
}

export function updateButtonToSubtitles(): void {
    const button = document.getElementById("opensubtitles-login-btn");
    if (button) {
        button.textContent = "Subtitles";
        button.style.backgroundColor = "#2ecc71";
    }
}