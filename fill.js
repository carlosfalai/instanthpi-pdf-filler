#!/usr/bin/env node
/**
 * InstantHPI PDF Filler — give it a fillable PDF and pasted text (a patient
 * conversation or a SOAP note); the AI reads the form's fields and fills
 * them from your text. Unknowns are left blank and flagged — never invented.
 *
 * Usage:
 *   node fill.js <form.pdf> <notes.txt> [out.pdf]
 *
 * Env (any OpenAI-compatible API):
 *   LLM_API_KEY   — your key (DeepSeek, OpenAI, etc.)
 *   LLM_BASE_URL  — default https://api.deepseek.com
 *   LLM_MODEL     — default deepseek-chat
 *
 * PRIVACY: text + field names are sent to the LLM you configure. For real
 * patient data use a BAA-covered endpoint (e.g. AWS Bedrock via a gateway)
 * or a local model (Ollama: LLM_BASE_URL=http://localhost:11434/v1).
 */
const fs = require('fs');
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } = require('pdf-lib');

const [formPath, notesPath, outPath] = process.argv.slice(2);
if (!formPath || !notesPath) {
  console.error('usage: node fill.js <form.pdf> <notes.txt> [out.pdf]');
  process.exit(2);
}
const BASE = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
const MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const KEY = process.env.LLM_API_KEY;
if (!KEY) { console.error('set LLM_API_KEY'); process.exit(2); }

async function llm(messages) {
  const res = await fetch(BASE.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0 }),
  });
  if (!res.ok) throw new Error('LLM HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return (await res.json()).choices[0].message.content;
}

(async () => {
  const pdf = await PDFDocument.load(fs.readFileSync(formPath));
  const form = pdf.getForm();
  const fields = form.getFields().map(f => {
    const type = f instanceof PDFCheckBox ? 'checkbox'
      : f instanceof PDFRadioGroup ? 'radio:' + f.getOptions().join('|')
      : f instanceof PDFDropdown ? 'dropdown:' + f.getOptions().join('|')
      : 'text';
    return { name: f.getName(), type };
  });
  if (!fields.length) { console.error('No fillable AcroForm fields found in this PDF.'); process.exit(1); }
  console.log('Form fields found:', fields.length);

  const notes = fs.readFileSync(notesPath, 'utf8');
  const raw = await llm([
    { role: 'system', content:
      'You fill medical/administrative PDF forms from clinical text. Return ONLY a JSON object ' +
      'mapping field names to values. Rules: use ONLY facts present in the text — NEVER invent; ' +
      'omit fields the text does not answer; checkbox values must be true/false; radio/dropdown ' +
      'values must be one of the listed options verbatim; dates as the form implies (default YYYY-MM-DD); ' +
      'phone numbers as 10 digits.' },
    { role: 'user', content: 'FIELDS:\n' + JSON.stringify(fields, null, 1) + '\n\nTEXT:\n' + notes },
  ]);
  const map = JSON.parse(raw.replace(/^```(json)?|```$/gm, '').trim());

  let filled = 0; const skipped = [];
  for (const f of form.getFields()) {
    const v = map[f.getName()];
    if (v === undefined || v === null || v === '') { skipped.push(f.getName()); continue; }
    try {
      if (f instanceof PDFCheckBox) { v === true || v === 'true' ? f.check() : f.uncheck(); }
      else if (f instanceof PDFRadioGroup || f instanceof PDFDropdown) f.select(String(v));
      else if (f instanceof PDFTextField) f.setText(String(v));
      filled++;
    } catch (e) { skipped.push(f.getName() + ' (' + e.message.slice(0, 40) + ')'); }
  }
  const out = outPath || formPath.replace(/\.pdf$/i, '') + '.filled.pdf';
  fs.writeFileSync(out, await pdf.save());
  console.log('\nFilled ' + filled + '/' + fields.length + ' fields -> ' + out);
  if (skipped.length) console.log('Left blank (not in your text — review manually):\n  ' + skipped.join('\n  '));
  console.log('\nREVIEW BEFORE USING: you sign it, you own it.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
