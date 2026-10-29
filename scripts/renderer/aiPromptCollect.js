import { composePositiveForAi, readFixedCharacterTag } from './generate.js';
import { composeRegionalForAi } from './generate_regional.js';

const SOURCE_IDS = ['brief', 'common', 'positive', 'positive_right', 'negative', 'character', 'full'];

function regionalOn() {
    return Boolean(globalThis.globalSettings?.regional_condition);
}

function characterListForSource() {
    if (regionalOn() && globalThis.characterListRegional?.getKey) {
        return {
            list: globalThis.characterListRegional,
            ocIndexes: new Set([2, 3])
        };
    }
    return {
        list: globalThis.characterList,
        ocIndexes: new Set([3])
    };
}

export function collectAiSource(source, brief, characterSlot) {
    const id = SOURCE_IDS.includes(source) ? source : 'brief';
    if (id === 'brief') {
        return { ok: Boolean(String(brief || '').trim()), text: String(brief || '').trim(), error: 'empty' };
    }
    if (id === 'common') {
        const text = String(globalThis.prompt?.common?.getValue?.() || '').trim();
        return { ok: Boolean(text), text, error: 'empty' };
    }
    if (id === 'positive') {
        const text = String(globalThis.prompt?.positive?.getValue?.() || '').trim();
        return { ok: Boolean(text), text, error: 'empty' };
    }
    if (id === 'positive_right') {
        const text = String(globalThis.prompt?.positive_right?.getValue?.() || '').trim();
        return { ok: Boolean(text), text, error: 'empty' };
    }
    if (id === 'negative') {
        const text = String(globalThis.prompt?.negative?.getValue?.() || '').trim();
        return { ok: Boolean(text), text, error: 'empty' };
    }
    if (id === 'character') {
        const { list, ocIndexes } = characterListForSource();
        const slot = Number.isInteger(characterSlot) ? characterSlot : 0;
        const tag = readFixedCharacterTag(list, slot, ocIndexes);
        if (tag === null) return { ok: false, text: '', error: 'random' };
        const text = String(tag || '').trim();
        return { ok: Boolean(text), text, error: 'empty' };
    }

    if (regionalOn()) {
        const { left, right } = composeRegionalForAi();
        const text = `LEFT:\n${left || ''}\n\nRIGHT:\n${right || ''}`.trim();
        return { ok: Boolean(left || right), text, error: 'empty' };
    }
    const text = String(composePositiveForAi() || '').trim();
    return { ok: Boolean(text), text, error: 'empty' };
}
