const form = document.getElementById("create-form");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
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

  const submitButton = form.querySelector("button");
  submitButton.disabled = true;
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

    result.textContent =
      `Created ${body.service} at ${body.path}\n\n` +
      `Generated:\n${body.generated_items.map((item) => `  - ${item}`).join("\n")}`;
    result.className = "result success";
    form.reset();
  } catch (err) {
    result.textContent = err.message;
    result.className = "result error";
  } finally {
    submitButton.disabled = false;
  }
});
