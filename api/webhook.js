const admin = require("firebase-admin");

// ✅ Initialize Firebase Admin with service account
if (!admin.apps.length) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountBase64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env variable is not set.");
  }

  const serviceAccountJSON = Buffer.from(serviceAccountBase64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(serviceAccountJSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("✅ Campus Events Webhook is running!");
  }

  if (req.method === "POST") {
    const intent = req.body?.queryResult?.intent?.displayName;
    const params = req.body?.queryResult?.parameters || {};

    console.log("👉 Full request body:", JSON.stringify(req.body, null, 2));
    console.log("👉 Detected intent:", intent);
    console.log("👉 Parameters:", params);

    let reply = "Sorry, I couldn’t find any events.";

    try {
      if (intent === "UpcomingEventsByDomain") {
        // Make sure we extract the domain properly
        const domain = Array.isArray(params.domain)
          ? params.domain[0]
          : params.domain;

        console.log("👉 Domain to query:", domain);

        const snapshot = await db
          .collection("events")
          .where("domain", "==", domain)
          .get();

        console.log("👉 Query result size:", snapshot.size);

        if (!snapshot.empty) {
          reply = `Here are upcoming ${domain} events:\n`;
          snapshot.forEach((doc) => {
            const e = doc.data();
            reply += `• ${e.name}: ${e.desc}\n`;
          });
        } else {
          reply = `No upcoming events found for ${domain}.`;
        }
      }

      res.json({ fulfillmentText: reply });
    } catch (err) {
      console.error("🔥 Error fetching events:", err);
      res.json({ fulfillmentText: "Error fetching events." });
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
}
