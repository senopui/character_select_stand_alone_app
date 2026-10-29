import { app, ipcMain } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import { getGlobalSettings } from './globalSettings.js';

const CAT = '[AiPromptTemplates]';
const appPath = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), 'resources', 'app') : app.getAppPath();
const STORE_PATH = path.join(appPath, 'settings', 'ai', 'templates.json');
const SEED_PATH = path.join(appPath, 'data', 'ai_prompt_templates.json');

const SOURCE_IDS = ['brief', 'common', 'positive', 'positive_right', 'negative', 'character', 'full'];

function readJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) return { missing: true, data: null };
        return { missing: false, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
    } catch (error) {
        console.error(CAT, `Failed to read ${filePath}:`, error.message);
        return { missing: false, data: null, invalid: true };
    }
}

function fallbackNumbers() {
    const settings = getGlobalSettings() || {};
    const timeout = Number(settings.remote_ai_timeout);
    const temperature = Number(settings.ai_local_temp);
    const maxTokens = Number(settings.ai_local_n_predict);
    return {
        model: String(settings.remote_ai_model || 'openai/gpt-6-luna'),
        timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 20,
        temperature: Number.isFinite(temperature) ? temperature : 0.7,
        maxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 768
    };
}

function defaultsFor(id, fallback) {
    if (id === 'natural-brief') {
        return { timeout: 60, temperature: 0.7, maxTokens: 1536, model: fallback.model };
    }
    if (id === 'tag-brief') {
        return { timeout: 20, temperature: 0.7, maxTokens: 256, model: fallback.model };
    }
    if (id === 'character-natural') {
        return { timeout: 40, temperature: 0.7, maxTokens: 768, model: fallback.model };
    }
    return fallback;
}

function storedCharacterSlot(raw, id) {
    const fallback = id === 'character-natural' ? 4 : 1;
    const slot = Number(raw?.characterSlot);
    if (Number.isInteger(slot) && slot >= 1 && slot <= 4) return slot;
    return fallback;
}

function clamp(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
}

function normalizeTemplate(raw, index, fallback) {
    const id = String(raw?.id || `custom-${index}`).trim();
    const preset = defaultsFor(id, fallback);
    const source = SOURCE_IDS.includes(raw?.defaultSource) ? raw.defaultSource : 'brief';
    return {
        id,
        name: String(raw?.name || id).trim() || id,
        defaultSource: source,
        characterSlot: storedCharacterSlot(raw, id),
        model: String(raw?.model || preset.model || fallback.model),
        timeout: clamp(raw?.timeout, 2, 180, preset.timeout),
        temperature: clamp(raw?.temperature, 0, 2, preset.temperature),
        maxTokens: clamp(raw?.maxTokens, 64, 8192, preset.maxTokens),
        systemPrompt: String(raw?.systemPrompt || '')
    };
}

function normalizeList(list) {
    const fallback = fallbackNumbers();
    const seen = new Set();
    const templates = [];
    for (const raw of Array.isArray(list) ? list : []) {
        const template = normalizeTemplate(raw, templates.length, fallback);
        if (seen.has(template.id)) continue;
        seen.add(template.id);
        templates.push(template);
    }
    return templates;
}

function seedTemplates() {
    const seed = readJson(SEED_PATH);
    const templates = normalizeList(seed.data?.templates);
    if (templates.length > 0) return templates;
    console.error(CAT, 'Built-in AI templates are missing.');
    return normalizeList([{
        id: 'tag-brief',
        name: 'Tag scene',
        defaultSource: 'brief',
        systemPrompt: 'Always reply in English. Output one line of comma-separated English tags and nothing else.'
    }]);
}

function builtinTemplates() {
    return seedTemplates().map((item) => structuredClone(item));
}

function writeTemplates(templates) {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const body = JSON.stringify({ templates }, null, 2);
    fs.writeFileSync(STORE_PATH, body, 'utf8');
}

function loadAiPromptTemplates() {
    const stored = readJson(STORE_PATH);
    if (stored.missing || stored.invalid || !stored.data) {
        const templates = seedTemplates();
        try {
            writeTemplates(templates);
        } catch (error) {
            console.error(CAT, 'Failed to write default AI templates:', error.message);
        }
        return { templates, reset: Boolean(stored.invalid) };
    }
    const templates = normalizeList(stored.data.templates);
    if (templates.length === 0) {
        const seeded = seedTemplates();
        writeTemplates(seeded);
        return { templates: seeded, reset: true };
    }
    return { templates, reset: false };
}

function saveAiPromptTemplates(payload) {
    const templates = normalizeList(payload?.templates);
    if (templates.length === 0) {
        console.error(CAT, 'Refusing to save an empty AI template list.');
        return false;
    }
    try {
        writeTemplates(templates);
        return true;
    } catch (error) {
        console.error(CAT, 'Failed to save AI templates:', error.message);
        return false;
    }
}

function setupAiPromptTemplates() {
    ipcMain.handle('load-ai-prompt-templates', async () => loadAiPromptTemplates());
    ipcMain.handle('save-ai-prompt-templates', async (event, payload) => saveAiPromptTemplates(payload));
    ipcMain.handle('load-builtin-ai-templates', async () => builtinTemplates());
    return loadAiPromptTemplates();
}

export {
    setupAiPromptTemplates,
    loadAiPromptTemplates,
    saveAiPromptTemplates,
    builtinTemplates
};
