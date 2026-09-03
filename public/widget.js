(function () {
  "use strict";

  // =====================================================
  // SALES PILOT WIDGET
  // Professional ChatGPT-style customer experience
  // =====================================================

  const script =
    document.currentScript ||
    document.querySelector('script[data-widget-id]') ||
    document.querySelector('script[data-profile]');

  if (!script) {
    console.error("Sales Pilot: Installation script not found.");
    return;
  }

  const widgetId =
    script.getAttribute("data-widget-id") ||
    script.getAttribute("data-profile");

  if (!widgetId) {
    console.error("Sales Pilot: data-widget-id is missing.");
    return;
  }

  const API_BASE =
    script.getAttribute("data-api") ||
    window.location.origin;

  // =====================================================
  // VISITOR SESSION
  // =====================================================

  let visitorSessionId = null;

  try {
    visitorSessionId =
      localStorage.getItem("salespilot_visitor_session");

    if (!visitorSessionId) {
      visitorSessionId =
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : "visitor_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substring(2);

      localStorage.setItem(
        "salespilot_visitor_session",
        visitorSessionId
      );
    }
  } catch (error) {
    console.warn(
      "Sales Pilot: Could not access localStorage.",
      error
    );

    visitorSessionId = "visitor_" + Date.now();
  }

  // =====================================================
  // DEFAULT CONFIGURATION
  // =====================================================

  const defaultConfig = {
    aiName: "Sales Pilot AI",
    welcomeMessage: "Ã°Å¸â€˜â€¹ Hi! How can I help you today?",
    brandColor: "#6366F1",
    position: "Bottom Right",
    theme: "Light",
    size: "Medium",
    radius: "Rounded",
    autoOpen: false,
    showTypingIndicator: true,
    soundNotifications: false,
    showAiAvatar: true,
    collectVisitorName: false,
    collectVisitorEmail: false,
    enableAnimations: true,
    showPoweredBy: true,
  };

  // =====================================================
  // LOAD WIDGET CONFIGURATION
  // =====================================================

  async function loadWidgetConfig() {
    const url =
      `${API_BASE}/api/widget-config?widgetId=${encodeURIComponent(
        widgetId
      )}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "Sales Pilot: Widget config request failed:",
          await response.text()
        );

        return { ...defaultConfig };
      }

      const config = await response.json();

      return {
        ...defaultConfig,
        ...config,
      };
    } catch (error) {
      console.error(
        "Sales Pilot: Failed to load widget configuration:",
        error
      );

      return { ...defaultConfig };
    }
  }

  // =====================================================
  // INITIALIZE
  // =====================================================

  async function initializeWidget() {
    if (document.getElementById("salespilot-widget")) {
      return;
    }

    const config = await loadWidgetConfig();
    createWidget(config);
  }

  // =====================================================
  // CREATE WIDGET
  // =====================================================

  function createWidget(config) {
    const aiName =
      config.aiName || defaultConfig.aiName;

    const welcomeMessage =
      config.welcomeMessage || defaultConfig.welcomeMessage;

    const brandColor =
      config.brandColor || defaultConfig.brandColor;

    const position =
      config.position || defaultConfig.position;

    const theme =
      config.theme || defaultConfig.theme;

    const size =
      config.size || defaultConfig.size;

    const radius =
      config.radius || defaultConfig.radius;

    const autoOpen = config.autoOpen === true;
    const showTypingIndicator =
      config.showTypingIndicator !== false;
    const soundNotifications =
      config.soundNotifications === true;
    const showAiAvatar =
      config.showAiAvatar !== false;
    const collectVisitorName =
      config.collectVisitorName === true;
    const collectVisitorEmail =
      config.collectVisitorEmail === true;
    const enableAnimations =
      config.enableAnimations !== false;
    const showPoweredBy =
      config.showPoweredBy !== false;

    const normalizedTheme =
      String(theme).trim().toLowerCase();

    const isDark = normalizedTheme === "dark";

    let horizontalPosition = "right: 24px;";
    let verticalPosition = "bottom: 24px;";

    if (position === "Bottom Left") {
      horizontalPosition = "left: 24px;";
    }

    if (position === "Top Right") {
      verticalPosition = "top: 24px;";
    }

    if (position === "Top Left") {
      horizontalPosition = "left: 24px;";
      verticalPosition = "top: 24px;";
    }

    let chatWidth = "380px";
    let chatHeight = "560px";
    let buttonSize = "60px";

    if (size === "Small") {
      chatWidth = "330px";
      chatHeight = "480px";
      buttonSize = "54px";
    }

    if (size === "Large") {
      chatWidth = "430px";
      chatHeight = "650px";
      buttonSize = "66px";
    }

    let chatRadius = "20px";

    if (radius === "Square") chatRadius = "8px";
    if (radius === "Soft") chatRadius = "14px";
    if (radius === "Pill") chatRadius = "32px";

    const chatBackground =
      isDark ? "#0f172a" : "#ffffff";

    const messagesBackground =
      isDark ? "#020617" : "#f8fafc";

    const aiMessageBackground =
      isDark ? "#1e293b" : "#ffffff";

    const aiMessageText =
      isDark ? "#f8fafc" : "#172033";

    const inputBackground =
      isDark ? "#1e293b" : "#ffffff";

    const inputText =
      isDark ? "#f8fafc" : "#0f172a";

    const inputBorder =
      isDark ? "#475569" : "#d9dee8";

    const mainBorder =
      isDark ? "#334155" : "#e7eaf0";

    const placeholderColor =
      isDark ? "#94a3b8" : "#7b8494";

    const mutedText =
      isDark ? "#94a3b8" : "#64748b";

    const transitionDuration =
      enableAnimations ? "0.2s" : "0s";

    // ===================================================
    // CONTAINER
    // ===================================================

    const container = document.createElement("div");

    container.id = "salespilot-widget";
    container.setAttribute("data-widget-id", widgetId);
    container.setAttribute("data-profile", widgetId);

    document.body.appendChild(container);

    // ===================================================
    // STYLES
    // ===================================================

    const style = document.createElement("style");

    style.id = "salespilot-widget-styles";

    style.textContent = `
      #salespilot-widget {
        position: fixed;
        ${horizontalPosition}
        ${verticalPosition}
        z-index: 2147483647;
        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        line-height: normal;
      }

      #salespilot-button {
        width: ${buttonSize};
        height: ${buttonSize};
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: ${brandColor};
        color: #fff;
        cursor: pointer;
        font-size: 25px;
        line-height: 1;
        box-shadow: 0 10px 30px rgba(0,0,0,.22);
        transition:
          transform ${transitionDuration} ease,
          box-shadow ${transitionDuration} ease,
          opacity ${transitionDuration} ease;
      }

      #salespilot-button:hover {
        transform: ${enableAnimations ? "scale(1.05)" : "none"};
        box-shadow: 0 14px 35px rgba(0,0,0,.28);
      }

      #salespilot-button:focus {
        outline: 3px solid ${hexToRgba(brandColor, .28)};
        outline-offset: 3px;
      }

      #salespilot-chat {
        position: absolute;
        ${position.includes("Left") ? "left: 0;" : "right: 0;"}
        ${position.includes("Top") ? "top: 75px;" : "bottom: 75px;"}
        width: ${chatWidth};
        height: ${chatHeight};
        display: none;
        flex-direction: column;
        overflow: hidden;
        background: ${chatBackground};
        border: 1px solid ${mainBorder};
        border-radius: ${chatRadius};
        box-shadow: 0 20px 60px rgba(0,0,0,.24);
        isolation: isolate;
      }

      ${
        enableAnimations
          ? `
        #salespilot-chat.salespilot-opening {
          animation: salespilotOpen .2s ease-out;
        }

        @keyframes salespilotOpen {
          from {
            opacity: 0;
            transform: translateY(10px) scale(.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes salespilotTyping {
          0%, 100% { opacity: .35; }
          50% { opacity: 1; }
        }
      `
          : ""
      }

      #salespilot-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 18px;
        background: ${brandColor};
        color: #fff;
      }

      .salespilot-header-avatar {
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,.18);
        font-size: 16px;
      }

      #salespilot-header-title {
        font-size: 16px;
        font-weight: 700;
        line-height: 1.3;
      }

      #salespilot-header-subtitle {
        margin-top: 2px;
        font-size: 11px;
        line-height: 1.3;
        color: rgba(255,255,255,.82);
      }

      #salespilot-messages {
        flex: 1;
        min-height: 0;
        padding: 16px;
        overflow-y: auto;
        background: ${messagesBackground};
        scroll-behavior: smooth;
      }

      .salespilot-message-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 13px;
      }

      .salespilot-message {
        max-width: 84%;
        padding: 11px 14px;
        border-radius: 15px;
        font-size: 14px;
        line-height: 1.5;
        word-break: break-word;
        white-space: pre-wrap;
      }

      .salespilot-ai {
        margin-right: auto;
        background: ${aiMessageBackground};
        color: ${aiMessageText};
        border: 1px solid ${mainBorder};
        box-shadow: 0 1px 2px rgba(0,0,0,.03);
      }

      .salespilot-user {
        margin-left: auto;
        background: ${brandColor};
        color: #fff;
        border: 1px solid transparent;
      }

      .salespilot-avatar {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: ${brandColor};
        color: #fff;
        font-size: 14px;
      }

      /* =========================================
         PRODUCT CARDS
      ========================================= */

      .salespilot-products {
        width: min(100%, 310px);
        margin: -2px 0 15px 38px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .salespilot-product-card {
        overflow: hidden;
        border: 1px solid ${mainBorder};
        border-radius: 14px;
        background: ${chatBackground};
        box-shadow: 0 2px 8px rgba(0,0,0,.05);
      }

      .salespilot-product-image-wrap {
        position: relative;
        width: 100%;
        height: 155px;
        overflow: hidden;
        background: ${isDark ? "#1e293b" : "#f1f5f9"};
      }

      .salespilot-product-image {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .salespilot-product-body {
        padding: 12px;
      }

      .salespilot-product-name {
        margin: 0 0 6px;
        color: ${aiMessageText};
        font-size: 14px;
        font-weight: 650;
        line-height: 1.35;
      }

      .salespilot-product-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
      }

      .salespilot-product-price {
        color: ${aiMessageText};
        font-size: 15px;
        font-weight: 700;
      }

      .salespilot-product-stock {
        font-size: 11px;
        font-weight: 600;
        color: ${mutedText};
        text-align: right;
      }

      .salespilot-product-stock.salespilot-in-stock {
        color: #15803d;
      }

      .salespilot-product-stock.salespilot-out-of-stock {
        color: #dc2626;
      }

      .salespilot-product-link {
        width: 100%;
        min-height: 38px;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 9px 12px;
        border: none;
        border-radius: 10px;
        background: ${brandColor};
        color: #fff !important;
        text-decoration: none !important;
        font-size: 13px;
        font-weight: 650;
        cursor: pointer;
        transition:
          opacity ${transitionDuration} ease,
          transform ${transitionDuration} ease;
      }

      .salespilot-product-link:hover {
        opacity: .9;
        transform: ${enableAnimations ? "translateY(-1px)" : "none"};
      }

      .salespilot-product-link-icon {
        font-size: 14px;
        line-height: 1;
      }

      .salespilot-catalog-link {
        display: inline-flex;
        align-items: center;
        margin: -2px 0 14px 38px;
        padding: 8px 11px;
        border: 1px solid ${mainBorder};
        border-radius: 9px;
        background: ${chatBackground};
        color: ${brandColor} !important;
        text-decoration: none !important;
        font-size: 12px;
        font-weight: 650;
      }

      /* =========================================
         TYPING
      ========================================= */

      .salespilot-typing {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 11px 14px;
        border-radius: 14px;
        background: ${aiMessageBackground};
        border: 1px solid ${mainBorder};
      }

      .salespilot-typing-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: ${aiMessageText};
        ${
          enableAnimations
            ? "animation: salespilotTyping 1.2s infinite;"
            : ""
        }
      }

      ${
        enableAnimations
          ? `
      .salespilot-typing-dot:nth-child(2) {
        animation-delay: .15s;
      }

      .salespilot-typing-dot:nth-child(3) {
        animation-delay: .30s;
      }`
          : ""
      }

      /* =========================================
         INPUT
      ========================================= */

      #salespilot-input-area {
        flex-shrink: 0;
        display: flex;
        gap: 8px;
        padding: 12px;
        background: ${chatBackground};
        border-top: 1px solid ${mainBorder};
      }

      #salespilot-input {
        min-width: 0;
        flex: 1;
        height: 42px;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 1px solid ${inputBorder};
        border-radius: 12px;
        outline: none;
        background: ${inputBackground};
        color: ${inputText};
        font-family: inherit;
        font-size: 14px;
      }

      #salespilot-input::placeholder {
        color: ${placeholderColor};
      }

      #salespilot-input:focus {
        border-color: ${brandColor};
        box-shadow: 0 0 0 3px ${hexToRgba(brandColor, .13)};
      }

      #salespilot-send {
        width: 42px;
        height: 42px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        border-radius: 12px;
        background: ${brandColor};
        color: #fff;
        cursor: pointer;
        font-size: 18px;
      }

      #salespilot-send:hover {
        opacity: .9;
      }

      #salespilot-send:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      /* =========================================
         VISITOR FORM
      ========================================= */

      #salespilot-visitor-form {
        position: absolute;
        inset: 0;
        z-index: 20;
        display: none;
        flex-direction: column;
        justify-content: center;
        padding: 24px;
        background: ${chatBackground};
        color: ${aiMessageText};
      }

      #salespilot-visitor-form-title {
        margin-bottom: 8px;
        font-size: 20px;
        font-weight: 700;
      }

      #salespilot-visitor-form-description {
        margin-bottom: 20px;
        font-size: 14px;
        line-height: 1.5;
        color: ${mutedText};
      }

      .salespilot-form-field {
        margin-bottom: 12px;
      }

      .salespilot-form-field label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 600;
      }

      .salespilot-form-field input {
        width: 100%;
        box-sizing: border-box;
        padding: 11px 12px;
        border: 1px solid ${inputBorder};
        border-radius: 10px;
        outline: none;
        background: ${inputBackground};
        color: ${inputText};
        font-family: inherit;
        font-size: 14px;
      }

      .salespilot-form-field input:focus {
        border-color: ${brandColor};
        box-shadow: 0 0 0 3px ${hexToRgba(brandColor, .12)};
      }

      #salespilot-start-chat {
        width: 100%;
        padding: 12px;
        margin-top: 8px;
        border: none;
        border-radius: 12px;
        background: ${brandColor};
        color: #fff;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }

      #salespilot-powered-by {
        flex-shrink: 0;
        padding: 7px;
        text-align: center;
        font-size: 10px;
        color: ${isDark ? "#64748b" : "#9aa2af"};
        background: ${chatBackground};
        border-top: 1px solid ${mainBorder};
      }

      @media (max-width: 480px) {
        #salespilot-widget {
          right: 18px;
          left: auto;
          bottom: 18px;
          top: auto;
        }

        #salespilot-chat {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: 86px;
          width: calc(100vw - 24px);
          height: 70vh;
          max-height: 650px;
        }

        .salespilot-products,
        .salespilot-catalog-link {
          margin-left: 0;
        }
      }
    `;

    document.head.appendChild(style);

    // ===================================================
    // CHAT HTML
    // ===================================================

    const chat = document.createElement("div");
    chat.id = "salespilot-chat";

    chat.innerHTML = `
      <div id="salespilot-header">
        <div class="salespilot-header-avatar">Ã¢Å“Â¦</div>

        <div>
          <div id="salespilot-header-title">
            ${escapeHTML(aiName)}
          </div>

          <div id="salespilot-header-subtitle">
            AI Customer Support
          </div>
        </div>
      </div>

      <div id="salespilot-messages"></div>

      <div id="salespilot-input-area">
        <input
          id="salespilot-input"
          type="text"
          placeholder="Ask a question..."
          autocomplete="off"
          aria-label="Message"
        />

        <button
          id="salespilot-send"
          type="button"
          aria-label="Send message"
        >
          Ã¢â€ â€˜
        </button>
      </div>

      ${
        showPoweredBy
          ? `
        <div id="salespilot-powered-by">
          Powered by Sales Pilot
        </div>
      `
          : ""
      }

      ${
        collectVisitorName || collectVisitorEmail
          ? `
        <div id="salespilot-visitor-form">
          <div id="salespilot-visitor-form-title">
            Before we start
          </div>

          <div id="salespilot-visitor-form-description">
            Tell us a little about yourself so our AI can better assist you.
          </div>

          ${
            collectVisitorName
              ? `
            <div class="salespilot-form-field">
              <label for="salespilot-visitor-name">
                Your name
              </label>

              <input
                id="salespilot-visitor-name"
                type="text"
                placeholder="Enter your name"
                autocomplete="name"
              />
            </div>
          `
              : ""
          }

          ${
            collectVisitorEmail
              ? `
            <div class="salespilot-form-field">
              <label for="salespilot-visitor-email">
                Email address
              </label>

              <input
                id="salespilot-visitor-email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
            </div>
          `
              : ""
          }

          <button
            id="salespilot-start-chat"
            type="button"
          >
            Start Chat
          </button>
        </div>
      `
          : ""
      }
    `;

    container.appendChild(chat);

    // ===================================================
    // FLOATING BUTTON
    // ===================================================

    const button = document.createElement("button");

    button.id = "salespilot-button";
    button.type = "button";
    button.setAttribute(
      "aria-label",
      "Open Sales Pilot chat"
    );
    button.innerHTML = "Ã°Å¸â€™Â¬";

    container.appendChild(button);

    // ===================================================
    // ELEMENTS
    // ===================================================

    const messages =
      chat.querySelector("#salespilot-messages");

    const input =
      chat.querySelector("#salespilot-input");

    const send =
      chat.querySelector("#salespilot-send");

    const visitorForm =
      chat.querySelector("#salespilot-visitor-form");

    const visitorNameInput =
      chat.querySelector("#salespilot-visitor-name");

    const visitorEmailInput =
      chat.querySelector("#salespilot-visitor-email");

    const startChatButton =
      chat.querySelector("#salespilot-start-chat");

    if (!messages || !input || !send) {
      console.error(
        "Sales Pilot: Widget elements could not be created."
      );
      return;
    }

    // ===================================================
    // VISITOR INFORMATION
    // ===================================================

    let customerName = null;
    let customerEmail = null;

    try {
      customerName =
        localStorage.getItem("salespilot_customer_name");

      customerEmail =
        localStorage.getItem("salespilot_customer_email");
    } catch {
      customerName = null;
      customerEmail = null;
    }

    function needsVisitorInformation() {
      if (collectVisitorName && !customerName) {
        return true;
      }

      if (collectVisitorEmail && !customerEmail) {
        return true;
      }

      return false;
    }

    function showVisitorForm() {
      if (!visitorForm) return;

      visitorForm.style.display = "flex";

      if (
        collectVisitorName &&
        !customerName &&
        visitorNameInput
      ) {
        setTimeout(() => visitorNameInput.focus(), 50);
        return;
      }

      if (
        collectVisitorEmail &&
        !customerEmail &&
        visitorEmailInput
      ) {
        setTimeout(() => visitorEmailInput.focus(), 50);
      }
    }

    function hideVisitorForm() {
      if (visitorForm) {
        visitorForm.style.display = "none";
      }
    }

    function saveVisitorInformation() {
      try {
        if (customerName) {
          localStorage.setItem(
            "salespilot_customer_name",
            customerName
          );
        }

        if (customerEmail) {
          localStorage.setItem(
            "salespilot_customer_email",
            customerEmail
          );
        }
      } catch {
        // Ignore storage errors.
      }
    }

    function startChat() {
      if (collectVisitorName && !customerName) {
        customerName =
          visitorNameInput
            ? visitorNameInput.value.trim()
            : "";

        if (!customerName) {
          alert("Please enter your name.");
          if (visitorNameInput) visitorNameInput.focus();
          return;
        }
      }

      if (collectVisitorEmail && !customerEmail) {
        customerEmail =
          visitorEmailInput
            ? visitorEmailInput.value.trim()
            : "";

        if (!customerEmail) {
          alert("Please enter your email address.");
          if (visitorEmailInput) visitorEmailInput.focus();
          return;
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            customerEmail
          )
        ) {
          alert("Please enter a valid email address.");
          if (visitorEmailInput) visitorEmailInput.focus();
          return;
        }
      }

      saveVisitorInformation();
      hideVisitorForm();

      setTimeout(() => input.focus(), 50);
    }

    if (startChatButton) {
      startChatButton.addEventListener("click", startChat);
    }

    // ===================================================
    // SOUND
    // ===================================================

    function playNotificationSound() {
      if (!soundNotifications) return;

      try {
        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContext) return;

        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
          660,
          audioContext.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          880,
          audioContext.currentTime + 0.12
        );

        gain.gain.setValueAtTime(
          0.0001,
          audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.08,
          audioContext.currentTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime + 0.16
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(
          audioContext.currentTime + 0.16
        );

        setTimeout(() => {
          audioContext.close();
        }, 300);
      } catch (error) {
        console.warn(
          "Sales Pilot: Could not play notification sound.",
          error
        );
      }
    }

    // ===================================================
    // TYPING INDICATOR
    // ===================================================

    function createTypingIndicator() {
      const row = document.createElement("div");

      row.className = "salespilot-message-row";
      row.id = "salespilot-typing-row";

      if (showAiAvatar) {
        const avatar = document.createElement("div");

        avatar.className = "salespilot-avatar";
        avatar.textContent = "Ã¢Å“Â¦";

        row.appendChild(avatar);
      }

      const typing = document.createElement("div");

      typing.className = "salespilot-typing";

      typing.innerHTML = `
        <span class="salespilot-typing-dot"></span>
        <span class="salespilot-typing-dot"></span>
        <span class="salespilot-typing-dot"></span>
      `;

      row.appendChild(typing);
      messages.appendChild(row);

      scrollToBottom();

      return row;
    }

    // ===================================================
    // SCROLL
    // ===================================================

    function scrollToBottom() {
      requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
      });
    }

    // ===================================================
    // ADD TEXT MESSAGE
    // ===================================================

    function addMessage(text, sender) {
      const row = document.createElement("div");

      row.className = "salespilot-message-row";

      if (sender === "ai" && showAiAvatar) {
        const avatar = document.createElement("div");

        avatar.className = "salespilot-avatar";
        avatar.textContent = "Ã¢Å“Â¦";

        row.appendChild(avatar);
      }

      const message = document.createElement("div");

      message.className =
        "salespilot-message " +
        (sender === "user"
          ? "salespilot-user"
          : "salespilot-ai");

      message.textContent = String(text || "");

      row.appendChild(message);
      messages.appendChild(row);

      scrollToBottom();

      if (sender === "ai") {
        playNotificationSound();
      }

      return row;
    }

    // ===================================================
    // PRODUCT NORMALIZATION
    // Handles different backend field names safely.
    // ===================================================

    function normalizeProduct(product) {
      if (!product || typeof product !== "object") {
        return null;
      }

      const name =
        product.name ||
        product.title ||
        product.productName ||
        "";

      const price =
        product.price ??
        product.salePrice ??
        product.priceFormatted ??
        product.formattedPrice ??
        "";

      const image =
        product.image ||
        product.imageUrl ||
        product.image_url ||
        product.featuredImage ||
        product.featured_image ||
        product.thumbnail ||
        "";

      const url =
        product.url ||
        product.productUrl ||
        product.product_url ||
        product.onlineStoreUrl ||
        product.online_store_url ||
        product.handleUrl ||
        "";

      const available =
        typeof product.available === "boolean"
          ? product.available
          : typeof product.inStock === "boolean"
            ? product.inStock
            : typeof product.in_stock === "boolean"
              ? product.in_stock
              : null;

      const inventory =
        product.inventory ??
        product.inventoryQuantity ??
        product.inventory_quantity ??
        null;

      const vendor =
        product.vendor ||
        product.brand ||
        "";

      return {
        ...product,
        name: String(name).trim(),
        price: String(price || "").trim(),
        image: String(image || "").trim(),
        url: String(url || "").trim(),
        available,
        inventory,
        vendor: String(vendor || "").trim(),
      };
    }

    function normalizeProducts(products) {
      if (!Array.isArray(products)) return [];

      const seen = new Set();

      return products
        .map(normalizeProduct)
        .filter((product) => {
          if (!product || !product.name) return false;

          const key =
            product.url ||
            product.name.toLowerCase();

          if (seen.has(key)) return false;

          seen.add(key);
          return true;
        })
        .slice(0, 3);
    }

    // ===================================================
    // REMOVE RAW PRODUCT URLS FROM AI TEXT
    // ===================================================

    function cleanAssistantProductText(text) {
      let value = String(text || "");

      // Remove standalone http/https URLs.
      value = value.replace(
        /https?:\/\/[^\s<>"')]+/gi,
        ""
      );

      // Remove empty lines created by URL removal.
      value = value.replace(
        /\n[ \t]*\n[ \t]*\n+/g,
        "\n\n"
      );

      // Remove common "View Product" text from the AI response.
      value = value.replace(
        /\[?\s*view\s+product\s*(?:Ã¢â€ â€™|->|Ã¢â€ â€”)?\s*\]?/gi,
        ""
      );

      // Remove leftover excessive whitespace.
      return value
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    // ===================================================
    // CREATE SHORT, NATURAL PRODUCT INTRO
    // =====================================================

    function buildProductIntro(originalText, products) {
      const cleanText =
        cleanAssistantProductText(originalText);

      if (!products.length) {
        return cleanText;
      }

      // Use the AI's short, natural lead-in whenever it already exists and
      // is concise. The product cards carry names, prices, images, and
      // links below. We only synthesize a brief neutral intro when the AI
      // left none or pasted a raw product dump instead.
      if (cleanText && cleanText.length <= 180 && !looksLikeProductDump(cleanText)) {
        return cleanText;
      }

      const first = products[0];

      if (products.length === 1) {
        const priceText = first.price
          ? ` It is currently ${first.price}.`
          : "";

        const availabilityText =
          first.available === true
            ? " It is in stock."
            : first.available === false
              ? " It is currently out of stock."
              : "";

        return (
          `One option is available: ` +
          `the ${first.name}.` +
          priceText +
          availabilityText
        ).trim();
      }

      return (
        `Here are a few matching options. ` +
        `Take a look and let me know if you want more detail on any of them.`
      );
    }

    function looksLikeProductDump(text) {
      const value = String(text || "");

      const lineCount =
        value.split(/\n/).filter(Boolean).length;

      const productMarkers =
        (
          value.match(
            /(?:rs\.?|price|in stock|out of stock|available|low stock|https?:\/\/|Ã¢â‚¬â€|- )/gi
          ) || []
        ).length;

      return (
        lineCount >= 4 ||
        productMarkers >= 4 ||
        value.length > 300
      );
    }

    // ===================================================
    // PRODUCT CARDS
    // =====================================================

    function renderProductCards(products) {
      const normalized = normalizeProducts(products);

      if (!normalized.length) {
        return null;
      }

      const wrapper = document.createElement("div");

      wrapper.className = "salespilot-products";

      normalized.forEach((product) => {
        const card = document.createElement("div");

        card.className = "salespilot-product-card";

        // Image
        if (product.image) {
          const imageWrap =
            document.createElement("div");

          imageWrap.className =
            "salespilot-product-image-wrap";

          const image =
            document.createElement("img");

          image.className =
            "salespilot-product-image";

          image.src = product.image;
          image.alt = product.name;
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";

          image.addEventListener(
            "error",
            () => {
              imageWrap.remove();
            },
            { once: true }
          );

          imageWrap.appendChild(image);
          card.appendChild(imageWrap);
        }

        const body =
          document.createElement("div");

        body.className =
          "salespilot-product-body";

        const name =
          document.createElement("div");

        name.className =
          "salespilot-product-name";

        name.textContent =
          product.name;

        body.appendChild(name);

        const meta =
          document.createElement("div");

        meta.className =
          "salespilot-product-meta";

        if (product.price) {
          const price =
            document.createElement("div");

          price.className =
            "salespilot-product-price";

          price.textContent =
            product.price;

          meta.appendChild(price);
        }

        if (
          product.available !== null ||
          product.inventory !== null
        ) {
          const stock =
            document.createElement("div");

          stock.className =
            "salespilot-product-stock";

          if (product.available === true) {
            stock.textContent =
              product.inventory !== null &&
              Number.isFinite(Number(product.inventory))
                ? `In stock Ã‚Â· ${product.inventory} left`
                : "In stock";

            stock.classList.add(
              "salespilot-in-stock"
            );
          } else if (product.available === false) {
            stock.textContent =
              "Currently unavailable";

            stock.classList.add(
              "salespilot-out-of-stock"
            );
          } else {
            stock.textContent =
              "Availability not listed";
          }

          meta.appendChild(stock);
        }

        if (meta.children.length) {
          body.appendChild(meta);
        }

        // IMPORTANT:
        // Product URL is rendered only as a button.
        // It is never printed as raw text.
        if (product.url) {
          const link =
            document.createElement("a");

          link.className =
            "salespilot-product-link";

          link.href =
            product.url;

          link.target =
            "_blank";

          link.rel =
            "noopener noreferrer";

          link.setAttribute(
            "aria-label",
            `View ${product.name}`
          );

          link.innerHTML = `
            <span>View Product</span>
            <span class="salespilot-product-link-icon">Ã¢â€ â€”</span>
          `;

          body.appendChild(link);
        }

        card.appendChild(body);
        wrapper.appendChild(card);
      });

      messages.appendChild(wrapper);

      scrollToBottom();

      return wrapper;
    }

    // ===================================================
    // CATALOG LINK
    // ===================================================

    function renderCatalogLink(url) {
      if (!url) return;

      const safeUrl = String(url).trim();

      if (!/^https?:\/\//i.test(safeUrl)) {
        return;
      }

      const link =
        document.createElement("a");

      link.className =
        "salespilot-catalog-link";

      link.href =
        safeUrl;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      link.textContent =
        "Browse full catalog Ã¢â€ â€”";

      messages.appendChild(link);

      scrollToBottom();
    }

    // ===================================================
    // SITE LINK
    // ===================================================

    function renderSiteLink(url) {
      if (!url) return;

      const safeUrl = String(url).trim();

      if (!/^https?:\/\//i.test(safeUrl)) {
        return;
      }

      const link =
        document.createElement("a");

      link.className =
        "salespilot-catalog-link";

      link.href =
        safeUrl;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      link.textContent =
        "Visit our website \u2197";

      messages.appendChild(link);

      scrollToBottom();
    }

    // ===================================================
    // RENDER AI RESPONSE
    // =====================================================

    function renderAIResponse(data) {
      const products =
        normalizeProducts(
          Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.productCards)
              ? data.productCards
              : []
        );

      const rawResponse =
        data?.response ||
        data?.message ||
        "";

      const responseText =
        buildProductIntro(
          rawResponse,
          products
        );

      if (responseText) {
        addMessage(responseText, "ai");
      }

      if (products.length) {
        renderProductCards(products);
      }

      if (
        data?.catalogUrl &&
        typeof data.catalogUrl === "string"
      ) {
        renderCatalogLink(data.catalogUrl);
      }

      if (
        data?.siteUrl &&
        typeof data.siteUrl === "string"
      ) {
        renderSiteLink(data.siteUrl);
      }
    }

    // ===================================================
    // SEND MESSAGE
    // ===================================================

    let sending = false;

    async function sendMessage() {
      if (sending) return;

      const message =
        input.value.trim();

      if (!message) return;

      if (needsVisitorInformation()) {
        showVisitorForm();
        return;
      }

      input.value = "";

      addMessage(message, "user");

      sending = true;
      send.disabled = true;

      let typingIndicator = null;
      let loadingMessage = null;

      if (showTypingIndicator) {
        typingIndicator =
          createTypingIndicator();
      } else {
        loadingMessage =
          addMessage("Thinking...", "ai");
      }

      try {
        const response =
          await fetch(
            `${API_BASE}/api/chat`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                message,
                widgetId,
                profileId: widgetId,
                visitorSessionId,
                customerName,
                customerEmail,
              }),
            }
          );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (typingIndicator) {
          typingIndicator.remove();
        }

        if (loadingMessage) {
          loadingMessage.remove();
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Chat request failed."
          );
        }

        if (data.visitorSessionId) {
          visitorSessionId =
            data.visitorSessionId;

          try {
            localStorage.setItem(
              "salespilot_visitor_session",
              visitorSessionId
            );
          } catch {
            // Ignore storage errors.
          }
        }

        renderAIResponse(data);
      } catch (error) {
        console.error(
          "Sales Pilot chat error:",
          error
        );

        if (typingIndicator) {
          typingIndicator.remove();
        }

        if (loadingMessage) {
          loadingMessage.remove();
        }

        addMessage(
          "Sorry, something went wrong. Please try again.",
          "ai"
        );
      } finally {
        sending = false;
        send.disabled = false;
        input.focus();
      }
    }

    // ===================================================
    // OPEN / CLOSE
    // ===================================================

    let opened = false;

    function openWidget() {
      if (opened) return;

      opened = true;

      chat.style.display = "flex";

      if (enableAnimations) {
        chat.classList.remove(
          "salespilot-opening"
        );

        void chat.offsetWidth;

        chat.classList.add(
          "salespilot-opening"
        );
      }

      button.innerHTML = "Ãƒâ€”";

      button.setAttribute(
        "aria-label",
        "Close Sales Pilot chat"
      );

      if (needsVisitorInformation()) {
        showVisitorForm();
        return;
      }

      setTimeout(() => input.focus(), 50);
    }

    function closeWidget() {
      if (!opened) return;

      opened = false;
      chat.style.display = "none";

      button.innerHTML = "Ã°Å¸â€™Â¬";

      button.setAttribute(
        "aria-label",
        "Open Sales Pilot chat"
      );
    }

    button.addEventListener("click", () => {
      if (opened) {
        closeWidget();
      } else {
        openWidget();
      }
    });

    send.addEventListener(
      "click",
      sendMessage
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          sendMessage();
        }
      }
    );

    // ===================================================
    // WELCOME MESSAGE
    // ===================================================

    addMessage(
      welcomeMessage,
      "ai"
    );

    // ===================================================
    // AUTO OPEN
    // ===================================================

    if (autoOpen) {
      setTimeout(
        openWidget,
        enableAnimations ? 700 : 0
      );
    }

    // ===================================================
    // DEBUG
    // ===================================================

    console.log(
      "Sales Pilot widget initialized successfully."
    );
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  function escapeHTML(value) {
    const div =
      document.createElement("div");

    div.textContent =
      String(value);

    return div.innerHTML;
  }

  // =====================================================
  // HEX Ã¢â€ â€™ RGBA
  // =====================================================

  function hexToRgba(hex, alpha) {
    if (typeof hex !== "string") {
      return `rgba(99, 102, 241, ${alpha})`;
    }

    let clean =
      hex
        .replace("#", "")
        .trim();

    if (clean.length === 3) {
      clean =
        clean
          .split("")
          .map((char) => char + char)
          .join("");
    }

    if (clean.length !== 6) {
      return `rgba(99, 102, 241, ${alpha})`;
    }

    const number =
      parseInt(clean, 16);

    const r =
      (number >> 16) & 255;

    const g =
      (number >> 8) & 255;

    const b =
      number & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // =====================================================
  // START WIDGET
  // =====================================================

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeWidget,
      { once: true }
    );
  } else {
    initializeWidget();
  }
})();
