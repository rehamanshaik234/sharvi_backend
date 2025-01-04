const express = require('express');
var cfenv =require('cfenv');
appEnv =cfenv.getAppEnv();
var app =express();
const bodyParser = require('body-parser');
const twilio = require("twilio");

const https = require('https');
const agent = new https.Agent({  
  rejectUnauthorized: false  // Disables SSL verification (only for testing!)
});

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
const axios = require("axios");

const PORT = process.env.PORT || 3000;

const SAP_API_URL = 'https://49.207.9.62:44325/pr/release?sap-client=100';
const USERNAME = 's23hana3';
const PASSWORD = 'Best@12345';

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

app.listen(PORT, function(){
    console.log(`Server running on port ${PORT}`)
});