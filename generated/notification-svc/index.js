const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/", (req, res) => {
  res.json({ service: "notification-svc", team: "notifications" });
});

app.listen(port, () => {
  console.log(`notification-svc listening on port ${port}`);
});
