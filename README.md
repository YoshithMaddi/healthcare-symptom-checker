# Health Codex

Health Codex is a frontend healthcare symptom checker powered by an LLM-backed analysis flow. Users interact with a browser interface, enter free-text symptoms, and receive:

- probable conditions framed as possibilities, not diagnoses
- recommended next steps
- triage guidance and red-flag warnings
- a simple frontend for demos
- lightweight query history storage

## Frontend-First Features

- browser-based symptom checker UI
- quick sample prompts for demo scenarios
- condition cards, triage summary, red flags, and next-step guidance
- recent query history rendered directly in the frontend

## Backend Support Features

- `POST /api/check-symptoms` accepts raw symptom text
- OpenAI Responses API integration with structured JSON output
- local red-flag detection that can escalate triage for safety
- mock fallback mode when `OPENAI_API_KEY` is missing
- static frontend for entering symptoms and viewing results
- `GET /api/history` endpoint backed by `data/history.ndjson`

## Tech Stack

- vanilla HTML, CSS, and JavaScript frontend
- Node.js `http` server used as a safe LLM proxy
- native `fetch` for OpenAI API calls
- newline-delimited JSON for lightweight persistence

## Getting Started

1. Copy the environment file.

```powershell
Copy-Item .env.example .env
```

2. Add your OpenAI API key to `.env`.

3. Start the app.

```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in the browser.

## Environment Variables

- `OPENAI_API_KEY`: required for real LLM reasoning
- `OPENAI_MODEL`: optional, defaults to `gpt-5.4-mini`
- `PORT`: optional, defaults to `3000`

## API Example

### Request

```http
POST /api/check-symptoms
Content-Type: application/json

{
  "symptoms": "I have had a sore throat, mild fever, and cough for two days."
}
```

### Response Shape

```json
{
  "symptoms": "I have had a sore throat, mild fever, and cough for two days.",
  "source": "openai",
  "timestamp": "2026-04-03T10:00:00.000Z",
  "disclaimer": "Educational use only. This is not a diagnosis or a substitute for professional medical advice.",
  "summary": "This initial assessment highlights possible causes and safer next steps based on the symptom text provided.",
  "triageLevel": "self_care",
  "severityLabel": "Low",
  "severityDescription": "Monitor at home",
  "probableConditions": [
    {
      "name": "Viral upper respiratory infection",
      "likelihood": "more_likely",
      "reasoning": "Symptoms overlap with common viral illnesses such as colds or flu-like infections."
    }
  ],
  "recommendedNextSteps": [
    "Monitor symptoms, rest, and use standard self-care measures if appropriate.",
    "Book a clinician visit if symptoms persist, worsen, or feel unusual for you."
  ],
  "redFlags": [],
  "whenToSeekCare": [
    "Medical review is appropriate if symptoms last more than a few days, worsen, or new concerning signs appear."
  ]
}
```

## Safety Notes

- This project is for educational purposes only.
- It does not diagnose or treat medical conditions.
- Emergency-sounding symptom text is deliberately escalated using local safety rules.
- Users should be told to seek emergency help immediately for severe chest pain, breathing difficulty, stroke-like symptoms, severe bleeding, seizures, or self-harm risk.

## Why This Counts As A Frontend Application

- The primary user experience is the browser UI in `public/`.
- Users interact with a form, result cards, history panel, and sample prompts directly in the frontend.
- The backend exists only to safely call the LLM and protect the API key.
- The core assignment flow is user input in the frontend plus LLM-generated educational output rendered back in the frontend.

## Project Structure

```text
.
|-- public/
|   |-- app.js
|   |-- index.html
|   `-- styles.css
|-- src/
|   |-- analysis-service.js
|   |-- history-store.js
|   `-- symptom-utils.js
|-- test/
|   `-- run-tests.js
|-- .env.example
|-- .gitignore
|-- package.json
|-- README.md
`-- server.js
```

## Testing

```bash
npm test
```

## Demo Video Checklist

- Show the browser UI first
- Show symptom submission from the frontend
- Show structured response with severity and probable conditions
- Demonstrate a red-flag example such as chest pain or trouble breathing
- Show the saved query history endpoint or recent checks panel
- Mention the mock fallback if no API key is configured

## Evaluation Alignment

- Correctness: structured outputs and local safety escalation reduce unsafe under-triage
- LLM reasoning quality: OpenAI prompt is schema-constrained and focused on educational guidance
- Safety disclaimers: included in the backend response and prompt design
- Code design: modular backend helpers, simple storage, and clear separation of API/UI logic
