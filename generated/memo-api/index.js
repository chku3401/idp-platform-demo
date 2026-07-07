const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/", (req, res) => {
  res.json({ service: "memo-api", team: "memo" });
});

app.listen(port, () => {
  console.log(`memo-api listening on port ${port}`);
});
