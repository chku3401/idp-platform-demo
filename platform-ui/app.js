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
};

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
    "  gitops/application.yaml",
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
        <div class="service-card">
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

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));

    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");

    if (tab.dataset.tab === "catalog") loadCatalog();
  });
});

document.getElementById("refresh-catalog").addEventListener("click", loadCatalog);

updatePreview();
