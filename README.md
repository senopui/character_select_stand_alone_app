# Character Select SAA
## SAA now switch to Electron, Readme & Guides are working in progress....

This is a Stand Alone App with AI prompt, Semi-auto Tag Complete and ComfyUI/WebUI API support.    
Now supports 5177 (includes multiple costumes) Character list.   

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/overall01.png" width=45% height=45%>   

| Item Support | ComfyUI| WebUI | Forge|
| --- | --- | --- | --- |
| LoRA | Yes | Yes | Yes |
| BREAK | No | Yes | Yes |
| vPred | Yes | Yes | Yes |
| Refiner | Yes | Yes | Yes |
| Preview | Yes | Yes | Yes |
| Image Color Transfer | Yes | No | No |
| Image Info to Prompt | Yes(*2) | Yes | Yes |
| Regional Condition | No | No | No |

Try Online Character Select Simple Advanced App [Hugging Face Space](https://huggingface.co/spaces/flagrantia/character_select_saa)    

## One-Click embedded package
~In case you don't know how to build your own Python enverment, try the [embeded_env_for_SAA](https://huggingface.co/datasets/flagrantia/character_select_stand_alone_app/resolve/main/embeded_env_for_SAA.zip)~
*WIP*    

# Chinese Translate and Character Verification       
Many thanks to the following people for their selfless contributions, who gave up their valuable time to provide Chinese translation and character data verification. They are listed in no particular order.   
**Silence, 燦夜, 镜流の粉丝, 樱小路朝日, 满开之萤, and two more who wish to remain anonymous.**   

Special thanks    
lanner0403 [WAI-NSFW-illustrious-character-select](https://github.com/lanner0403/WAI-NSFW-illustrious-character-select) 2000+  Verified Character List, please support his WebUI plugin.   
Cell1310  [Illustrious XL (v0.1) Recognized Characters List](https://civitai.com/articles/10242/illustrious-xl-v01-recognized-characters-list) more than 100+ Verified Character List.     

------
# Install and Run 
*WIP*    
Clone,then `npm start` ?   
Just wait for my Release         

------
# LoRA Support 
Once you have setup model folder, the system will automatically search the relative LoRA directory according to the API type and update the LoRA list.    
WebUI supports it's default LoRA prompt style.    
ComfyUI supports more detailed configuration of LoRA, for more information please refer to [LoRA from Text](https://github.com/mirabarukaso/ComfyUI_Mira#lora).    
Also support check LoRA info by click `?` button in LoRA tab. And, if there's a same named PNG file with LoRA, the image will show in LoRA info page.       

**To use LoRA in ComfyUI API, you need update your ComfyUI_Mira node to at least 0.4.9.2**   

# Semi-Auto Tag Complete
Tags credits from [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete/blob/main/tags/danbooru.csv)    

All five input zones support Auto Tag Complete        
Entering the `first few characters` will automatically search for matching tags, starting with `*` will search for tags with a specific ending, and `*tag*` will search for tags that match in the middle.    

Use the `mouse` to select the prompt word, but you can also use the `keyboard up and down` with `Enter` or `Tab` to select, press `Esc` to close the prompt box.     

Weight adjust    
You can use `ctrl + up` and `ctrl + down` arrow to adjust the weight of the current tag, or you can adjust the weight of multiple tags by selecting a fragment, the usage is similar to comfyui and webui, but some details of the logic may be different.    

------
# AI prompt
Remote   
1. Modify `json/settings.json`, copy and paste your `API KEY` to `remote_ai_api_key`    
2. Set `remote_ai_api_key` to your Remote AI API Key, and keep it only for yourself     
3. Run app       
4. Set `AI Prompt Generator` to `Remote`    
5. Set `Remote AI url` to your remote AI API address    
6. Set `Remote AI model` to your selected remote model    
    6.5. *For some DSR1 model provider, you man need change `Remote AI connection timeout` from 30s to 60~120+*    
7. Put something in `AI Prompt` e.g. `make character furry, and I want a detailed portrait`        

Local    
1. Make sure you know how to build [Llama.cpp](https://github.com/ggml-org/llama.cpp) yourself, or download them from trusted source   
2. Download Model from [HuggingFace](https://huggingface.co/), recommend GGUF like `oh-dcft-v3.1-claude-3-5-sonnet-20241022.Q8_0` ([Here](https://huggingface.co/mradermacher/oh-dcft-v3.1-claude-3-5-sonnet-20241022-GGUF))   
3. Recommend Server args `llama-server.exe -c 16384 -ngl 40 --port <your local LLM port> --no-mmap -m "<your GGUF model here>`    
4. Set `AI Prompt Generator` to `Local`    
5. Set `Local Llama.cpp server` to your Local AI address and port      
6. (Optional) You may need to check API settings for any other Local AI service        
7. Put something e.g. `make character furry, and I want a detailed portrait` in `AI Prompt`   

------
# API Call for Local Image Generator   
ComfyUI    
1. Enable `DEV mode` in ComfyUI Settings, and load `scripts\workflow_api_new.json` into your ComfyUI, make sure you have install [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) **v0.4.9.2** or above from ComfyUI Custom Node Manager.         
2. Select `Local Image Generator API` to `ComfyUI`   
3. Make sure `Local Image Generator IP Address:Port` same as your ComfyUI page   
4. Have fun   

WebUI    
1. Enable `API mode` by add ` --api` in `COMMANDLINE_ARGS` (webui-user.bat)   
2. Start WebUI       
3. Select `Local Image Generator API` to `WebUI`   
4. Make sure `Local Image Generator IP Address:Port` same as your WerUI page   
5. Have fun    
   
------
# Hires Fix and Image Color Transfer
Please refer to [Image Color Transfer](https://github.com/mirabarukaso/ComfyUI_Mira#image-color-transfer) for more details about Image Color Transfer.   

*Due to lack of generate rule and missing openCV, Color transfer no longer support in WebUI*

1. WeuUI will(I think...) download upscale models itself, select any model end with `(W)` will work for WebUI.   
2. Comfyui needs to download upscale models by yourself. Select `Manager`->`Model Manager` and filter with `upscale`, then download them.   
3. Upscale model list can be modity in your `settings.json` -> `api_hf_upscaler_list`    
3.1. For WebUI, copy and paste them from WebUI, and add `(W)` in the end.        
3.2. For ComfyUI, check your model's name from `ComfyUI/models/upscale_models`, and add `(C)` in the end.

------
# FAQ
*WIP*   