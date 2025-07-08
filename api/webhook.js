const admin = require("firebase-admin");

// Initialize Firebase Admin with service account from env only once
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
    return res.status(200).send("✅ Campus Events Webhook is running securely with ENV!");
  }

  if (req.method === "POST") {
    const intent = req.body?.queryResult?.intent?.displayName;
    const params = req.body?.queryResult?.parameters || {};

    let reply = "Sorry, I couldn’t find any events.";

    try {
      if (intent === "UpcomingEventsByDomain") {
        // FIX: Handle domain array or string
        const domain = Array.isArray(params.domain) ? params.domain[0] : params.domain;

        const snapshot = await db
          .collection("events")
          .where("domain", "==", domain)
          .orderBy("Date")
          .get();

        if (!snapshot.empty) {
          reply = `Here are upcoming ${domain} events:\n`;
          snapshot.forEach((doc) => {
            const e = doc.data();
            // If 'Date' is a Firestore Timestamp, convert
            const eventDate = e.Date?.toDate?.().toDateString?.() || e.Date;
            reply += `${e.name} (${eventDate}): ${e.desc}\n`;
          });
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
