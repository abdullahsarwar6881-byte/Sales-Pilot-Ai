(function () {
  "use strict";

  // =====================================================
  // SALES PILOT WIDGET
  // =====================================================

  // -----------------------------------------------------
  // GET INSTALLATION SCRIPT
  // -----------------------------------------------------

  const script =
    document.currentScript ||
    document.querySelector(
      'script[data-profile]'
    );

  if (!script) {
    console.error(
      "Sales Pilot: Installation script not found."
    );

    return;
  }

  // -----------------------------------------------------
  // PROFILE ID
  // -----------------------------------------------------

  const profileId =
    script.getAttribute(
      "data-profile"
    );

  if (!profileId) {
    console.error(
      "Sales Pilot: data-profile is missing."
    );

    return;
  }

  // -----------------------------------------------------
  // API BASE
  // -----------------------------------------------------

  const API_BASE =
    script.getAttribute(
      "data-api"
    ) ||
    window.location.origin;

  console.log(
    "Sales Pilot: API Base:",
    API_BASE
  );

  console.log(
    "Sales Pilot: Profile ID:",
    profileId
  );

  // =====================================================
  // VISITOR SESSION
  // =====================================================

  let visitorSessionId = null;

  try {
    visitorSessionId =
      localStorage.getItem(
        "salespilot_visitor_session"
      );

    if (!visitorSessionId) {
      if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
          "function"
      ) {
        visitorSessionId =
          window.crypto.randomUUID();
      } else {
        visitorSessionId =
          "visitor_" +
          Date.now() +
          "_" +
          Math.random()
            .toString(36)
            .substring(2);
      }

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

    visitorSessionId =
      "visitor_" +
      Date.now();
  }

  // =====================================================
  // DEFAULT CONFIGURATION
  // =====================================================

  const defaultConfig = {
    // ---------------------------------------------------
    // Appearance
    // ---------------------------------------------------

    aiName:
      "Sales Pilot AI",

    welcomeMessage:
      "👋 Hi! How can I help you today?",

    brandColor:
      "#6366F1",

    position:
      "Bottom Right",

    theme:
      "Light",

    size:
      "Medium",

    radius:
      "Rounded",

    // ---------------------------------------------------
    // Behavior
    // ---------------------------------------------------

    autoOpen:
      false,

    showTypingIndicator:
      true,

    soundNotifications:
      false,

    showAiAvatar:
      true,

    collectVisitorName:
      false,

    collectVisitorEmail:
      false,

    enableAnimations:
      true,

    showPoweredBy:
      true,
  };

  // =====================================================
  // LOAD WIDGET CONFIGURATION
  // =====================================================

  async function loadWidgetConfig() {
    const url =
      `${API_BASE}/api/widget-config?profileId=${encodeURIComponent(
        profileId
      )}`;

    console.log(
      "Sales Pilot: Loading configuration:",
      url
    );

    try {
      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      console.log(
        "Sales Pilot: Config response:",
        response.status
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Sales Pilot: Widget config request failed:",
          errorText
        );

        return {
          ...defaultConfig,
        };
      }

      const config =
        await response.json();

      console.log(
        "Sales Pilot: Configuration received:",
        config
      );

      return {
        ...defaultConfig,
        ...config,
      };
    } catch (error) {
      console.error(
        "Sales Pilot: Failed to load widget configuration:",
        error
      );

      return {
        ...defaultConfig,
      };
    }
  }

  // =====================================================
  // INITIALIZE
  // =====================================================

  async function initializeWidget() {
    console.log(
      "Sales Pilot: Initializing widget..."
    );

    // ---------------------------------------------------
    // PREVENT DUPLICATE WIDGET
    // ---------------------------------------------------

    const existingWidget =
      document.getElementById(
        "salespilot-widget"
      );

    if (existingWidget) {
      console.warn(
        "Sales Pilot: Widget already exists."
      );

      return;
    }

    // ---------------------------------------------------
    // LOAD CONFIGURATION
    // ---------------------------------------------------

    const config =
      await loadWidgetConfig();

    console.log(
      "Sales Pilot: Final widget configuration:",
      config
    );

    createWidget(config);
  }

  // =====================================================
  // CREATE WIDGET
  // =====================================================

  function createWidget(config) {
    // ===================================================
    // APPEARANCE
    // ===================================================

    const aiName =
      config.aiName ||
      defaultConfig.aiName;

    const welcomeMessage =
      config.welcomeMessage ||
      defaultConfig.welcomeMessage;

    const brandColor =
      config.brandColor ||
      defaultConfig.brandColor;

    const position =
      config.position ||
      defaultConfig.position;

    const theme =
      config.theme ||
      defaultConfig.theme;

    const size =
      config.size ||
      defaultConfig.size;

    const radius =
      config.radius ||
      defaultConfig.radius;

    // ===================================================
    // BEHAVIOR
    // ===================================================

    const autoOpen =
      config.autoOpen === true;

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

    // ===================================================
    // NORMALIZE THEME
    // ===================================================

    const normalizedTheme =
      String(theme)
        .trim()
        .toLowerCase();

    const isDark =
      normalizedTheme === "dark";

    // ===================================================
    // POSITION
    // ===================================================

    let horizontalPosition =
      "right: 24px;";

    let verticalPosition =
      "bottom: 24px;";

    if (
      position ===
      "Bottom Left"
    ) {
      horizontalPosition =
        "left: 24px;";

      verticalPosition =
        "bottom: 24px;";
    }

    if (
      position ===
      "Top Right"
    ) {
      horizontalPosition =
        "right: 24px;";

      verticalPosition =
        "top: 24px;";
    }

    if (
      position ===
      "Top Left"
    ) {
      horizontalPosition =
        "left: 24px;";

      verticalPosition =
        "top: 24px;";
    }

    // ===================================================
    // SIZE
    // ===================================================

    let chatWidth =
      "360px";

    let chatHeight =
      "520px";

    let buttonSize =
      "60px";

    if (
      size === "Small"
    ) {
      chatWidth =
        "320px";

      chatHeight =
        "450px";

      buttonSize =
        "54px";
    }

    if (
      size === "Large"
    ) {
      chatWidth =
        "420px";

      chatHeight =
        "620px";

      buttonSize =
        "66px";
    }

    // ===================================================
    // RADIUS
    // ===================================================

    let chatRadius =
      "20px";

    if (
      radius === "Square"
    ) {
      chatRadius =
        "8px";
    }

    if (
      radius === "Soft"
    ) {
      chatRadius =
        "14px";
    }

    if (
      radius === "Pill"
    ) {
      chatRadius =
        "32px";
    }

    // ===================================================
    // THEME COLORS
    // ===================================================

    const chatBackground =
      isDark
        ? "#0f172a"
        : "#ffffff";

    const messagesBackground =
      isDark
        ? "#020617"
        : "#f8fafc";

    const aiMessageBackground =
      isDark
        ? "#1e293b"
        : "#ffffff";

    const aiMessageText =
      isDark
        ? "#f8fafc"
        : "#1e293b";

    const inputBackground =
      isDark
        ? "#1e293b"
        : "#ffffff";

    const inputText =
      isDark
        ? "#f8fafc"
        : "#0f172a";

    const inputBorder =
      isDark
        ? "#475569"
        : "#d1d5db";

    const mainBorder =
      isDark
        ? "#334155"
        : "#e5e7eb";

    const placeholderColor =
      isDark
        ? "#94a3b8"
        : "#64748b";

    const mutedText =
      isDark
        ? "#94a3b8"
        : "#64748b";

    // ===================================================
    // ANIMATION
    // ===================================================

    const transitionDuration =
      enableAnimations
        ? "0.2s"
        : "0s";

    // ===================================================
    // CREATE CONTAINER
    // ===================================================

    const container =
      document.createElement(
        "div"
      );

    container.id =
      "salespilot-widget";

    container.setAttribute(
      "data-profile",
      profileId
    );

    document.body.appendChild(
      container
    );

    // ===================================================
    // CREATE STYLES
    // ===================================================

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "salespilot-widget-styles";

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

      /* =========================================
         FLOATING BUTTON
      ========================================= */

      #salespilot-button {
        width:
          ${buttonSize};

        height:
          ${buttonSize};

        display:
          flex;

        align-items:
          center;

        justify-content:
          center;

        padding:
          0;

        border:
          none;

        border-radius:
          50%;

        background:
          ${brandColor};

        color:
          #ffffff;

        cursor:
          pointer;

        font-size:
          26px;

        line-height:
          1;

        box-shadow:
          0 10px 30px
          rgba(0, 0, 0, 0.25);

        transition:
          transform ${transitionDuration} ease,
          box-shadow ${transitionDuration} ease,
          opacity ${transitionDuration} ease;
      }

      #salespilot-button:hover {
        transform:
          ${
            enableAnimations
              ? "scale(1.05)"
              : "none"
          };

        box-shadow:
          0 14px 35px
          rgba(0, 0, 0, 0.30);
      }

      #salespilot-button:focus {
        outline:
          3px solid
          ${hexToRgba(
            brandColor,
            0.35
          )};

        outline-offset:
          3px;
      }

      /* =========================================
         CHAT
      ========================================= */

      #salespilot-chat {
        position: absolute;

        ${
          position.includes("Left")
            ? "left: 0;"
            : "right: 0;"
        }

        ${
          position.includes("Top")
            ? "top: 75px;"
            : "bottom: 75px;"
        }

        width:
          ${chatWidth};

        height:
          ${chatHeight};

        display:
          none;

        flex-direction:
          column;

        overflow:
          hidden;

        background:
          ${chatBackground};

        border:
          1px solid
          ${mainBorder};

        border-radius:
          ${chatRadius};

        box-shadow:
          0 20px 60px
          rgba(0, 0, 0, 0.25);

        ${
          enableAnimations
            ? `
              animation:
                salespilotOpen
                0.2s
                ease-out;
            `
            : ""
        }
      }

      ${
        enableAnimations
          ? `
            @keyframes salespilotOpen {

              from {
                opacity: 0;

                transform:
                  translateY(10px)
                  scale(0.98);
              }

              to {
                opacity: 1;

                transform:
                  translateY(0)
                  scale(1);
              }
            }

            @keyframes salespilotTyping {

              0% {
                opacity: 0.35;
              }

              50% {
                opacity: 1;
              }

              100% {
                opacity: 0.35;
              }
            }
          `
          : ""
      }

      /* =========================================
         HEADER
      ========================================= */

      #salespilot-header {
        flex-shrink:
          0;

        padding:
          18px;

        background:
          ${brandColor};

        color:
          #ffffff;
      }

      #salespilot-header-title {
        font-size:
          17px;

        font-weight:
          700;

        line-height:
          1.3;
      }

      #salespilot-header-subtitle {
        margin-top:
          4px;

        font-size:
          12px;

        line-height:
          1.3;

        color:
          rgba(
            255,
            255,
            255,
            0.85
          );
      }

      /* =========================================
         MESSAGES
      ========================================= */

      #salespilot-messages {
        flex:
          1;

        min-height:
          0;

        padding:
          16px;

        overflow-y:
          auto;

        background:
          ${messagesBackground};
      }

      .salespilot-message-row {
        display:
          flex;

        align-items:
          flex-start;

        gap:
          8px;

        margin-bottom:
          12px;
      }

      .salespilot-message {
        max-width:
          82%;

        padding:
          10px 13px;

        border-radius:
          14px;

        font-size:
          14px;

        line-height:
          1.45;

        word-break:
          break-word;
      }

      .salespilot-ai {
        margin-right:
          auto;

        background:
          ${aiMessageBackground};

        color:
          ${aiMessageText};

        border:
          1px solid
          ${mainBorder};
      }

      .salespilot-user {
        margin-left:
          auto;

        background:
          ${brandColor};

        color:
          #ffffff;

        border:
          1px solid
          transparent;
      }

      /* =========================================
         AVATAR
      ========================================= */

      .salespilot-avatar {
        width:
          30px;

        height:
          30px;

        flex-shrink:
          0;

        display:
          flex;

        align-items:
          center;

        justify-content:
          center;

        border-radius:
          50%;

        background:
          ${brandColor};

        color:
          #ffffff;

        font-size:
          15px;
      }

      /* =========================================
         TYPING
      ========================================= */

      .salespilot-typing {
        display:
          inline-flex;

        align-items:
          center;

        gap:
          4px;

        padding:
          11px 14px;

        border-radius:
          14px;

        background:
          ${aiMessageBackground};

        border:
          1px solid
          ${mainBorder};

        color:
          ${aiMessageText};
      }

      .salespilot-typing-dot {
        width:
          5px;

        height:
          5px;

        border-radius:
          50%;

        background:
          ${aiMessageText};

        ${
          enableAnimations
            ? `
              animation:
                salespilotTyping
                1.2s
                infinite;
            `
            : ""
        }
      }

      ${
        enableAnimations
          ? `
            .salespilot-typing-dot:nth-child(2) {
              animation-delay:
                0.15s;
            }

            .salespilot-typing-dot:nth-child(3) {
              animation-delay:
                0.30s;
            }
          `
          : ""
      }

      /* =========================================
         INPUT
      ========================================= */

      #salespilot-input-area {
        flex-shrink:
          0;

        display:
          flex;

        gap:
          8px;

        padding:
          12px;

        background:
          ${chatBackground};

        border-top:
          1px solid
          ${mainBorder};
      }

      #salespilot-input {
        min-width:
          0;

        flex:
          1;

        padding:
          10px 12px;

        border:
          1px solid
          ${inputBorder};

        border-radius:
          12px;

        outline:
          none;

        background:
          ${inputBackground};

        color:
          ${inputText};

        font-family:
          inherit;

        font-size:
          14px;
      }

      #salespilot-input::placeholder {
        color:
          ${placeholderColor};
      }

      #salespilot-input:focus {
        border-color:
          ${brandColor};

        box-shadow:
          0 0 0 3px
          ${hexToRgba(
            brandColor,
            0.15
          )};
      }

      #salespilot-send {
        width:
          42px;

        height:
          42px;

        flex-shrink:
          0;

        display:
          flex;

        align-items:
          center;

        justify-content:
          center;

        padding:
          0;

        border:
          none;

        border-radius:
          12px;

        background:
          ${brandColor};

        color:
          #ffffff;

        cursor:
          pointer;

        font-size:
          18px;

        line-height:
          1;
      }

      #salespilot-send:hover {
        opacity:
          0.9;
      }

      #salespilot-send:disabled {
        opacity:
          0.5;

        cursor:
          not-allowed;
      }

      /* =========================================
         VISITOR FORM
      ========================================= */

      #salespilot-visitor-form {
        position:
          absolute;

        inset:
          0;

        z-index:
          20;

        display:
          none;

        flex-direction:
          column;

        justify-content:
          center;

        padding:
          24px;

        background:
          ${chatBackground};

        color:
          ${aiMessageText};
      }

      #salespilot-visitor-form-title {
        margin-bottom:
          8px;

        font-size:
          20px;

        font-weight:
          700;
      }

      #salespilot-visitor-form-description {
        margin-bottom:
          20px;

        font-size:
          14px;

        line-height:
          1.5;

        color:
          ${mutedText};
      }

      .salespilot-form-field {
        margin-bottom:
          12px;
      }

      .salespilot-form-field label {
        display:
          block;

        margin-bottom:
          6px;

        font-size:
          13px;

        font-weight:
          600;
      }

      .salespilot-form-field input {
        width:
          100%;

        box-sizing:
          border-box;

        padding:
          11px 12px;

        border:
          1px solid
          ${inputBorder};

        border-radius:
          10px;

        outline:
          none;

        background:
          ${inputBackground};

        color:
          ${inputText};

        font-family:
          inherit;

        font-size:
          14px;
      }

      .salespilot-form-field input:focus {
        border-color:
          ${brandColor};

        box-shadow:
          0 0 0 3px
          ${hexToRgba(
            brandColor,
            0.12
          )};
      }

      #salespilot-start-chat {
        width:
          100%;

        padding:
          12px;

        margin-top:
          8px;

        border:
          none;

        border-radius:
          12px;

        background:
          ${brandColor};

        color:
          #ffffff;

        font-family:
          inherit;

        font-size:
          14px;

        font-weight:
          600;

        cursor:
          pointer;
      }

      /* =========================================
         POWERED BY
      ========================================= */

      #salespilot-powered-by {
        flex-shrink:
          0;

        padding:
          8px;

        text-align:
          center;

        font-size:
          10px;

        color:
          ${isDark
            ? "#64748b"
            : "#94a3b8"};

        background:
          ${chatBackground};

        border-top:
          1px solid
          ${mainBorder};
      }

      /* =========================================
         MOBILE
      ========================================= */

      @media (max-width: 480px) {

        #salespilot-widget {
          right:
            18px;

          left:
            auto;

          bottom:
            18px;

          top:
            auto;
        }

        #salespilot-chat {
          position:
            fixed;

          left:
            12px;

          right:
            12px;

          bottom:
            86px;

          width:
            calc(100vw - 24px);

          height:
            70vh;

          max-height:
            650px;
        }
      }
    `;

    document.head.appendChild(
      style
    );

    // ===================================================
    // CHAT HTML
    // ===================================================

    const chat =
      document.createElement(
        "div"
      );

    chat.id =
      "salespilot-chat";

    chat.innerHTML = `
      <div id="salespilot-header">

        <div id="salespilot-header-title">
          ${escapeHTML(aiName)}
        </div>

        <div id="salespilot-header-subtitle">
          AI Customer Support
        </div>

      </div>

      <div id="salespilot-messages">

        <div class="salespilot-message-row">

          ${
            showAiAvatar
              ? `
                <div class="salespilot-avatar">
                  🤖
                </div>
              `
              : ""
          }

          <div
            class="
              salespilot-message
              salespilot-ai
            "
          >
            ${escapeHTML(
              welcomeMessage
            )}
          </div>

        </div>

      </div>

      <div id="salespilot-input-area">

        <input
          id="salespilot-input"
          type="text"
          placeholder="Ask a question..."
          autocomplete="off"
        />

        <button
          id="salespilot-send"
          type="button"
          aria-label="Send message"
        >
          ↑
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
        collectVisitorName ||
        collectVisitorEmail
          ? `
            <div id="salespilot-visitor-form">

              <div id="salespilot-visitor-form-title">
                Before we start 👋
              </div>

              <div id="salespilot-visitor-form-description">
                Tell us a little about yourself so our AI can better assist you.
              </div>

              ${
                collectVisitorName
                  ? `
                    <div class="salespilot-form-field">

                      <label
                        for="salespilot-visitor-name"
                      >
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

                      <label
                        for="salespilot-visitor-email"
                      >
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

    container.appendChild(
      chat
    );

    // ===================================================
    // FLOATING BUTTON
    // ===================================================

    const button =
      document.createElement(
        "button"
      );

    button.id =
      "salespilot-button";

    button.type =
      "button";

    button.setAttribute(
      "aria-label",
      "Open Sales Pilot chat"
    );

    button.innerHTML =
      "💬";

    container.appendChild(
      button
    );

    // ===================================================
    // ELEMENTS
    // ===================================================

    const messages =
      chat.querySelector(
        "#salespilot-messages"
      );

    const input =
      chat.querySelector(
        "#salespilot-input"
      );

    const send =
      chat.querySelector(
        "#salespilot-send"
      );

    const visitorForm =
      chat.querySelector(
        "#salespilot-visitor-form"
      );

    const visitorNameInput =
      chat.querySelector(
        "#salespilot-visitor-name"
      );

    const visitorEmailInput =
      chat.querySelector(
        "#salespilot-visitor-email"
      );

    const startChatButton =
      chat.querySelector(
        "#salespilot-start-chat"
      );

    if (
      !messages ||
      !input ||
      !send
    ) {
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

    // ---------------------------------------------------
    // LOAD REMEMBERED VISITOR INFORMATION
    // ---------------------------------------------------

    try {
      customerName =
        localStorage.getItem(
          "salespilot_customer_name"
        );

      customerEmail =
        localStorage.getItem(
          "salespilot_customer_email"
        );
    } catch {
      customerName =
        null;

      customerEmail =
        null;
    }

    // ===================================================
    // CHECK VISITOR INFORMATION
    // ===================================================

    function needsVisitorInformation() {
      if (
        collectVisitorName &&
        !customerName
      ) {
        return true;
      }

      if (
        collectVisitorEmail &&
        !customerEmail
      ) {
        return true;
      }

      return false;
    }

    // ===================================================
    // SHOW VISITOR FORM
    // ===================================================

    function showVisitorForm() {
      if (!visitorForm) {
        return;
      }

      visitorForm.style.display =
        "flex";

      if (
        collectVisitorName &&
        !customerName &&
        visitorNameInput
      ) {
        setTimeout(
          function () {
            visitorNameInput.focus();
          },
          50
        );

        return;
      }

      if (
        collectVisitorEmail &&
        !customerEmail &&
        visitorEmailInput
      ) {
        setTimeout(
          function () {
            visitorEmailInput.focus();
          },
          50
        );
      }
    }

    // ===================================================
    // HIDE VISITOR FORM
    // ===================================================

    function hideVisitorForm() {
      if (!visitorForm) {
        return;
      }

      visitorForm.style.display =
        "none";
    }

    // ===================================================
    // SAVE VISITOR INFORMATION
    // ===================================================

    function saveVisitorInformation() {
      try {
        if (
          customerName
        ) {
          localStorage.setItem(
            "salespilot_customer_name",
            customerName
          );
        }

        if (
          customerEmail
        ) {
          localStorage.setItem(
            "salespilot_customer_email",
            customerEmail
          );
        }
      } catch {
        // Ignore storage errors.
      }
    }

    // ===================================================
    // START CHAT
    // ===================================================

    function startChat() {
      // -----------------------------------------------
      // NAME
      // -----------------------------------------------

      if (
        collectVisitorName &&
        !customerName
      ) {
        customerName =
          visitorNameInput
            ? visitorNameInput.value.trim()
            : "";

        if (!customerName) {
          alert(
            "Please enter your name."
          );

          if (visitorNameInput) {
            visitorNameInput.focus();
          }

          return;
        }
      }

      // -----------------------------------------------
      // EMAIL
      // -----------------------------------------------

      if (
        collectVisitorEmail &&
        !customerEmail
      ) {
        customerEmail =
          visitorEmailInput
            ? visitorEmailInput.value.trim()
            : "";

        if (!customerEmail) {
          alert(
            "Please enter your email address."
          );

          if (visitorEmailInput) {
            visitorEmailInput.focus();
          }

          return;
        }

        const emailValid =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            customerEmail
          );

        if (!emailValid) {
          alert(
            "Please enter a valid email address."
          );

          if (visitorEmailInput) {
            visitorEmailInput.focus();
          }

          return;
        }
      }

      // -----------------------------------------------
      // SAVE
      // -----------------------------------------------

      saveVisitorInformation();

      hideVisitorForm();

      setTimeout(
        function () {
          input.focus();
        },
        50
      );
    }

    if (startChatButton) {
      startChatButton.addEventListener(
        "click",
        startChat
      );
    }

    // ===================================================
    // SOUND
    // ===================================================

    function playNotificationSound() {
      if (
        !soundNotifications
      ) {
        return;
      }

      try {
        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContext) {
          return;
        }

        const audioContext =
          new AudioContext();

        const oscillator =
          audioContext.createOscillator();

        const gain =
          audioContext.createGain();

        oscillator.type =
          "sine";

        oscillator.frequency.setValueAtTime(
          660,
          audioContext.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          880,
          audioContext.currentTime +
            0.12
        );

        gain.gain.setValueAtTime(
          0.0001,
          audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.08,
          audioContext.currentTime +
            0.02
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime +
            0.16
        );

        oscillator.connect(
          gain
        );

        gain.connect(
          audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
          audioContext.currentTime +
            0.16
        );

        setTimeout(
          function () {
            audioContext.close();
          },
          300
        );
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
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "salespilot-message-row";

      row.id =
        "salespilot-typing-row";

      if (
        showAiAvatar
      ) {
        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "salespilot-avatar";

        avatar.textContent =
          "🤖";

        row.appendChild(
          avatar
        );
      }

      const typing =
        document.createElement(
          "div"
        );

      typing.className =
        "salespilot-typing";

      typing.innerHTML = `
        <span
          class="salespilot-typing-dot"
        ></span>

        <span
          class="salespilot-typing-dot"
        ></span>

        <span
          class="salespilot-typing-dot"
        ></span>
      `;

      row.appendChild(
        typing
      );

      messages.appendChild(
        row
      );

      messages.scrollTop =
        messages.scrollHeight;

      return row;
    }

    // ===================================================
    // ADD MESSAGE
    // ===================================================

    function addMessage(
      text,
      sender
    ) {
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "salespilot-message-row";

      if (
        sender === "ai" &&
        showAiAvatar
      ) {
        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "salespilot-avatar";

        avatar.textContent =
          "🤖";

        row.appendChild(
          avatar
        );
      }

      const message =
        document.createElement(
          "div"
        );

      message.className =
        "salespilot-message " +
        (
          sender === "user"
            ? "salespilot-user"
            : "salespilot-ai"
        );

      message.textContent =
        String(text);

      row.appendChild(
        message
      );

      messages.appendChild(
        row
      );

      messages.scrollTop =
        messages.scrollHeight;

      if (
        sender === "ai"
      ) {
        playNotificationSound();
      }

      return row;
    }

    // ===================================================
    // SEND MESSAGE
    // ===================================================

    async function sendMessage() {
      const message =
        input.value.trim();

      if (!message) {
        return;
      }

      // -------------------------------------------------
      // COLLECT INFORMATION FIRST
      // -------------------------------------------------

      if (
        needsVisitorInformation()
      ) {
        showVisitorForm();

        return;
      }

      // -------------------------------------------------
      // USER MESSAGE
      // -------------------------------------------------

      input.value =
        "";

      addMessage(
        message,
        "user"
      );

      send.disabled =
        true;

      // -------------------------------------------------
      // TYPING
      // -------------------------------------------------

      let typingIndicator =
        null;

      let loadingMessage =
        null;

      if (
        showTypingIndicator
      ) {
        typingIndicator =
          createTypingIndicator();
      } else {
        loadingMessage =
          addMessage(
            "Thinking...",
            "ai"
          );
      }

      try {
        // -----------------------------------------------
        // API REQUEST
        // -----------------------------------------------

        const response =
          await fetch(
            `${API_BASE}/api/chat`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  message,

                  profileId,

                  visitorSessionId,

                  customerName,

                  customerEmail,
                }),
            }
          );

        let data = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        // -----------------------------------------------
        // REMOVE LOADING
        // -----------------------------------------------

        if (
          typingIndicator
        ) {
          typingIndicator.remove();
        }

        if (
          loadingMessage
        ) {
          loadingMessage.remove();
        }

        // -----------------------------------------------
        // API ERROR
        // -----------------------------------------------

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Chat request failed."
          );
        }

        // -----------------------------------------------
        // SESSION
        // -----------------------------------------------

        if (
          data.visitorSessionId
        ) {
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

        // -----------------------------------------------
        // RESPONSE
        // -----------------------------------------------

        addMessage(
          data.response ||
            "Sorry, I couldn't answer that.",
          "ai"
        );
      } catch (error) {
        console.error(
          "Sales Pilot chat error:",
          error
        );

        if (
          typingIndicator
        ) {
          typingIndicator.remove();
        }

        if (
          loadingMessage
        ) {
          loadingMessage.remove();
        }

        addMessage(
          "Sorry, something went wrong. Please try again.",
          "ai"
        );
      } finally {
        send.disabled =
          false;

        input.focus();
      }
    }

    // ===================================================
    // OPEN / CLOSE
    // ===================================================

    let opened =
      false;

    function openWidget() {
      if (opened) {
        return;
      }

      opened =
        true;

      chat.style.display =
        "flex";

      button.innerHTML =
        "×";

      button.setAttribute(
        "aria-label",
        "Close Sales Pilot chat"
      );

      // -----------------------------------------------
      // SHOW VISITOR FORM
      // -----------------------------------------------

      if (
        needsVisitorInformation()
      ) {
        showVisitorForm();

        return;
      }

      // -----------------------------------------------
      // FOCUS INPUT
      // -----------------------------------------------

      setTimeout(
        function () {
          input.focus();
        },
        50
      );
    }

    function closeWidget() {
      if (!opened) {
        return;
      }

      opened =
        false;

      chat.style.display =
        "none";

      button.innerHTML =
        "💬";

      button.setAttribute(
        "aria-label",
        "Open Sales Pilot chat"
      );
    }

    button.addEventListener(
      "click",
      function () {
        if (opened) {
          closeWidget();
        } else {
          openWidget();
        }
      }
    );

    // ===================================================
    // SEND BUTTON
    // ===================================================

    send.addEventListener(
      "click",
      sendMessage
    );

    // ===================================================
    // ENTER KEY
    // ===================================================

    input.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();

          sendMessage();
        }
      }
    );

    // ===================================================
    // AUTO OPEN
    // ===================================================

    if (
      autoOpen
    ) {
      setTimeout(
        function () {
          openWidget();
        },
        enableAnimations
          ? 700
          : 0
      );
    }

    // ===================================================
    // DEBUG
    // =====================================================

    console.log(
      "Sales Pilot widget initialized successfully:",
      {
        profileId,

        appearance: {
          aiName,
          welcomeMessage,
          brandColor,
          position,
          theme,
          size,
          radius,
        },

        behavior: {
          autoOpen,
          showTypingIndicator,
          soundNotifications,
          showAiAvatar,
          collectVisitorName,
          collectVisitorEmail,
          enableAnimations,
          showPoweredBy,
        },

        visitor: {
          customerName,
          customerEmail,
          visitorSessionId,
        },
      }
    );
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  function escapeHTML(
    value
  ) {
    const div =
      document.createElement(
        "div"
      );

    div.textContent =
      String(value);

    return div.innerHTML;
  }

  // =====================================================
  // HEX → RGBA
  // =====================================================

  function hexToRgba(
    hex,
    alpha
  ) {
    if (
      typeof hex !==
      "string"
    ) {
      return `rgba(99, 102, 241, ${alpha})`;
    }

    let clean =
      hex
        .replace(
          "#",
          ""
        )
        .trim();

    if (
      clean.length ===
      3
    ) {
      clean =
        clean
          .split("")
          .map(
            function (char) {
              return (
                char +
                char
              );
            }
          )
          .join("");
    }

    if (
      clean.length !==
      6
    ) {
      return `rgba(99, 102, 241, ${alpha})`;
    }

    const number =
      parseInt(
        clean,
        16
      );

    const r =
      (number >> 16) &
      255;

    const g =
      (number >> 8) &
      255;

    const b =
      number & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // =====================================================
  // START WIDGET
  // =====================================================

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeWidget,
      {
        once: true,
      }
    );
  } else {
    initializeWidget();
  }
})();