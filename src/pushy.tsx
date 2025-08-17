import express, { Express } from 'express';
import axios from 'axios';
import * as admin from 'firebase-admin';

const app: Express = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const PUSHY_API_KEY = "3a834dabe5d9ca297ada29d915807b619d221224f207ac3c3dd81a791b479209";

app.post("/pushy", async (req: express.Request, res: express.Response) => {
  const { parentId, message, billCount, totalAmount } = req.body;

  if (!parentId) return res.status(400).send({ error: "Missing parentId" });

  try {
    const parentDoc = await admin.firestore().collection("parents").doc(parentId).get();
    if (!parentDoc.exists) return res.status(404).send({ error: "Parent not found" });

    const deviceTokens = parentDoc.data()?.deviceTokens || [];
    if (deviceTokens.length === 0) return res.status(200).send({ message: "No tokens" });

    await Promise.all(
      deviceTokens.map((token: string) =>
        axios.post(`https://api.pushy.me/push?api_key=${PUSHY_API_KEY}`, {
          to: token,
          data: { type: "new_bill", parentId, billCount, totalAmount, message },
          notification: { title: "New Bill Available", body: message },
        })
      )
    );

    res.status(200).send({ success: true, sentTo: deviceTokens.length });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to send notification" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
