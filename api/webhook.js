const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.applicationDefault(),
    // Or use a service account:
    // credential: admin.credential.cert(require("../serviceAccountKey.json"))
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("✅ Campus Events Webhook is running!");
  }

  if (req.method === "POST") {
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
  } else {
    res.status(405).send("Method Not Allowed");
  }
}
