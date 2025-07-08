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
        const domain =
          Array.isArray(params.domain) && params.domain.length > 0
            ? params.domain[0]
            : params.domain;

        if (!domain) {
          throw new Error("No domain provided in parameters");
        }

        console.log(`🔍 Fetching events for domain: ${domain}`);

        const snapshot = await db
          .collection("events")
          .where("domain", "==", domain)
          .orderBy("inhowmanydays")
          .get();

        if (!snapshot.empty) {
          reply = `Here are upcoming ${domain} events:\n`;
          snapshot.forEach((doc) => {
            const e = doc.data();

            // 🗓️ Calculate date from today + inhowmanydays
            let eventDate = "unknown date";
            if (typeof e.inhowmanydays === "number") {
              const today = new Date();
              today.setDate(today.getDate() + e.inhowmanydays);
              eventDate = today.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              });
            }

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
