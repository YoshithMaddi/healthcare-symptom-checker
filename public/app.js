const form = document.querySelector("#symptom-form");
const textarea = document.querySelector("#symptoms");
const submitButton = document.querySelector("#submit-button");
const results = document.querySelector("#results");
const historyContainer = document.querySelector("#history");
const refreshHistoryButton = document.querySelector("#refresh-history");
const requestStatus = document.querySelector("#request-status");
const promptButtons = document.querySelectorAll("[data-prompt]");

const severityLabels = {
  self_care: "Low",
  see_doctor_soon: "Moderate",
  urgent: "High",
  emergency: "Critical"
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderConditions(conditions) {
  return conditions
    .map(
      (condition) => `
        <article class="condition">
          <div class="condition-top">
            <h3>${escapeHtml(condition.name)}</h3>
            <span>${escapeHtml(condition.likelihood.replaceAll("_", " "))}</span>
          </div>
          <p>${escapeHtml(condition.reasoning)}</p>
        </article>
      `
    )
    .join("");
}

function renderResult(payload) {
  const triageTone = payload.triageLevel === "emergency"
    ? "danger"
    : payload.triageLevel === "urgent"
      ? "warn"
      : "safe";

  results.classList.remove("hidden");
  results.classList.add("result-flash");
  results.innerHTML = `
    <div class="result-header ${triageTone}">
      <div>
        <p class="eyebrow">Issue severity</p>
        <h2>${escapeHtml(payload.severityLabel || payload.triageLevel.replaceAll("_", " "))}</h2>
        <p class="severity-note">${escapeHtml(payload.severityDescription || "")}</p>
      </div>
    </div>
    <h3>Probable conditions</h3>
    <div class="conditions">${renderConditions(payload.probableConditions)}</div>
    <h3>Recommended next steps</h3>
    ${renderList(payload.recommendedNextSteps)}
    <h3>When to seek care</h3>
    ${renderList(payload.whenToSeekCare)}
    <h3>Red flags</h3>
    ${payload.redFlags.length ? renderList(payload.redFlags) : "<p>No obvious red-flag terms were detected from the text provided, but this does not rule out risk.</p>"}
  `;

  window.setTimeout(() => {
    results.classList.remove("result-flash");
  }, 1600);
}

function renderHistory(items) {
  if (!items.length) {
    historyContainer.innerHTML = "<p class=\"muted\">No saved checks yet.</p>";
    return;
  }

  historyContainer.innerHTML = items
    .map(
      (item) => `
        <article class="history-item">
          <div class="history-top">
            <strong>${escapeHtml(severityLabels[item.triageLevel || item.triage_level] || "Unknown")}</strong>
            <span>${new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <p>${escapeHtml(item.symptoms)}</p>
        </article>
      `
    )
    .join("");
}

async function loadHistory() {
  const response = await fetch("/api/history");
  const payload = await response.json();
  renderHistory(payload.items || []);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Generating response...";
  requestStatus.classList.remove("hidden");
  requestStatus.className = "request-status loading";
  requestStatus.textContent = "Generating response. Please wait...";

  try {
    const response = await fetch("/api/check-symptoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ symptoms: textarea.value })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to analyze symptoms.");
    }

    renderResult(payload);
    textarea.value = "";
    requestStatus.className = "request-status success";
    requestStatus.textContent = "Response generated successfully.";
    results.scrollIntoView({ behavior: "smooth", block: "start" });
    await loadHistory();
  } catch (error) {
    results.classList.remove("hidden");
    results.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
    requestStatus.className = "request-status error-banner";
    requestStatus.textContent = `Unable to generate response: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Analyze symptoms";
  }
});

refreshHistoryButton.addEventListener("click", loadHistory);
promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    textarea.value = button.dataset.prompt || "";
    textarea.focus();
  });
});

loadHistory();
