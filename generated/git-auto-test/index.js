const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/", (req, res) => {
  res.json({ service: "git-auto-test", team: "platform" });
});

app.listen(port, () => {
  console.log(`git-auto-test listening on port ${port}`);
});
