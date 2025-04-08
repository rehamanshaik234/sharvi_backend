const express = require("express");
const cfenv = require("cfenv");
const appEnv = cfenv.getAppEnv();
const app = express();
const bodyParser = require("body-parser");
const twilio = require("twilio");
const https = require("https");
const axios = require("axios");

const agent = new https.Agent({
  rejectUnauthorized: false, 
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const SAP_API_URL = "https://49.207.9.62:44325/pr/release?sap-client=100";
const USERNAME = "s23hana3";
const PASSWORD = "Sh@rvi@2025";


const accountSid = process.env.accountSid;
// const accountSid ="AC18ae6e19cc87ab473e00a0b0c235e0fb"
const authToken = process.env.authToken;
// const authToken = "4c63201ff48d98a69e425c694be3408f";
const twilioClient = twilio(accountSid, authToken);


const userData = {};

function getAuthHeader() {
  return `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")}`;
}

app.get("/", (req, res) => {
  res.send({ message: "Welcome to Twilio WhatsApp Automation!" });
});

const sentBANFNs = new Set(); 

async function sendInitialNotification() {
  try {
    // console.log("Fetching SAP data for notification...");

    // Fetch SAP data
    const sapResponse = await axios.get(SAP_API_URL, {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      httpsAgent: agent,
    });

    const sapData = sapResponse.data;

    // console.log("SAP Response:", sapData);

    const fieldMapping = {
      BANFN: "PR Number",
      BNFPO: "PR Item",
      MATNR: "Material",
      SHORT_TEXT: "Material Description",
      AFNAM: "Name of Requisitioner/Requester",
      WERKS: "Plant",
      BAMNG: "PR Quantity",
      EINDT: "Item Delivery Date",
      BAPREBAPI: "Price in Purchase Requisition",
    };

    const newRecords = sapData.filter((item) => !sentBANFNs.has(item.BANFN));

    if (newRecords.length > 0) {
      console.log(`Found ${newRecords.length} new records. Sending notification...`);

      const convertedData = newRecords.map((item) => {
        const formattedItem = {};
        for (const key in item) {
          if (fieldMapping[key]) {
            formattedItem[fieldMapping[key]] = item[key];
          }
        }
        return formattedItem;
      });

      const messageBody = JSON.stringify(convertedData, null, 2);

      const toWhatsAppNumber = "whatsapp:+919553142292";//"whatsapp:+918420989999";
      const fromWhatsAppNumber = "whatsapp:+14155238886";

      const twilioResponse = await twilioClient.messages.create({
        from: fromWhatsAppNumber,
        to: toWhatsAppNumber,
        body: `${messageBody}`,
      });

      console.log("Notification Sent:", twilioResponse.sid);

      // Update the tracker with sent BANFN values
      newRecords.forEach((record) => sentBANFNs.add(record.BANFN));
    } else {
      console.log("No new records found. Skipping notification.");
    }
  } catch (error) {
    console.error("Error sending notification:", error.message);
  }
}

setInterval(sendInitialNotification, 6000);
app.post("/api/whatsappWebhook", async (req, res) => {
  try {
    const { From, Body } = req.body; 

    console.log(`Incoming WhatsApp message from ${From}:`, Body);

    const [BANFN, BNFPO] = Body.split("\n").map((value) => value.trim());
    const sapPayload = {
      RELEASE: {
        BANFN, 
        BNFPO: parseInt(BNFPO, 10), 
      },
    };

    console.log("SAP Payload:", sapPayload);
    const sapResponse = await axios.post(SAP_API_URL, sapPayload, {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      httpsAgent: agent,
    });

    console.log("SAP Final Response:", sapResponse.data);

    const formattedResponse = sapResponse.data;
    let message = formattedResponse.map(item => item.MSGTXT).join('\n');

    const twilioResponse = await twilioClient.messages.create({
      from: "whatsapp:+14155238886", // Twilio WhatsApp number
      to: From, 
      body: message,
    });
  

    console.log("Final WhatsApp Message Sent:", twilioResponse.sid);
    res.send({ status:200, message });
  } 
  catch (error) {
    console.error("Error handling WhatsApp request:", error.message);
    res.status(500).send({ error: "Failed to process request." });
  }
});


app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await sendInitialNotification(); // trigger when server start
});
