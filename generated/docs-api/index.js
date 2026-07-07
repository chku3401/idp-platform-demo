const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/", (req, res) => {
  res.json({ service: "docs-api", team: "document" });
});

app.listen(port, () => {
  console.log(`docs-api listening on port ${port}`);
});
