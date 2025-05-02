const CAT = '[AiPrompt]';

let lastAIPromot = '';

async function remoteGenerateWithPrompt() {
    try {
        const options = {
            apiUrl: window.ai.remote_address.getValue(),
            apiKey: window.ai.remote_apikey.getValue(),
            modelSelect: window.ai.remote_model_select.getValue(),
            userPrompt: window.prompt.ai.getValue(),
            systemPrompt: window.ai.ai_system_prompt.getValue(),
            timeout: window.ai.remote_timeout.getValue() * 1000
        };
        const result = await window.api.remoteAI(options);

        if(result.startsWith('Error:')){
            console.error(CAT, 'Request remote AI failed:', result);
            return '';
        }
        
        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
        } catch (error) {
            console.error(CAT, 'Failed to parse JSON response:', error.message);
            return '';
        }

        const content = parsedResult?.choices?.[0]?.message?.content;
        if (!content) {
            console.error(CAT, 'Content not found in response:', parsedResult);
            return '';
        }

        return content;
    } catch (error) {
        console.error(CAT, 'Request remote AI failed:', error.message);
        return '';
    }
}

async function localGenerateWithPrompt() {
    try {
        const options = {
            apiUrl: window.ai.local_address.getValue(),
            userPrompt: window.prompt.ai.getValue(),
            systemPrompt: window.ai.ai_system_prompt.getValue(),
            temperature: window.ai.local_temp.getValue(),
            n_predict:window.ai.local_n_predict.getValue(),
            timeout: window.ai.remote_timeout.getValue() * 1000
        };
        const result = await window.api.localAI(options);

        if(result.startsWith('Error:')){
            console.error(CAT, 'Request local AI failed:', result);
            return '';
        }
        
        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
        } catch (error) {
            console.error(CAT, 'Failed to parse JSON local response:', error.message);
            return '';
        }

        const content = parsedResult?.choices?.[0]?.message?.content;
        if (!content) {
            console.error(CAT, 'Content not found in local response:', parsedResult);
            return '';
        }

        return content;
    } catch (error) {
        console.error(CAT, 'Request local AI failed:', error.message);
        return '';
    }
}


export async function getAiPrompt(loop, overlay_generate_ai) {
    const currentInterface = window.ai.interface.getValue();
    const currentRole = window.ai.ai_select.getValue();

    if(currentRole === 0)   // None
        return '';
    else if(currentRole === 1 && loop !== 0)   // Once 
        return lastAIPromot;
    else if(currentRole === 3 )   // Last
        return lastAIPromot;    
    if (currentInterface.toLowerCase() === 'none') {
        return '';
    } else if (currentInterface.toLowerCase() === 'remote') {     
        window.generate.loadingMessage = overlay_generate_ai;
        lastAIPromot = await remoteGenerateWithPrompt();        
    } else {
        window.generate.loadingMessage = overlay_generate_ai;
        lastAIPromot = await localGenerateWithPrompt();
    }    
    return lastAIPromot;
}