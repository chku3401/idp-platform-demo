const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/", (req, res) => {
  res.json({ service: "__SERVICE_NAME__", team: "__TEAM__" });
});

app.listen(port, () => {
  console.log(`__SERVICE_NAME__ listening on port ${port}`);
});
