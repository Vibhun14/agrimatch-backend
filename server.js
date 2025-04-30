require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleAuth } = require("google-auth-library");
const { VertexAI } = require("@google-cloud/vertexai");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Path to your downloaded Vertex service account key (relative to project root)
const keyPath = "./vertex-key.json";

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.PROJECT_ID,
  location: "us-central1",
  credentials: JSON.parse(process.env.GCP_KEY_JSON)
});

const model = vertexAI.getGenerativeModel({
  model: "gemini-pro",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 1,
    maxOutputTokens: 1024,
  }
});

app.post("/generate-tips", async (req, res) => {
  const plants = req.body.plants || [];

  const prompt = `
You're an expert in sustainable agriculture. Given the user's accepted plants: ${plants.join(", ")}, generate 3 companion planting tips.

Each tip should include:
- id: (string, UUID format)
- title: (string)
- description: (string)
- relatedPlants: (array of strings)
- imagePrompt: (one sentence to visually describe the idea)

Respond with only a JSON array of 3 such objects.
`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("🧠 Gemini raw output:\n", text);

    // Try to parse JSON string
    const tips = JSON.parse(text);
    res.json(tips);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: "Failed to generate tips" });
  }
});

app.listen(port, () => {
  console.log(`🌿 AgriMatch Gemini backend running on port ${port}`);
});
