# InstantHPI PDF Filler — for doctors

Give it any **fillable PDF form** and paste your **patient conversation or
SOAP note**. The AI reads the form's fields and fills them from your text.
What your text doesn't answer is **left blank and flagged — never invented.**
You review, you sign.

Part of **Tools for the Modern Doctor** at https://instanthpi.ai/physicians/

## Quick start

```bash
npm install
set LLM_API_KEY=your-key          # DeepSeek / OpenAI / any compatible API
node fill.js form.pdf notes.txt   # -> form.filled.pdf
```

Works with any OpenAI-compatible endpoint:

| Setup | Env |
|---|---|
| DeepSeek (default, ~free) | `LLM_API_KEY=...` |
| OpenAI | `LLM_BASE_URL=https://api.openai.com/v1` `LLM_MODEL=gpt-4.1` |
| **Local / fully private (Ollama)** | `LLM_BASE_URL=http://localhost:11434/v1` `LLM_MODEL=llama3.1` `LLM_API_KEY=ollama` |

## Privacy — read this

Your pasted text and the form's field names are sent to whatever LLM you
configure. For real patient data either use a **local model** (Ollama row
above — nothing leaves your machine) or a **BAA-covered endpoint**. Never a
consumer API with identifiable patients. See
[SECURITY.md](https://github.com/carlosfalai/free-universal-healthcare-ai/blob/master/SECURITY.md).

## Build the .exe (no Node needed on the clinic machine)

```bash
npm run build-exe   # produces dist/instanthpi-pdf-filler.exe via pkg
```

Then: `instanthpi-pdf-filler.exe form.pdf notes.txt`

## Limits (current version)

- Fills **AcroForm** PDFs (real form fields). Flat/scanned forms have no
  fields to fill — that variant (draw text onto the page) is on the roadmap;
  our practice uses a coordinate-based filler for those.
- Comb fields, weird date formats, and insurer-specific quirks may need a
  manual pass — the tool tells you what it left blank.
- AI can mis-map a field; **review every form before signing.**

MIT — from the InstantHPI ecosystem: https://instanthpi.ai
