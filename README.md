# Character Select SAA
This is a Stand Alone App with AI prompt and ComfyUI/WebUI API support.     
   
Special thanks to [lanner0403](https://github.com/lanner0403/WAI-NSFW-illustrious-character-select) for providing the role data, please support his webui plugin.   

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/screenshot01.png" width=35% height=35%>   

------
# Reminder: Remote AI moved to ***settings.json***
------

# Install and Run
## *(IMPORTANT)* After success run, click `Save settings` and replace `tmp_settings.json` with `settings.json`
1. Clone the repository to wherever you like   
2. Dbclick `#run_XX.bat`   
3. Open your Chrome/Edge and paste `http://127.0.0.1:47861/`   
4. Have fun   

# Update from git
1. `git fetch` and `git pull`
2. Have fun
3. Upgrade `settings.json`, click `Save settings` and replace `tmp_settings.json` with `settings.json`
4. Optional, backup your current `settings.json` and `original_character.json`, then *DELETE ALL* (other) json files in `json` folder    
------

# Setup Model List for model switch
1. Modify `json/settings.json` 
2. Set `model_path` to your local ComfyUI/WebUI checkpoints folder, make sure use `\\` for Windows      
3. To use more `wai` models, modify `model_filter_keyword` to `wai`   
4. To use all your models, modify `model_filter` to `false`    
5. `json.decoder.JSONDecoderError: Invalid ...` means you may use `\` instead `\\`     

# Default settings and custom settings
1. Your current settings (OC list not included) can be exported as `json/tmp_settings.json` by clicking `Save Settings`
2. Rename to `settings.json` as default settings
3. `Load Settings` will override current settings with your `renamed_settings.json`
4. In case you messed up, just `delete` all json files and restart app    

# Original Characters
1. You can add/remove character (who not in list) in `original_character.json`    
2. I already put some of my OC in it, feel free to use or modify    
3. Original Characters is NOT support thumb image for now   
------

# Right to Left UI
Modify `#run_EN.bat`   
```
@echo off
@set GRADIO_SERVER_PORT=47861
py -m app_right_to_left --english True
pause
```

Modify `#run_CN.bat`   
```
@echo off
@set GRADIO_SERVER_PORT=47861
py -m app_right_to_left
pause
```
------

# AI prompt
## Remote   
1. Modify `json/settings.json`    
2. Set `remote_ai_base_url` `remote_ai_model` `remote_ai_api_key` to your Remote AI     
2.5. Got feed back: *For some DSR1 model provider, you man need change `remote_ai_timeout` from 30s to 60~120+*
3. Restart App    
4. Set `AI Prompt Generator` to `Remote`   
5. Put something e.g. `make character furry, and I want a detailed portrait` in `AI Prompt`
6. You can modify `Remote AI url`, `Remote AI model`, `Remote AI connection timeout` in App   

## Local
1. Make sure you know how to build [Llama.cpp](https://github.com/ggml-org/llama.cpp) yourself, or download them from trusted source   
2. Download Model from [HuggingFace](https://huggingface.co/), recommend GGUF like `Llama-3.3-7B-q8`   
3. Recommend Server args `llama-server.exe -ngl 40 --no-mmap -m "<your GGUF model here>`
4. Set `AI Prompt Generator` to `Local`
5. Modify `Local Llama.cpp server` to your Local AI address    
6. You may need to check API settings for other Local AI service     
7. Put something e.g. `make character furry, and I want a detailed portrait` in `AI Prompt`    
------

# API   
## ComfyUI   
1. Enable `DEV mode` in ComfyUI Settings   
2. Select `Local Image Generator API` to `ComfyUI`   
3. Make sure `Local Image Generator IP Address:Port` same as your ComfyUI page   
4. Have fun   

## WebUI
1. Enable `API mode` by add `--api` in `COMMANDLINE_ARGS` (webui-user.bat)   
2. run it   
3. Select `Local Image Generator API` to `WebUI`   
4. Make sure `Local Image Generator IP Address:Port` same as your WerUI page   
5. Have fun
------

# Hires Fix and Image Color Transfer
## Hires fix now works for WebUI, I'm working on ComfyUI now...   

Please refer to [Image Color Transfer](https://github.com/mirabarukaso/ComfyUI_Mira#image-color-transfer) for more details about Image Color Transfer.   

1. WeuUI will(I think...) download upscale models itself, select any model end with `(W)` will work for WebUI.   
2. Comfyui needs to download upscale models by yourself. Select `Manager`->`Model Manager` and filter with `upscale`, then download them.   
3. Upscale model list can be modity in your `settings.json` -> `api_hf_upscaler_list`    
3.1. For WebUI, copy and paste them from WebUI, and add `(W)` in the end.        
3.2. For ComfyUI, check your model's name from `ComfyUI/models/upscale_models`, and add `(C)` in the end.     
------

# FAQ
## Not working???
You may need few supports lib for python   

```
py -m pip install -r requirements.txt
```

## ComfyUI API not working???
Load `examples\workflow_comfyui.png` in to your ComfyUI, and make sure you have install all custom nodes below:   

[ComfyUI-Image-Saver](https://github.com/alexopus/ComfyUI-Image-Saver)   
[ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira)   

## WebUI API works, but WebUI not working anymore!!!
It seems some plugin caused that issue, try update to the latest version.    
Still not working? Unfortunately, you can't use both the API and WebUI in this case unless you uninstall the buggy plugin.   

## WebUI Http 500 / ComfyUI model not found
Make sure you have `waiNSFWIllustrious_v110` model in your `models/Stable-diffusion` folder.    
Check `Setup Model List` section, setup your proper models folder and set `model_filter` to `false`    

