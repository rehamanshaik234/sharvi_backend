const express = require('express');
var cfenv =require('cfenv');
appEnv =cfenv.getAppEnv();
var app =express();
const bodyParser = require('body-parser');
const twilio = require("twilio");
const cron = require('node-cron');
var admin = require("firebase-admin");
const https = require('https');
const { google } = require("googleapis");
const agent = new https.Agent({  
  rejectUnauthorized: false  // Disables SSL verification (only for testing!)
});

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
const axios = require("axios");
const e = require('express');

const PORT = process.env.PORT || 3000;

const SAP_API_URL = 'https://49.207.9.62:44325/pr/release?sap-client=100';
const USERNAME = 's23hana3';
const PASSWORD = 'Best@12345';

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
});
const db = admin.firestore(); 

let lastPRs = []; // Store previously fetched PRs

cron.schedule('*/10 * * * * *', async () => {  // Runs every 30 seconds
  try {
    console.log("CORN JOB")
    const sapResponse = await axios.get(SAP_API_URL, {
      headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" },
      httpsAgent: agent,
    });

    const currentPRs = sapResponse.data; // List of PRs from SAP

    // Find newly created PRs (by comparing with last fetched PRs)
    const newPRs = currentPRs.filter(pr => !lastPRs.some(oldPR => oldPR.BANFN === pr.BANFN));

    if (newPRs.length > 0) {
      console.log("New PR Detected:", newPRs);
      sendNotifications();
    }

    lastPRs = currentPRs; // Update stored PRs
  } catch (error) {
    console.error("Error fetching PRs:", error.message);
  }
});



function getAuthHeader() {
  return `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")}`;
}

app.get("/api/get/PRData", async (req, res) => {
  try {
    const sapResponse = await axios.get(SAP_API_URL, {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      httpsAgent: agent,
    });

    console.log('sapResponse', sapResponse.data);

    const fieldMapping = {
      "BANFN": "PR Number",
      "BNFPO": "PR Item",
      "MATNR": "Material",
      "SHORT_TEXT": "Material Description",
      "AFNAM": "Name of Requisitioner/Requester",
      "WERKS": "Plant",
      "BAMNG": "PR Quantity",
      "EINDT": "Item Delivery Date",
      "BAPREBAPI": "Price in Purchase Requisition",
    };

    const convertedData = sapResponse.data.map((item) => {
      let formattedItem = {};
      for (let key in item) {
        if (fieldMapping[key]) {
          formattedItem[fieldMapping[key]] = item[key];
        }
      }
      return formattedItem;
    });
    res.status(200).json({ success: true, data: convertedData });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to send data to WhatsApp." });
  }
});

app.post("/api/Pr/Approvals", async (req, res) => {
  console.log('reqBody From UI',req)
  try {
    const sapPayload = {
      RELEASE: {
        BANFN:req.body.BANFN,
        BNFPO: req.body.BNFPO 
      },
    };
    const sapResponse = await axios.post(SAP_API_URL, req.body , {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      httpsAgent: agent,
    });

    const formattedResponse = sapResponse.data;
    res.send({ status:200, message: formattedResponse });
    // res.status(200).json({ success: true, data: convertedData });

  } catch (error) {
    console.error("Error handling request:", error.message);
    res.status(500).send({ error: "Failed to Approve PR." });
  }
});


async function getFCMTokens() {
  try {
    const snapshot = await db.collection("FCM").get();
    const tokens = [];

    snapshot.forEach(doc => {
      if (doc.data().fcm) {
        tokens.push(doc.data().fcm);
      }
    });

    console.log("Fetched FCM Tokens:", tokens);
    return tokens;
  } catch (error) {
    console.error("Error fetching FCM tokens:", error);
    return [];
  }
}

async function sendNotifications() {
  const tokens = await getFCMTokens();

  if (tokens.length === 0) {
    console.log("No FCM tokens found");
    return;
  }

   for(var i=0;i<tokens.length;i++){
    await sendNotification(tokens[i]);
  }

}

async function sendNotification(token) {
  const accessToken = await getAccessToken();
  const message = {
    message:{
      token:token,
      notification: {
      title: "New Purchase Request",
      body: "A new PR has been detected.",
    },
  },
  };
  try {
    const response= await axios.post('https://fcm.googleapis.com/v1/projects/sharvi-smartapprovals/messages:send',message,{
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    })
  
  } catch (error) {
    await deleteDocumentsWithToken(token);
    console.log(error);
  }
}

async function deleteDocumentsWithToken(targetToken) {
  const collectionRef = db.collection("FCM");

  try {
    const snapshot = await collectionRef.where("fcm", "==", targetToken).get();

    if (snapshot.empty) {
      console.log("No matching documents found.");
      return;
    }

    const batch = db.batch();

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log("Documents with token", targetToken, "deleted successfully.");
  } catch (error) {
    console.error("Error deleting documents:", error);
  }
}

function getAccessToken() {
  return new Promise(function(resolve, reject) {
    const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];
    const key = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES,
      null
    );
    jwtClient.authorize(function(err, tokens) {
      if (err) {
        reject(err);
        return;
      }
      console.log(tokens);
      resolve(tokens.access_token);
    });
  });
}


app.listen(PORT, function(){
    console.log(`Server running on port ${PORT}`)
});
