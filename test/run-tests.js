import assert from "node:assert/strict";

import {
  buildFallbackAnalysis,
  buildLocalSafetySignals,
  buildResponseEnvelope
} from "../src/symptom-utils.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("emergency red flags escalate severity", () => {
  const safetySignals = buildLocalSafetySignals("I have chest pain and shortness of breath.");
  assert.equal(safetySignals.severity, "emergency");
  assert.ok(safetySignals.signals.length >= 1);
});

run("fallback analysis preserves educational disclaimer", () => {
  const analysis = buildFallbackAnalysis("sore throat and low fever for two days", {
    severity: "self_care",
    signals: []
  });

  assert.match(analysis.disclaimer, /Educational use only/i);
  assert.ok(analysis.probable_conditions.length >= 1);
});

run("response envelope keeps the safer triage level", () => {
  const response = buildResponseEnvelope({
    analysis: {
      disclaimer: "Educational use only.",
      summary: "Summary",
      triage_level: "self_care",
      probable_conditions: [
        { name: "Condition A", likelihood: "possible", reasoning: "Reason" }
      ],
      recommended_next_steps: ["Next step 1", "Next step 2"],
      red_flags: [],
      when_to_seek_care: ["When to seek care"]
    },
    symptoms: "chest pain",
    source: "mock",
    safetySignals: {
      severity: "emergency",
      signals: ["Possible cardiac or respiratory emergency symptoms."]
    }
  });

  assert.equal(response.triageLevel, "emergency");
  assert.ok(response.redFlags.includes("Possible cardiac or respiratory emergency symptoms."));
});

console.log("All tests passed.");
