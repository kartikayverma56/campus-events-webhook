const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.applicationDefault(),
  // If your Firestore is not in the same project, use a service account key JSON file:
  // credential: admin.credential.cert(require("./serviceAccountKey.json"))
});
const db = admin.firestore();

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("✅ Campus Events Webhook is running!");
});

app.post("/webhook", async (req, res) => {
  const intent = req.body.queryResult.intent.displayName;
  const params = req.body.queryResult.parameters;

  let reply = "Sorry, I couldn’t find any events.";

  try {
    if (intent === "UpcomingEventsByDomain") {
      const domain = params.domain;
      const snapshot = await db.collection("events")
        .where("domain", "==", domain)
        .orderBy("date").get();

      if (!snapshot.empty) {
        reply = `Here are upcoming ${domain} events:\n`;
        snapshot.forEach(doc => {
          const e = doc.data();
          reply += `${e.name} (${e.date.toDate().toDateString()}): ${e.desc}\n`;
        });
      }
    }

    res.json({ fulfillmentText: reply });
  } catch (err) {
    console.error(err);
    res.json({ fulfillmentText: "Error fetching events." });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
