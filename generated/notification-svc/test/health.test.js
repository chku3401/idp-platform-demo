const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");

function buildApp() {
  const app = express();
  app.get("/health", (req, res) => res.json({ status: "healthy" }));
  return app;
}

test("GET /health returns healthy", async () => {
  const app = buildApp();
  const server = app.listen(0);
  const { port } = server.address();

  const body = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/health`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });

  assert.strictEqual(body.status, "healthy");
  server.close();
});
