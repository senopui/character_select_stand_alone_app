const { app, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('fs');
const { dialog } = require('electron');

const CAT = '[TagAutoCompleteBackend]';
const appPath = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), 'resources', 'app') : app.getAppPath();

class PromptManager {
    constructor(promptFilePath, translateFilePath = null, useTranslate = false) {
        this.prompts = [];
        this.promptFilePath = promptFilePath;
        this.translateFilePath = translateFilePath;
        this.useTranslate = useTranslate;
        this.lastCustomPrompt = "";
        this.previousCustomPrompt = "";
        this.dataLoaded = false;
    }

    async loadPrompts(promptFilePath, translateFilePath = null, useTranslate = false) {    
        this.useTranslate = useTranslate;
        try {
            const promptData = fs.readFileSync(promptFilePath, 'utf-8');
            this.parsePromptData(promptData);

            if (this.useTranslate && translateFilePath) {
                console.log(CAT, `Using translate file ${translateFilePath}`);
                const translateData = fs.readFileSync(translateFilePath, 'utf-8');
                this.parseTranslateData(translateData);
            }

            this.sortPromptsByHeat();
            this.dataLoaded = true;
            console.log(CAT, `Loaded ${this.prompts.length} prompts.`);
        } catch (error) {
            console.error(CAT, `Error loading prompts: ${error.message}`);
            this.dataLoaded = false;
        }
    }

    parsePromptData(promptData) {
        const lines = promptData.split('\n').filter(line => line.trim());
        for (const line of lines) {
            const promptInfo = this.parseLine(line);
            if (promptInfo) {
                this.prompts.push(promptInfo);
            }
        }
    }

    parseLine(line) {
        const parts = line.split(',', 4);
        if (parts.length < 2) return null;

        const prompt = parts[0].trim();
        const group = this.parseNumber(parts[1]);
        const heat = parts.length > 2 ? this.parseNumber(parts[2]) : 0;
        const aliases = parts.length > 3 ? parts[3].trim().replace(/(^")|("$)/g, '') : "";

        return {
            prompt,
            group: heat === 0 ? 0 : group,
            heat: heat === 0 ? group : heat,
            aliases
        };
    }

    parseNumber(value) {
        const match = /^\d+$/.exec(value.trim());
        return match ? parseInt(match[0]) : 0;
    }

    parseTranslateData(translateData) {
        const translateLines = translateData.split('\n').filter(line => line.trim());
        const promptDict = Object.fromEntries(this.prompts.map(p => [p.prompt, p]));

        let index = 0;
        for (const line of translateLines) {
            index++;
            const parts = line.split(',', 3);
            if (parts.length < 3) {
                console.log(CAT, `Skipping invalid line ${index}: ${line}`);
                continue;
            }

            const prompt = parts[0].trim();
            const group = parts[1].trim().match(/^\d+$/) ? parseInt(parts[1]) : 0;
            const newAliases = parts[2].trim();

            if (prompt in promptDict) {
                const existing = promptDict[prompt];
                if (existing.aliases) {
                    const existingAliases = new Set(existing.aliases.split(','));
                    const newAliasesSet = new Set(newAliases.split(','));
                    existing.aliases = [...existingAliases, ...newAliasesSet].join(',');
                } else {
                    existing.aliases = newAliases;
                }
            } else {
                this.prompts.push({
                    prompt,
                    group,
                    heat: 1,
                    aliases: newAliases
                });
                promptDict[prompt] = this.prompts[this.prompts.length - 1];
            }
        }
    }

    sortPromptsByHeat() {
        this.prompts.sort((a, b) => b.heat - a.heat);
    }

    async reloadData() {
        console.log(CAT, `Reloading prompts from ${this.promptFilePath} and ${this.translateFilePath}...`);
        this.prompts = [];
        this.lastCustomPrompt = "";
        this.previousCustomPrompt = "";
        await this.loadPrompts(this.promptFilePath, this.translateFilePath);
    }

    getSuggestions(text) {
        if (!text) return [];

        const parts = text.split(',');
        const lastWord = parts[parts.length - 1].trim().toLowerCase();

        if (!lastWord) return [];

        const matches = {};
        for (const promptInfo of this.prompts) {
            const prompt = promptInfo.prompt.toLowerCase();
            const aliases = promptInfo.aliases ? promptInfo.aliases.toLowerCase().split(',') : [];

            const matchedAlias = this.matchPrompt(lastWord, prompt, aliases);

            if (this.shouldAddMatch(matchedAlias, lastWord, prompt)) {
                this.addMatch(matches, promptInfo, matchedAlias, prompt);
            }

            if (Object.keys(matches).length >= 50) break;
        }

        return Object.values(matches).sort((a, b) => b.heat - a.heat);
    }

    matchPrompt(lastWord, prompt, aliases) {
        if (lastWord.includes('*')) {
            return this.handleWildcardMatching(lastWord, prompt, aliases);
        } else if (!prompt.startsWith(lastWord)) {
            return aliases.find(alias => alias.trim().startsWith(lastWord)) || null;
        }
        return null;
    }

    handleWildcardMatching(lastWord, prompt, aliases) {
        if (lastWord.startsWith('*') && lastWord.endsWith('*')) {
            const pattern = lastWord.slice(1, -1);
            if (!prompt.includes(pattern)) {
                return aliases.find(alias => alias.trim().includes(pattern)) || null;
            }
        } else if (lastWord.startsWith('*')) {
            const pattern = lastWord.slice(1);
            if (!prompt.endsWith(pattern)) {
                return aliases.find(alias => alias.trim().endsWith(pattern)) || null;
            }
        } else if (lastWord.endsWith('*')) {
            const pattern = lastWord.slice(0, -1);
            if (!prompt.startsWith(pattern)) {
                return aliases.find(alias => alias.trim().startsWith(pattern)) || null;
            }
        }
        return null;
    }

    shouldAddMatch(matchedAlias, lastWord, prompt) {
        return matchedAlias !== null ||
            (matchedAlias === null && lastWord.includes('*') && prompt.includes(lastWord.slice(1, -1))) ||
            (matchedAlias === null && !lastWord.includes('*') && prompt.startsWith(lastWord));
    }

    addMatch(matches, promptInfo, matchedAlias, prompt) {
        if (!(prompt in matches) || promptInfo.heat > matches[prompt].heat) {
            const aliasDisplay = matchedAlias || (promptInfo.aliases ? promptInfo.aliases.split(',').map(a => a.trim()).join(', ') : '');
            matches[prompt] = {
                prompt: promptInfo.prompt,
                heat: promptInfo.heat,
                alias: aliasDisplay || null
            };
        }
    }

    updateSuggestions(text) {
        if (!this.dataLoaded) {
            console.log(CAT, `No data loaded. Returning empty dataset.`);
            return [];
        }

        const items = [];
        const currentParts = text ? text.replace(/\n/g, ',').split(',') : [];
        const previousParts = this.previousCustomPrompt ? this.previousCustomPrompt.split(',') : [];

        let modifiedIndex = -1;
        for (let i = 0; i < Math.min(currentParts.length, previousParts.length); i++) {
            if (currentParts[i].trim() !== previousParts[i].trim()) {
                modifiedIndex = i;
                break;
            }
        }

        if (modifiedIndex === -1 && currentParts.length > previousParts.length) {
            modifiedIndex = currentParts.length - 1;
        }

        let matches = [];
        if (modifiedIndex >= 0 && modifiedIndex < currentParts.length) {
            const targetWord = currentParts[modifiedIndex].trim();
            matches = this.getSuggestions(targetWord);
        }

        for (const match of matches) {
            const key = match.alias
                ? `<b>${match.prompt}</b>: (${match.alias}) (${match.heat})`
                : `<b>${match.prompt}</b> (${match.heat})`;
            items.push([key]);
        }

        this.previousCustomPrompt = this.lastCustomPrompt;
        this.lastCustomPrompt = text;

        return items;
    }
}

const tagBackend = new PromptManager();
async function setupTagAutoCompleteBackend(){
    const tags = path.join(appPath, 'data', 'danbooru.csv');
    const translate = path.join(appPath, 'data', 'danbooru_zh_cn.csv');
    const isTranslateFile = fs.existsSync(translate);

    if (fs.existsSync(tags))
    {
        await tagBackend.loadPrompts(tags, isTranslateFile?translate:null, isTranslateFile);

        ipcMain.handle('tag-reload', async () => {
            await tagBackend.reloadData();
            return tagBackend.dataLoaded;
        });

        ipcMain.handle('tag-get-suggestions', async (event, text) => {            
            return tagBackend.updateSuggestions(text);
        });

        return tagBackend.dataLoaded;
    }

    console.error(CAT, "Tag file not found: ", tags);
    dialog.showErrorBox(CAT, `Tag file not found: ${tags}`);
    return false;
}

module.exports = {
    setupTagAutoCompleteBackend
};

