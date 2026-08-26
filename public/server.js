const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const MODEL = "gemini-2.5-flash-lite";

if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing.");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json());

app.use(express.static(
    path.join(__dirname, "public")
));

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        agent: "SEO Agent",
        model: MODEL
    });
});

app.post("/api/analyze", async (req, res) => {

    try {

        const url =
            typeof req.body.url === "string"
                ? req.body.url.trim()
                : "";

        if (!url) {
            return res.status(400).json({
                success: false,
                error: "Please enter a website URL."
            });
        }

        let parsedURL;

        try {
            parsedURL = new URL(url);
        } catch {
            return res.status(400).json({
                success: false,
                error: "Invalid URL."
            });
        }

        if (
            parsedURL.protocol !== "http:" &&
            parsedURL.protocol !== "https:"
        ) {
            return res.status(400).json({
                success: false,
                error: "Only HTTP and HTTPS URLs are supported."
            });
        }

        console.log("Analyzing:", url);

        const prompt = `
You are a professional SEO auditor.

Analyze this webpage:

${url}

Use the URL Context tool to inspect the webpage.

Check:

1. Page title
2. Meta description
3. H1
4. H2 structure
5. URL structure
6. Content quality
7. Search intent
8. Internal links
9. Images and alt text
10. Basic technical SEO
11. Keyword/topic relevance
12. Visible indexability signals

Do NOT invent:

- Google rankings
- Search volume
- Organic traffic
- Backlinks
- Google Search Console data
- Competitor data

Return exactly:

SEO_SCORE: number from 0 to 100

CRITICAL_ISSUES: number

WARNINGS: number

PASSED: number

SUMMARY:
Maximum 2 short sentences.

FINDINGS:
- CRITICAL | issue | explanation
- WARNING | issue | explanation
- PASSED | item | explanation

TOP_ACTIONS:
1. Most important SEO improvement
2. Second most important SEO improvement
3. Third most important SEO improvement

KEYWORD_OPPORTUNITIES:
- topic
- topic
- topic

Keep the answer concise.
Do not make up data.
`;

        const response =
            await ai.models.generateContent({

                model: MODEL,

                contents: prompt,

                config: {

                    tools: [
                        {
                            urlContext: {}
                        }
                    ],

                    temperature: 0.2,

                    maxOutputTokens: 900
                }
            });

        const text =
            response.text || "";

        if (!text.trim()) {
            throw new Error(
                "Gemini returned an empty response."
            );
        }

        return res.json({
            success: true,
            text: text
        });

    } catch (error) {

        console.error(
            "Analysis error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error.message ||
                "SEO analysis failed."
        });
    }
});

app.listen(PORT, () => {

    console.log(
        `SEO Agent running on port ${PORT}`
    );

});