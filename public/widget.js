/**
 * Sales Pilot AI — External Website Widget Embed Script
 * 
 * Lightweight, zero-dependency embed script that injects an isolated iframe
 * container to deliver the AI sales and support agent without host CSS/JS collisions.
 */
(function () {
  "use strict";

  // Prevent duplicate initialization
  if (window.__SalesPilotInitialized) {
    return;
  }

  // 1. Locate own script element and read configuration attributes
  const currentScript =
    document.currentScript ||
    document.querySelector("script[data-widget-id]") ||
    document.querySelector("script[data-profile]");

  if (!currentScript) {
    console.warn("Sales Pilot: Embed script element not found.");
    return;
  }

  const widgetId =
    currentScript.getAttribute("data-widget-id") ||
    currentScript.getAttribute("data-profile");

  if (!widgetId) {
    console.warn("Sales Pilot: data-widget-id attribute is required.");
    return;
  }

  // Determine Sales Pilot host origin dynamically from script.src or data-api
  let hostOrigin = "";
  try {
    const customApi = currentScript.getAttribute("data-api");
    if (customApi) {
      hostOrigin = new URL(customApi).origin;
    } else if (currentScript.src) {
      hostOrigin = new URL(currentScript.src).origin;
    }
  } catch (err) {
    hostOrigin = window.location.origin;
  }

  if (!hostOrigin) {
    hostOrigin = window.location.origin;
  }

  // 2. Manage visitor session in host-page localStorage for cross-page persistence
  const sessionKey = "salespilot_session_" + widgetId;
  let visitorSessionId = "";
  try {
    visitorSessionId = localStorage.getItem(sessionKey) || "";
    if (!visitorSessionId) {
      visitorSessionId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "sp_sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(sessionKey, visitorSessionId);
    }
  } catch (storageErr) {
    visitorSessionId = "sp_sess_" + Date.now();
  }

  window.__SalesPilotInitialized = true;

  // 3. Initialize widget container and iframe once DOM is ready
  function initWidget() {
    if (document.getElementById("salespilot-widget-container")) {
      return;
    }

    // Floating container styles
    const container = document.createElement("div");
    container.id = "salespilot-widget-container";

    // Base launcher dimensions
    const CLOSED_WIDTH = "88px";
    const CLOSED_HEIGHT = "88px";
    const OPEN_DESKTOP_WIDTH = "440px";
    const OPEN_DESKTOP_HEIGHT = "720px";

    let currentPosition = "Bottom Right";
    let isWidgetOpen = false;

    function applyContainerStyles(open, position) {
      isWidgetOpen = open;
      currentPosition = position || currentPosition;

      const isLeft = currentPosition === "Bottom Left";
      const isMobile = window.innerWidth < 640;

      container.style.position = "fixed";
      container.style.zIndex = "2147483647";
      container.style.border = "none";
      container.style.background = "transparent";
      container.style.overflow = "visible";
      container.style.boxSizing = "border-box";
      container.style.pointerEvents = "none"; // Let clicks pass through outside iframe elements
      container.style.transition = "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)";

      if (open) {
        if (isMobile) {
          container.style.width = "100%";
          container.style.height = "100%";
          container.style.top = "0";
          container.style.left = "0";
          container.style.right = "0";
          container.style.bottom = "0";
          container.style.maxWidth = "100vw";
          container.style.maxHeight = "100vh";
        } else {
          container.style.top = "auto";
          container.style.width = OPEN_DESKTOP_WIDTH;
          container.style.height = OPEN_DESKTOP_HEIGHT;
          container.style.maxWidth = "calc(100vw - 32px)";
          container.style.maxHeight = "calc(100vh - 32px)";
          container.style.bottom = "16px";
          if (isLeft) {
            container.style.left = "16px";
            container.style.right = "auto";
          } else {
            container.style.right = "16px";
            container.style.left = "auto";
          }
        }
      } else {
        container.style.top = "auto";
        container.style.width = CLOSED_WIDTH;
        container.style.height = CLOSED_HEIGHT;
        container.style.maxWidth = "none";
        container.style.maxHeight = "none";
        container.style.bottom = "16px";
        if (isLeft) {
          container.style.left = "16px";
          container.style.right = "auto";
        } else {
          container.style.right = "16px";
          container.style.left = "auto";
        }
      }
    }

    applyContainerStyles(false, "Bottom Right");

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.id = "salespilot-widget-iframe";
    iframe.title = "Sales Pilot Customer Support";

    const iframeParams = new URLSearchParams();
    if (visitorSessionId) iframeParams.set("visitorSessionId", visitorSessionId);
    try {
      iframeParams.set("parentOrigin", window.location.origin);
      iframeParams.set("host", window.location.hostname);
    } catch {}

    iframe.src = `${hostOrigin}/widget/${encodeURIComponent(widgetId)}?${iframeParams.toString()}`;

    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.background = "transparent";
    iframe.style.colorScheme = "normal";
    iframe.style.pointerEvents = "auto"; // Iframe receives clicks
    iframe.setAttribute("allow", "clipboard-write; autoplay");

    container.appendChild(iframe);
    document.body.appendChild(container);

    // 4. Secure postMessage listener
    window.addEventListener("message", function (event) {
      // Validate origin
      if (event.origin !== hostOrigin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      if (data.type === "salespilot:state") {
        applyContainerStyles(Boolean(data.open), data.position);
      } else if (data.type === "salespilot:session" && data.visitorSessionId) {
        try {
          localStorage.setItem(sessionKey, data.visitorSessionId);
        } catch {}
      }
    });

    // 5. Expose public helper for staff console launch
    window.SalesPilot = window.SalesPilot || {};
    window.SalesPilot.openConsole = function () {
      var consoleUrl =
        hostOrigin +
        "/widget/console/" +
        encodeURIComponent(widgetId) +
        "?parentOrigin=" +
        encodeURIComponent(window.location.origin);
      return window.open(
        consoleUrl,
        "SalesPilotConsole",
        "width=1200,height=800,menubar=no,toolbar=no,status=no,resizable=yes"
      );
    };

    // 6. Optional staff support console trigger (data-console="true")
    if (currentScript.getAttribute("data-console") === "true") {
      var consoleBtn = document.createElement("button");
      consoleBtn.id = "salespilot-staff-console-btn";
      consoleBtn.innerHTML = "🎧 Support Console";
      consoleBtn.style.position = "fixed";
      consoleBtn.style.bottom = "16px";
      consoleBtn.style.left = "16px";
      consoleBtn.style.zIndex = "2147483646";
      consoleBtn.style.padding = "10px 16px";
      consoleBtn.style.backgroundColor = "#1e1b4b";
      consoleBtn.style.color = "#c7d2fe";
      consoleBtn.style.border = "1px solid #4338ca";
      consoleBtn.style.borderRadius = "12px";
      consoleBtn.style.fontSize = "12px";
      consoleBtn.style.fontWeight = "600";
      consoleBtn.style.cursor = "pointer";
      consoleBtn.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
      consoleBtn.style.fontFamily = "system-ui, -apple-system, sans-serif";
      consoleBtn.onclick = function () {
        window.SalesPilot.openConsole();
      };
      document.body.appendChild(consoleBtn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
})();
