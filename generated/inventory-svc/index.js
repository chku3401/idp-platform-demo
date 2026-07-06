const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/", (req, res) => {
  res.json({ service: "inventory-svc", team: "inventory" });
});

app.listen(port, () => {
  console.log(`inventory-svc listening on port ${port}`);
});
