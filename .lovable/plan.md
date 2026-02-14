
# DeepFake Interviewer

An AI-powered voice interviewer that stress-tests whether you truly understand a concept by detecting knowledge gaps, vague language, and bluffing — in real-time.

---

## Page 1: Landing Page & Topic Selection

- Bold, slightly intimidating landing page with tagline: *"Do you really understand it? Let's find out."*
- Three topic cards to choose from: **Neural Networks**, **Databases**, **System Design**
- Each card shows a brief description of what will be tested
- "Start Interview" button that launches the interview session

## Page 2: Interview Session (Core Experience)

### Voice Interview Panel
- Full-screen interview mode with a central animated orb/waveform showing the AI is listening or speaking
- Uses **ElevenLabs Conversational AI Agent** for real-time speech-to-speech interaction
- The AI introduces the topic and asks the user to explain the concept
- Microphone permission prompt with clear UX

### Live Transcript Panel
- Side panel showing the running transcript of the conversation
- User messages and AI follow-up questions displayed in chat format

### Bluff Score Meter
- Animated gauge/bar that updates after each user response
- Shows current bluff probability (0-100%)
- Color transitions from green (honest) → yellow (vague) → red (bluffing)
- When bluff score rises, the AI calls it out: *"You sound confident, but your explanation is becoming less precise."*

### Knowledge Map (Colored Node Grid)
- Grid of concept nodes for the selected topic (hardcoded checklist per topic)
- Each node is color-coded:
  - 🟢 Green = Mentioned clearly with depth
  - 🟡 Yellow = Mentioned but shallow
  - 🔴 Red = Not mentioned / missing
- Updates live as the conversation progresses

## Backend: Gap Detection Engine

- After each user response, the transcript is sent to the **Lovable AI gateway** (via edge function)
- LLM returns structured JSON: concepts mentioned, missing concepts, vagueness score, bluff probability, follow-up question, and knowledge graph updates
- The follow-up question is sent back to the ElevenLabs agent to ask adversarial, targeted questions
- Bluff scoring formula: `(vagueness × 0.4) + (missing_concepts_ratio × 0.4) + (confidence_language × 0.2)`

## Backend: Session Memory (Supabase)

- Each interview session is stored with: topic, transcript, bluff history over time, depth progression, and concept coverage
- Enables the AI to reference earlier answers: *"Earlier you didn't mention gradient descent. Has your understanding changed?"*
- Session results viewable after the interview ends

## Page 3: Results / Post-Interview Summary

- Final bluff score with breakdown
- Complete knowledge map showing coverage
- Depth progression chart showing how understanding evolved during the interview
- List of concepts that were weak or missing
- Option to retry or pick a different topic

---

## Tech Stack

- **ElevenLabs Conversational AI Agent** — real-time voice interviewer (speech-to-speech)
- **Lovable AI Gateway** — gap detection engine (structured JSON extraction via LLM)
- **Supabase (Lovable Cloud)** — session storage and persistent memory
- **React + Tailwind** — clean, polished interview UI
- **Recharts** — bluff score progression and depth charts
