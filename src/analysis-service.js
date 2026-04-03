import { appendHistory } from "./history-store.js";
import { appConfig } from "./config.js";
import {
  buildFallbackAnalysis,
  buildLocalSafetySignals,
  buildResponseEnvelope,
  parseModelPayload
} from "./symptom-utils.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = appConfig.openAiModel;

const outputSchema = {
  name: "symptom_checker_response",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      disclaimer: { type: "string" },
      triage_level: {
        type: "string",
        enum: ["self_care", "see_doctor_soon", "urgent", "emergency"]
      },
      summary: { type: "string" },
      probable_conditions: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            likelihood: {
              type: "string",
              enum: ["possible", "more_likely", "less_likely"]
            },
            reasoning: { type: "string" }
          },
          required: ["name", "likelihood", "reasoning"]
        }
      },
      recommended_next_steps: {
        type: "array",
        minItems: 2,
        items: { type: "string" }
      },
      red_flags: {
        type: "array",
        items: { type: "string" }
      },
      when_to_seek_care: {
        type: "array",
        minItems: 1,
        items: { type: "string" }
      }
    },
    required: [
      "disclaimer",
      "triage_level",
      "summary",
      "probable_conditions",
      "recommended_next_steps",
      "red_flags",
      "when_to_seek_care"
    ]
  }
};

function buildOpenAIRequest(symptoms, safetySignals) {
  const systemPrompt = [
    "You are a healthcare symptom checker for educational use only.",
    "Do not diagnose, do not claim certainty, and do not replace a clinician.",
    "Always include a clear disclaimer that the output is educational only and not medical advice.",
    "Be conservative with safety: if symptoms suggest emergency issues, set triage_level to emergency.",
    "Probable conditions must be framed as possibilities, not confirmed diagnoses.",
    "Recommended next steps should be practical and safety-oriented.",
    "Use the provided local safety signals as high-priority context."
  ].join(" ");

  const userPrompt = [
    `Symptoms: ${symptoms}`,
    `Local safety signals: ${JSON.stringify(safetySignals)}`,
    "Return structured JSON only."
  ].join("\n");

  return {
    model: DEFAULT_MODEL,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    text: {
      format: {
        type: "json_schema",
        name: outputSchema.name,
        schema: outputSchema.schema,
        strict: true
      }
    }
  };
}

async function requestOpenAIAnalysis(symptoms, safetySignals) {
  const apiKey = appConfig.openAiApiKey;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildOpenAIRequest(symptoms, safetySignals))
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return parseModelPayload(payload);
}

export async function analyzeSymptoms(symptoms) {
  const safetySignals = buildLocalSafetySignals(symptoms);

  let modelResult;
  let source = "mock";

  try {
    modelResult = await requestOpenAIAnalysis(symptoms, safetySignals);
    if (modelResult) {
      source = "openai";
    }
  } catch (error) {
    console.warn("Falling back to local analysis:", error);
  }

  const analysis = modelResult || buildFallbackAnalysis(symptoms, safetySignals);
  const response = buildResponseEnvelope({
    analysis,
    symptoms,
    source,
    safetySignals
  });

  await appendHistory({
    timestamp: new Date().toISOString(),
    symptoms,
    source,
    triageLevel: response.triageLevel,
    redFlags: response.redFlags,
    probableConditions: response.probableConditions.map((item) => item.name)
  });

  return response;
}
