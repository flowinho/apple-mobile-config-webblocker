(function () {
  const STORAGE_KEY = "profilgenerator-theme";

  const defaults = {
    profileName: "Web Blocklist",
    organization: "Lokaler Generator",
    description:
      "Blockiert ausgewählte Websites über einen Web-Content-Filter-Payload für betreute oder passend verwaltete Apple-Geräte."
  };

  const exampleUrls = [
    "tagesschau.de",
    "spiegel.de",
    "zeit.de",
    "macrumors.com",
    "macstories.net",
    "9to5mac.com",
    "9to5google.com",
    "news.ycombinator.com",
    "giga.de",
    "heise.de",
    "golem.de",
    "lkz.de",
    "ebay.de",
    "amazon.de",
    "amazon.com",
    "twitter.com",
    "mastodon.social",
    "instagram.com",
    "idealo.de",
    "saturn.de",
    "mediamarkt.de"
  ];

  const elements = {
    form: document.getElementById("generator-form"),
    urlsInput: document.getElementById("urls-input"),
    profileName: document.getElementById("profile-name"),
    organization: document.getElementById("organization-name"),
    description: document.getElementById("profile-description"),
    acceptedList: document.getElementById("accepted-list"),
    acceptedEmpty: document.getElementById("accepted-empty"),
    invalidList: document.getElementById("invalid-list"),
    invalidEmpty: document.getElementById("invalid-empty"),
    xmlPreview: document.getElementById("xml-preview"),
    urlsStatus: document.getElementById("urls-status"),
    exampleButton: document.getElementById("example-button"),
    clearButton: document.getElementById("clear-button"),
    downloadButton: document.getElementById("download-button"),
    copyButton: document.getElementById("copy-button"),
    themeToggle: document.getElementById("theme-toggle")
  };

  let currentXml = "";
  let currentFileName = "web-blocklist.mobileconfig";

  function initialize() {
    applyInitialTheme();
    applyDefaultValues();
    attachEvents();
    renderState(buildEmptyState());
  }

  function applyDefaultValues() {
    elements.profileName.value = defaults.profileName;
    elements.organization.value = defaults.organization;
    elements.description.value = defaults.description;
  }

  function attachEvents() {
    elements.form.addEventListener("submit", handleGenerate);
    elements.exampleButton.addEventListener("click", handleInsertExamples);
    elements.clearButton.addEventListener("click", handleClearUrls);
    elements.downloadButton.addEventListener("click", handleDownload);
    elements.copyButton.addEventListener("click", handleCopy);
    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.urlsInput.addEventListener("input", handleLiveParse);

    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreferredTheme = function () {
      if (!getStoredTheme()) {
        applyTheme(getPreferredTheme());
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPreferredTheme);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(syncPreferredTheme);
    }
  }

  function buildEmptyState() {
    return {
      acceptedEntries: [],
      invalidEntries: [],
      xml: "",
      fileName: "web-blocklist.mobileconfig",
      message: "Noch keine Daten generiert."
    };
  }

  function handleLiveParse() {
    const parsed = parseUrlEntries(elements.urlsInput.value);
    renderLists(parsed.acceptedEntries, parsed.invalidEntries);
    updateStatus(parsed.acceptedEntries.length, parsed.invalidEntries.length);
  }

  function handleGenerate(event) {
    event.preventDefault();

    const parsed = parseUrlEntries(elements.urlsInput.value);
    renderLists(parsed.acceptedEntries, parsed.invalidEntries);
    updateStatus(parsed.acceptedEntries.length, parsed.invalidEntries.length);

    if (parsed.acceptedEntries.length === 0) {
      currentXml = "";
      currentFileName = "web-blocklist.mobileconfig";
      elements.xmlPreview.textContent =
        "Mindestens eine gültige URL oder ein Host-Muster ist erforderlich.";
      setActionState(false);
      return;
    }

    const metadata = collectMetadata();
    currentXml = buildMobileconfigXml(metadata, parsed.acceptedEntries);
    currentFileName = createFileName(metadata.profileName);
    elements.xmlPreview.textContent = currentXml;
    setActionState(true);
  }

  function handleInsertExamples() {
    const currentLines = elements.urlsInput.value
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    const merged = Array.from(new Set(currentLines.concat(exampleUrls)));
    elements.urlsInput.value = merged.join("\n");
    handleLiveParse();
  }

  function handleClearUrls() {
    elements.urlsInput.value = "";
    currentXml = "";
    currentFileName = "web-blocklist.mobileconfig";
    renderState(buildEmptyState());
    updateStatus(0, 0);
  }

  function handleDownload() {
    if (!currentXml) {
      return;
    }

    const blob = new Blob([currentXml], {
      type: "application/x-apple-aspen-config;charset=utf-8"
    });

    triggerDownload(blob, currentFileName);
  }

  async function handleCopy() {
    if (!currentXml) {
      return;
    }

    try {
      await navigator.clipboard.writeText(currentXml);
      elements.copyButton.textContent = "XML kopiert";
      window.setTimeout(function () {
        elements.copyButton.textContent = "XML kopieren";
      }, 1800);
    } catch (error) {
      elements.copyButton.textContent = "Kopieren fehlgeschlagen";
      window.setTimeout(function () {
        elements.copyButton.textContent = "XML kopieren";
      }, 1800);
    }
  }

  function collectMetadata() {
    const profileName = cleanMetadataValue(elements.profileName.value, defaults.profileName);
    const organization = cleanMetadataValue(
      elements.organization.value,
      defaults.organization
    );
    const description = cleanMetadataValue(
      elements.description.value,
      defaults.description
    );

    return {
      profileName,
      organization,
      description
    };
  }

  function cleanMetadataValue(value, fallback) {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  function parseUrlEntries(rawInput) {
    const lines = rawInput.split(/\r?\n/);
    const acceptedEntries = [];
    const invalidEntries = [];
    const seen = new Set();

    lines.forEach(function (line, index) {
      const trimmed = line.trim();

      if (!trimmed) {
        return;
      }

      const normalized = normalizeUrlEntry(trimmed);

      if (!normalized.valid) {
        invalidEntries.push({
          lineNumber: index + 1,
          original: trimmed,
          reason: normalized.reason
        });
        return;
      }

      if (seen.has(normalized.value)) {
        return;
      }

      seen.add(normalized.value);
      acceptedEntries.push(normalized.value);
    });

    return {
      acceptedEntries,
      invalidEntries
    };
  }

  function normalizeUrlEntry(input) {
    const candidate = input.trim();

    if (!candidate) {
      return { valid: false, reason: "Leer nach Bereinigung." };
    }

    if (/\s/.test(candidate)) {
      return {
        valid: false,
        reason: "Innere Leerzeichen sind in URL-Einträgen nicht zulässig."
      };
    }

    if (/[<>"']/.test(candidate)) {
      return {
        valid: false,
        reason: "Enthält Zeichen, die nicht in ein XML-Profil gehören."
      };
    }

    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate);
    const parseCandidate = hasScheme ? candidate : "https://" + candidate;

    let parsedUrl;
    try {
      parsedUrl = new URL(parseCandidate);
    } catch (error) {
      return { valid: false, reason: "Kein parsebarer URL- oder Host-Eintrag." };
    }

    const host = parsedUrl.hostname.toLowerCase();

    if (!host || !isLikelyHost(host)) {
      return {
        valid: false,
        reason: "Es wurde kein plausibler Host erkannt."
      };
    }

    const path = parsedUrl.pathname === "/" ? "" : parsedUrl.pathname;
    const query = parsedUrl.search || "";
    const normalizedValue = host + path + query;

    return {
      valid: true,
      value: normalizedValue
    };
  }

  function isLikelyHost(host) {
    return /^[a-z0-9.-]+$/.test(host) && host.includes(".") && !host.startsWith(".") && !host.endsWith(".");
  }

  function buildMobileconfigXml(metadata, deniedUrls) {
    const rootUuid = generateUuid();
    const payloadUuid = generateUuid();
    const contentFilterUuid = generateUuid();
    const safeProfileName = xmlEscape(metadata.profileName);
    const safeDescription = xmlEscape(metadata.description);
    const safeOrganization = xmlEscape(metadata.organization);
    const identifierBase = createIdentifier(metadata.profileName);
    const deniedArray = deniedUrls
      .map(function (entry) {
        return "        <string>" + xmlEscape(entry) + "</string>";
      })
      .join("\n");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      "<dict>",
      "  <key>PayloadContent</key>",
      "  <array>",
      "    <dict>",
      "      <key>PayloadType</key>",
      "      <string>com.apple.webcontent-filter</string>",
      "      <key>PayloadVersion</key>",
      "      <integer>1</integer>",
      "      <key>PayloadIdentifier</key>",
      "      <string>" + xmlEscape(identifierBase + ".payload") + "</string>",
      "      <key>PayloadUUID</key>",
      "      <string>" + payloadUuid + "</string>",
      "      <key>PayloadDisplayName</key>",
      "      <string>" + safeProfileName + " Web Filter</string>",
      "      <key>PayloadDescription</key>",
      "      <string>" + safeDescription + "</string>",
      "      <key>PayloadOrganization</key>",
      "      <string>" + safeOrganization + "</string>",
      "      <key>FilterType</key>",
      "      <string>BuiltIn</string>",
      "      <key>ContentFilterUUID</key>",
      "      <string>" + contentFilterUuid + "</string>",
      "      <key>DenyListURLs</key>",
      "      <array>",
      deniedArray,
      "      </array>",
      "    </dict>",
      "  </array>",
      "  <key>PayloadDisplayName</key>",
      "  <string>" + safeProfileName + "</string>",
      "  <key>PayloadDescription</key>",
      "  <string>" + safeDescription + "</string>",
      "  <key>PayloadIdentifier</key>",
      "  <string>" + xmlEscape(identifierBase) + "</string>",
      "  <key>PayloadOrganization</key>",
      "  <string>" + safeOrganization + "</string>",
      "  <key>PayloadRemovalDisallowed</key>",
      "  <false/>",
      "  <key>PayloadType</key>",
      "  <string>Configuration</string>",
      "  <key>PayloadUUID</key>",
      "  <string>" + rootUuid + "</string>",
      "  <key>PayloadVersion</key>",
      "  <integer>1</integer>",
      "</dict>",
      "</plist>"
    ].join("\n");
  }

  function createIdentifier(profileName) {
    const slug = profileName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.{2,}/g, ".");

    return "local.webblock." + (slug || "profile");
  }

  function createFileName(profileName) {
    const slug = profileName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);

    return (slug || "web-blocklist") + ".mobileconfig";
  }

  function generateUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID().toUpperCase();
    }

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ]
      .join("-")
      .toUpperCase();
  }

  function xmlEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function triggerDownload(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function renderState(state) {
    renderLists(state.acceptedEntries, state.invalidEntries);
    elements.xmlPreview.textContent = state.message || state.xml;
    setActionState(Boolean(state.xml));
  }

  function renderLists(acceptedEntries, invalidEntries) {
    renderAcceptedEntries(acceptedEntries);
    renderInvalidEntries(invalidEntries);
  }

  function renderAcceptedEntries(entries) {
    elements.acceptedList.innerHTML = "";
    elements.acceptedEmpty.hidden = entries.length > 0;

    entries.forEach(function (entry) {
      const item = document.createElement("li");
      item.textContent = entry;
      elements.acceptedList.appendChild(item);
    });
  }

  function renderInvalidEntries(entries) {
    elements.invalidList.innerHTML = "";
    elements.invalidEmpty.hidden = entries.length > 0;

    entries.forEach(function (entry) {
      const item = document.createElement("li");
      const reason = document.createElement("span");
      item.textContent = "Zeile " + entry.lineNumber + ": " + entry.original;
      reason.className = "invalid-reason";
      reason.textContent = entry.reason;
      item.appendChild(reason);
      elements.invalidList.appendChild(item);
    });
  }

  function updateStatus(validCount, invalidCount) {
    if (validCount === 0 && invalidCount === 0) {
      elements.urlsStatus.textContent = "Noch keine Eingaben vorhanden.";
      return;
    }

    elements.urlsStatus.textContent =
      validCount +
      " gültige Einträge, " +
      invalidCount +
      " ungültige Zeilen.";
  }

  function setActionState(enabled) {
    elements.downloadButton.disabled = !enabled;
    elements.copyButton.disabled = !enabled;
  }

  function getPreferredTheme() {
    if (!window.matchMedia) {
      return "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyInitialTheme() {
    const storedTheme = getStoredTheme();
    applyTheme(storedTheme || getPreferredTheme());
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    elements.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    elements.themeToggle.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || getPreferredTheme();
    const next = current === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
  }

  function getStoredTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return "";
    }
  }

  function setStoredTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      return;
    }
  }

  initialize();
})();
