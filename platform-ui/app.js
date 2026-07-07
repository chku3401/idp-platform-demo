const SERVICE_NAME_PATTERN = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

const FIELD_RULES = {
  service_name: {
    pattern: SERVICE_NAME_PATTERN,
    message: "lowercase letters, numbers, hyphens (e.g. payment-api)",
  },
  team: {
    pattern: SLUG_PATTERN,
    message: "lowercase slug (e.g. payments)",
  },
  namespace: {
    pattern: SLUG_PATTERN,
    message: "lowercase slug (e.g. payments-dev)",
  },
};

const SOURCE_FILES = {
  java: ["pom.xml", "src/main/java/com/example/service/Application.java", "src/main/resources/application.properties"],
  node: ["package.json", "index.js", "test/health.test.js"],
  python: ["requirements.txt", "main.py", "tests/test_health.py"],
};

const GRAFANA_URL = "http://localhost:3000";
const GRAFANA_LOKI_UID = "P8E80F9AEF21F6940";

function grafanaLogsUrl(namespace) {
  const left = {
    datasource: GRAFANA_LOKI_UID,
    queries: [{ expr: `{namespace="${namespace}"}`, refId: "A" }],
    range: { from: "now-1h", to: "now" },
  };
  return `${GRAFANA_URL}/explore?orgId=1&left=${encodeURIComponent(JSON.stringify(left))}`;
}

const form = document.getElementById("create-form");
const result = document.getElementById("result");
const previewTree = document.getElementById("preview-tree");
const toast = document.getElementById("toast");
const catalogList = document.getElementById("catalog-list");

let namespaceTouched = false;

function validateField(input) {
  const rule = FIELD_RULES[input.name];
  const errorEl = form.querySelector(`.field-error[data-for="${input.name}"]`);
  if (!rule || !errorEl) return true;

  if (input.value === "") {
    input.classList.remove("invalid");
    errorEl.textContent = "";
    return false;
  }

  const valid = rule.pattern.test(input.value);
  input.classList.toggle("invalid", !valid);
  errorEl.textContent = valid ? "" : rule.message;
  return valid;
}

function updatePreview() {
  const data = new FormData(form);
  const name = data.get("service_name") || "<service-name>";
  const language = data.get("language");
  const sourceFiles = SOURCE_FILES[language] || [];

  const lines = [
    `generated/${name}/`,
    "  Dockerfile",
    "  catalog-info.yaml",
    "  README.md",
    ...sourceFiles.map((f) => `  ${f}`),
    "  helm/values.yaml",
    `.github/workflows/${name}.yaml`,
  ];
  previewTree.textContent = lines.join("\n");
}

function showToast(message, isError) {
  toast.textContent = message;
  toast.classList.toggle("error", Boolean(isError));
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

form.addEventListener("input", (event) => {
  if (event.target.name === "namespace") {
    namespaceTouched = event.target.value !== "";
  }
  if (event.target.name === "team" && !namespaceTouched) {
    const namespaceInput = form.elements.namespace;
    const team = event.target.value.trim();
    namespaceInput.value = team ? `${team}-dev` : "";
  }
  if (FIELD_RULES[event.target.name]) validateField(event.target);
  updatePreview();
});

form.addEventListener("change", updatePreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fieldsValid = Object.keys(FIELD_RULES)
    .map((name) => validateField(form.elements[name]))
    .every(Boolean);
  if (!fieldsValid) {
    showToast("Fix the highlighted fields first", true);
    return;
  }

  const data = new FormData(form);
  const payload = {
    service_name: data.get("service_name"),
    team: data.get("team"),
    language: data.get("language"),
    namespace: data.get("namespace"),
    database: data.get("database") === "on",
    kafka: data.get("kafka") === "on",
    redis: data.get("redis") === "on",
  };

  const submitButton = form.querySelector("button[type=submit]");
  submitButton.disabled = true;
  submitButton.querySelector(".btn-label").textContent = "Creating...";
  submitButton.querySelector(".spinner").classList.remove("hidden");
  result.className = "result hidden";

  try {
    const response = await fetch("/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.detail || "Failed to create service");
    }

    const git = body.git || {};
    const gitLine = git.pushed
      ? `\n\nPushed to origin/${git.branch} (${git.commit.slice(0, 7)})`
      : git.error
        ? `\n\nGit push failed: ${git.error}`
        : "\n\n(git automation disabled — files were only written locally)";

    result.textContent =
      `Created ${body.service} at ${body.path}\n\n` +
      `Generated:\n${body.generated_items.map((item) => `  - ${item}`).join("\n")}` +
      gitLine;
    result.className = "result success";
    showToast(`${body.service} created`, false);
    form.reset();
    namespaceTouched = false;
    updatePreview();
    loadCatalog();
  } catch (err) {
    result.textContent = err.message;
    result.className = "result error";
    showToast(err.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector(".btn-label").textContent = "Create Service";
    submitButton.querySelector(".spinner").classList.add("hidden");
  }
});

function renderCatalog(services) {
  if (services.length === 0) {
    catalogList.innerHTML = '<p class="catalog-empty">No services yet — create one to see it here.</p>';
    return;
  }

  catalogList.innerHTML = services
    .map(
      (svc) => `
        <div class="service-card" data-service="${svc.service_name}" tabindex="0" role="button">
          <div class="service-card-header">
            <span class="service-name">${svc.service_name}</span>
            <span class="chip">${svc.language}</span>
          </div>
          <div class="service-meta">
            <span>team: ${svc.team}</span>
            <span>namespace: ${svc.namespace}</span>
          </div>
        </div>`
    )
    .join("");

  catalogList.querySelectorAll(".service-card").forEach((card) => {
    const open = () => showDetail(card.dataset.service);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

async function loadCatalog() {
  catalogList.innerHTML = '<p class="catalog-empty">Loading...</p>';
  try {
    const response = await fetch("/services");
    const body = await response.json();
    renderCatalog(body.services);
  } catch (err) {
    catalogList.innerHTML = `<p class="catalog-empty">Failed to load catalog: ${err.message}</p>`;
  }
}

const detailContent = document.getElementById("detail-content");
let detailPollTimer = null;

function activatePanel(name) {
  clearInterval(detailPollTimer);
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
    t.setAttribute("aria-selected", String(t.dataset.tab === name));
  });
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${name}`));
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activatePanel(tab.dataset.tab);
    if (tab.dataset.tab === "catalog") loadCatalog();
  });
});

document.getElementById("refresh-catalog").addEventListener("click", loadCatalog);
document.getElementById("back-to-catalog").addEventListener("click", () => activatePanel("catalog"));

function statusChip(label, kind) {
  const cls = kind === "good" ? "chip chip-good" : kind === "bad" ? "chip chip-bad" : "chip";
  return `<span class="${cls}">${label}</span>`;
}

function renderDetail(status) {
  if (!status.cluster_reachable) {
    detailContent.innerHTML = `
      <h2>${status.service}</h2>
      <p class="catalog-empty">Cluster unreachable: ${status.error || "unknown error"}</p>`;
    return;
  }

  const argocd = status.argocd || {};
  const syncChip = statusChip(argocd.sync_status || "Unknown", argocd.sync_status === "Synced" ? "good" : "bad");
  const healthChip = statusChip(argocd.health_status || "Unknown", argocd.health_status === "Healthy" ? "good" : "bad");

  const ci = status.ci || {};
  let ciChip;
  if (!ci.available) {
    ciChip = statusChip("CI: no runs yet", null);
  } else if (ci.status !== "completed") {
    ciChip = statusChip(`CI: ${ci.status}`, null);
  } else {
    ciChip = statusChip(`CI: ${ci.conclusion}`, ci.conclusion === "success" ? "good" : "bad");
  }
  const ciLink = ci.html_url
    ? `<a href="${ci.html_url}" target="_blank" rel="noopener" class="ci-link">${ciChip}</a>`
    : ciChip;

  const podRows = (status.pods || [])
    .map(
      (p) => `
        <tr>
          <td>${p.name}</td>
          <td>${p.phase}</td>
          <td>${p.ready}</td>
          <td>${p.restarts}</td>
        </tr>`
    )
    .join("");

  const metricsByPod = Object.fromEntries((status.metrics || []).map((m) => [m.pod, m]));
  const metricsRows = (status.pods || [])
    .map((p) => {
      const m = metricsByPod[p.name];
      return `<tr><td>${p.name}</td><td>${m ? m.cpu : "—"}</td><td>${m ? m.memory : "—"}</td></tr>`;
    })
    .join("");

  const r = status.replicas || {};

  detailContent.innerHTML = `
    <div class="detail-header">
      <h2>${status.service}</h2>
      <div>${ciLink} ${syncChip} ${healthChip}</div>
    </div>
    <p class="preview-hint">
      namespace: ${status.namespace} &middot;
      <a href="${grafanaLogsUrl(status.namespace)}" target="_blank" rel="noopener">View logs in Grafana</a>
    </p>

    <div class="stat-row">
      <div class="stat"><span class="stat-value">${r.desired ?? "—"}</span><span class="stat-label">desired</span></div>
      <div class="stat"><span class="stat-value">${r.ready ?? "—"}</span><span class="stat-label">ready</span></div>
      <div class="stat"><span class="stat-value">${r.available ?? "—"}</span><span class="stat-label">available</span></div>
    </div>

    <h3>Pods</h3>
    <table class="status-table">
      <thead><tr><th>Name</th><th>Phase</th><th>Ready</th><th>Restarts</th></tr></thead>
      <tbody>${podRows || '<tr><td colspan="4">No pods found</td></tr>'}</tbody>
    </table>

    <h3>Resource usage</h3>
    ${
      status.metrics === null
        ? '<p class="preview-hint">metrics-server unavailable</p>'
        : `<table class="status-table">
            <thead><tr><th>Pod</th><th>CPU</th><th>Memory</th></tr></thead>
            <tbody>${metricsRows}</tbody>
          </table>`
    }
  `;
}

async function fetchAndRenderDetail(serviceName) {
  try {
    const response = await fetch(`/services/${serviceName}/status`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.detail || "Failed to load status");
    renderDetail(body);
  } catch (err) {
    detailContent.innerHTML = `<p class="catalog-empty">Failed to load status: ${err.message}</p>`;
  }
}

function showDetail(serviceName) {
  activatePanel("detail");
  detailContent.innerHTML = '<p class="catalog-empty">Loading...</p>';
  fetchAndRenderDetail(serviceName);
  detailPollTimer = setInterval(() => fetchAndRenderDetail(serviceName), 5000);
}

updatePreview();
