# Nightmare Bot (DeepFake Interviewer) 😈🎙️

**An AI-powered voice interviewer that stress-tests whether you truly understand a concept** by detecting knowledge gaps, vague language, and bluffing — in real time.

Live demo: https://mind-duelist.lovable.app/ :contentReference[oaicite:0]{index=0}

---

## What it does

Nightmare Bot isn’t a friendly chatbot. It’s an **adversarial interviewer**:

- You pick a topic (Neural Networks / Databases / System Design)
- You explain out loud (voice interview)
- The system analyzes your answer for:
  - **Missing core concepts**
  - **Shallow name-dropping**
  - **Vagueness + confidence language**
  - A **bluff probability score**
- It then **grills you** with targeted follow-ups and updates your **live knowledge map**.

The goal: make “I kinda know it” impossible.

---

## Core Features

### 🎤 Voice Interviewer (ElevenLabs)
- Real-time interview experience using ElevenLabs conversation flow.
- Follow-up questions are injected dynamically based on your last answer.

### 🧠 Gap Detection Engine (LLM)
After each user response, the backend returns structured analysis:
- concepts mentioned clearly vs shallowly
- concepts missing
- vagueness + depth scores
- bluff probability
- next adversarial follow-up question :contentReference[oaicite:1]{index=1}

### 📊 Bluff Score Meter
- Updates after each response
- Color transitions: **Green → Yellow → Red**
- Calls you out when your confidence rises but precision drops

### 🗺️ Live Knowledge Map
- Hardcoded concept checklist per topic
- Nodes update live:
  - 🟢 clear
  - 🟡 shallow
  - 🔴 missing :contentReference[oaicite:2]{index=2}

### 💾 Persistent Session Memory (Supabase)
Each session stores:
- transcript
- bluff history over time
- concept coverage
- session status (in progress/disconnected/completed) :contentReference[oaicite:3]{index=3}

This enables callbacks like:
> “Earlier you didn’t mention X. Has your understanding changed?”

### 🏆 Extras
- Leaderboard mode
- Resume grilling + JD prep flows (WIP / bonus hackathon features)

---

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn-ui :contentReference[oaicite:4]{index=4}
- **Voice:** ElevenLabs via `@elevenlabs/react` :contentReference[oaicite:5]{index=5}
- **Backend / Memory:** Supabase (DB + Auth + Edge Functions) :contentReference[oaicite:6]{index=6}
- **Charts:** Recharts :contentReference[oaicite:7]{index=7}
- **Animation:** Framer Motion :contentReference[oaicite:8]{index=8}

---

## Repo Structure (high level)

- `src/pages/Index.tsx` — landing page + topic selection :contentReference[oaicite:9]{index=9}  
- `src/pages/Interview.tsx` — voice interview, transcript, analysis loop, knowledge map updates :contentReference[oaicite:10]{index=10}  
- `src/integrations/supabase/` — Supabase client + typed DB integration :contentReference[oaicite:11]{index=11}  
- `supabase/` — Supabase project config :contentReference[oaicite:12]{index=12}  

---

## How the “Interview Loop” works

1. User speaks → transcript accumulates
2. Transcript is sent to Supabase Edge Function: `analyze-response`
3. LLM returns analysis JSON (missing/shallow/clear + follow-up question)
4. UI updates:
   - Bluff meter
   - Knowledge map grid
5. Follow-up question is sent back to ElevenLabs via contextual update :contentReference[oaicite:13]{index=13}

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 18+
- A Supabase project (or the one configured for this repo)
- ElevenLabs agent set up in the ElevenLabs dashboard
- Supabase Edge Functions deployed:
  - `analyze-response`
  - `elevenlabs-signed-url` :contentReference[oaicite:14]{index=14}

### 1) Install
```bash
git clone https://github.com/ritxz21/Nightmare-Bot.git
cd Nightmare-Bot
npm install

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
