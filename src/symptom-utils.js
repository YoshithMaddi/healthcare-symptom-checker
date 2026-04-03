const emergencyMatchers = [
  { pattern: /chest pain|pressure in chest/i, signal: "Possible cardiac or respiratory emergency symptoms." },
  { pattern: /shortness of breath|can't breathe|difficulty breathing/i, signal: "Breathing difficulty can require urgent evaluation." },
  { pattern: /face droop|slurred speech|one-sided weakness|numbness on one side/i, signal: "Stroke-like symptoms need emergency attention." },
  { pattern: /passed out|fainted|unconscious/i, signal: "Loss of consciousness can be dangerous." },
  { pattern: /seizure/i, signal: "Seizure activity needs urgent medical guidance." },
  { pattern: /severe bleeding|bleeding won't stop|vomiting blood|blood in stool/i, signal: "Significant bleeding is an emergency warning sign." },
  { pattern: /suicidal|want to die|kill myself|self-harm/i, signal: "Mental health crisis symptoms need immediate support." }
];

const urgentMatchers = [
  { pattern: /high fever|fever.*stiff neck|rash with fever/i, signal: "Possible serious infection warning signs." },
  { pattern: /pregnan/i, signal: "Pregnancy-related symptoms often need lower threshold for clinician review." },
  { pattern: /dehydrated|not urinating|unable to keep fluids down/i, signal: "Possible dehydration or inability to hydrate." },
  { pattern: /worsening rapidly|getting worse quickly|suddenly worse/i, signal: "Rapidly worsening symptoms need prompt evaluation." }
];

export function buildLocalSafetySignals(symptoms) {
  const signals = [];
  let severity = "self_care";

  for (const matcher of emergencyMatchers) {
    if (matcher.pattern.test(symptoms)) {
      signals.push(matcher.signal);
      severity = "emergency";
    }
  }

  if (severity !== "emergency") {
    for (const matcher of urgentMatchers) {
      if (matcher.pattern.test(symptoms)) {
        signals.push(matcher.signal);
        severity = "urgent";
      }
    }
  }

  return { severity, signals };
}

function detectConditionHints(symptoms) {
  const lowerSymptoms = symptoms.toLowerCase();
  const hints = [];

  if (/(cough|sore throat|runny nose|congestion|fever)/i.test(lowerSymptoms)) {
    hints.push({
      name: "Viral upper respiratory infection",
      likelihood: "more_likely",
      reasoning: "Symptoms overlap with common viral illnesses such as colds or flu-like infections."
    });
  }

  if (/(burning urination|frequent urination|pelvic pain)/i.test(lowerSymptoms)) {
    hints.push({
      name: "Urinary tract infection",
      likelihood: "possible",
      reasoning: "Urinary discomfort and frequency can fit a urinary tract infection pattern."
    });
  }

  if (/(nausea|vomiting|diarrhea|stomach cramps)/i.test(lowerSymptoms)) {
    hints.push({
      name: "Gastroenteritis",
      likelihood: "possible",
      reasoning: "GI symptoms can match a stomach bug, foodborne illness, or irritation."
    });
  }

  if (/(headache|sensitivity to light|migraine)/i.test(lowerSymptoms)) {
    hints.push({
      name: "Migraine or tension-type headache",
      likelihood: "possible",
      reasoning: "Headache symptoms may reflect a primary headache condition depending on severity and triggers."
    });
  }

  if (/(rash|itchy|hives)/i.test(lowerSymptoms)) {
    hints.push({
      name: "Allergic reaction or dermatitis",
      likelihood: "possible",
      reasoning: "Skin symptoms may fit allergy, irritation, or infection depending on timing and spread."
    });
  }

  if (/(chest pain|shortness of breath)/i.test(lowerSymptoms)) {
    hints.push({
      name: "Heart or lung-related condition",
      likelihood: "possible",
      reasoning: "Chest pain or breathing symptoms can come from serious cardiac, clotting, or respiratory causes."
    });
  }

  if (hints.length === 0) {
    hints.push(
      {
        name: "Nonspecific viral illness",
        likelihood: "possible",
        reasoning: "Many general symptoms can occur with routine infections, but more detail is needed."
      },
      {
        name: "Inflammatory or irritation-related condition",
        likelihood: "less_likely",
        reasoning: "Some symptom patterns reflect irritation, inflammation, or medication side effects."
      }
    );
  }

  return hints.slice(0, 4);
}

export function buildFallbackAnalysis(symptoms, safetySignals) {
  const probableConditions = detectConditionHints(symptoms);
  const severe = safetySignals.severity;

  const recommendedNextSteps = severe === "emergency"
    ? [
        "Seek emergency medical care now or call your local emergency number.",
        "Do not rely on this tool alone for symptoms with emergency warning signs.",
        "If you are alone or feel unsafe, contact someone nearby immediately."
      ]
    : severe === "urgent"
      ? [
          "Arrange prompt medical evaluation today, especially if symptoms are worsening.",
          "Stay hydrated, rest, and monitor symptom changes closely.",
          "Escalate to urgent care or emergency care if red-flag symptoms appear."
        ]
      : [
          "Monitor symptoms, rest, and use standard self-care measures if appropriate.",
          "Book a clinician visit if symptoms persist, worsen, or feel unusual for you.",
          "Seek urgent care sooner if red-flag symptoms appear."
        ];

  const whenToSeekCare = severe === "emergency"
    ? ["Emergency evaluation is appropriate based on the symptom pattern described."]
    : severe === "urgent"
      ? ["Same-day evaluation is reasonable if symptoms continue or intensify."]
      : ["Medical review is appropriate if symptoms last more than a few days, worsen, or new concerning signs appear."];

  return {
    disclaimer: "Educational use only. This is not a diagnosis or a substitute for professional medical advice.",
    triage_level: severe,
    summary: "This initial assessment highlights possible causes and safer next steps based on the symptom text provided.",
    probable_conditions: probableConditions,
    recommended_next_steps: recommendedNextSteps,
    red_flags: safetySignals.signals,
    when_to_seek_care: whenToSeekCare
  };
}

export function parseModelPayload(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return JSON.parse(payload.output_text);
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const contents = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of contents) {
      if (contentItem?.type === "output_text" && typeof contentItem.text === "string") {
        return JSON.parse(contentItem.text);
      }
    }
  }

  throw new Error("OpenAI response did not contain structured output text.");
}

function mergeRedFlags(modelRedFlags, safetySignals) {
  const merged = [...(modelRedFlags || []), ...safetySignals.signals];
  return [...new Set(merged)];
}

function normalizeTriage(modelTriage, safetySignals) {
  const order = {
    self_care: 0,
    see_doctor_soon: 1,
    urgent: 2,
    emergency: 3
  };

  const safetyTriage = safetySignals.severity;
  return order[safetyTriage] > order[modelTriage] ? safetyTriage : modelTriage;
}

export function getSeverityPresentation(triageLevel) {
  const map = {
    self_care: {
      label: "Low",
      description: "Monitor at home"
    },
    see_doctor_soon: {
      label: "Moderate",
      description: "Schedule a medical visit soon"
    },
    urgent: {
      label: "High",
      description: "Urgent same-day attention"
    },
    emergency: {
      label: "Critical",
      description: "Emergency care now"
    }
  };

  return map[triageLevel] || map.self_care;
}

export function buildResponseEnvelope({ analysis, symptoms, source, safetySignals }) {
  const triageLevel = normalizeTriage(analysis.triage_level, safetySignals);
  const redFlags = mergeRedFlags(analysis.red_flags, safetySignals);
  const severity = getSeverityPresentation(triageLevel);

  return {
    symptoms,
    source,
    timestamp: new Date().toISOString(),
    disclaimer:
      analysis.disclaimer ||
      "Educational use only. This tool does not diagnose, treat, or replace a licensed clinician.",
    summary: analysis.summary,
    triageLevel,
    severityLabel: severity.label,
    severityDescription: severity.description,
    probableConditions: analysis.probable_conditions,
    recommendedNextSteps: analysis.recommended_next_steps,
    redFlags,
    whenToSeekCare: analysis.when_to_seek_care
  };
}
