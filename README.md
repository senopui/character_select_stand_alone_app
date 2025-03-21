# Character Select SAA
This is a Stand Alone App with AI prompt, Semi-auto Tag Complete and ComfyUI/WebUI API support.    
Now supports 5058 (includes multiple costumes) Character list.   

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/screenshot01.png" width=45% height=45%>   

Try Online Character Select Simple Advanced App [Hugging Face Space](https://huggingface.co/spaces/flagrantia/character_select_saa)

# One-Click embedded package
In case you don't know how to build your own Python enverment, try the [embeded_env_for_SAA](https://huggingface.co/datasets/flagrantia/character_select_stand_alone_app/resolve/main/embeded_env_for_SAA.zip)    

1. Download and unzip to your computer    
2. Db-click `##quick_start_download_and_force_update_SAA.bat`, wait for Github download        
3. Db-click `#run_XX.bat`, wait for 1st time setup and Github/HF download   
4. Follow setup wizard setup your `model folder` and `API Key`    

# Chinese Translate and Character Verification       
### Many thanks to the following people for their selfless contributions, who gave up their valuable time to provide Chinese translation and character data verification. They are listed in no particular order.
#### Silence, 燦夜, 镜流の粉丝, 樱小路朝日, 满开之萤, and two more who wish to remain anonymous.

Special thanks to [lanner0403](https://github.com/lanner0403/WAI-NSFW-illustrious-character-select) please support his WebUI plugin.   

------
# Install and Run
## *IMPORTANT* `Save settings` will NOT overwrite your `settings.json`, it saved as `tmp_settings.json`    
1. Clone the repository to wherever you like   
2. Dbclick `#run_XX.bat`   
3. Follow setup wizard setup your `model folder` and `API Key`    
4. Have fun

------
# Semi-Auto Tag Complete
Tags credits from [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete/blob/main/tags/danbooru.csv)    

All five input zones support Auto Tag Complete        
Entering the `first few characters` will automatically search for matching tags, starting with `*` will search for tags with a specific ending, and `*tag*` will search for tags that match in the middle.    

Use the `mouse` to select the prompt word, but you can also use the `keyboard up and down` with `Enter` or `Tab` to select, press `Esc` to close the prompt box.     

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/tag_complete.png" width=55% height=55%>   

# New Custom Gallery
Completely redesigned gallery replaces Gradio gallery.     

Supports `Grid Mode`, `Split Mode` and `Full Screen` in browser, press `F11` for `Full Screen`.       

keys:      
In `Split Mode`, click on the `BLANK` area of the gallery, will switch images.     
In `Full Screen`, `Left` and `Right` arrow to switch images, also supports `Mouse Drag` and `Mouse Scroll Zoom`.     

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/gallery_grid.png" width=35% height=35%>   
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/gallery_split.png" width=35% height=35%>   
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/gallery_fullscreen.png" width=35% height=35%>   

------
# Manual Setup by edit settings.json

### Model List for model switch
1. Modify `json/settings.json` 
2. Set `model_path` to your local ComfyUI/WebUI checkpoints folder, make sure use `\\` for Windows      
3. To use more `wai` models, modify `model_filter_keyword` to `wai`   
4. To use all your local models, modify `model_filter` to `false`    
5. To search subfolder models, modify `search_modelinsubfolder` to `true`    
6. `json.decoder.JSONDecoderError: Invalid ...` means you may use `\` instead `\\`     

### Default and custom settings
1. Your current settings (OC list not included) can be exported as `json/tmp_settings.json` by clicking `Save Settings`
2. Rename to `settings.json` as default settings
3. `Load Settings` will override current settings with your `renamed_settings.json`
4. In case you messed up, just `delete` all json files and restart app    

### Original Characters
1. You can add/remove character (who not in list) in `original_character.json`    
2. I already put some of my OC in it, feel free to use or modify    
3. Original Characters is NOT support thumb image for now   
4. BACKUP `original_character.json` before you feach new version from GitHub

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
### Remote   
1. Modify `json/settings.json`, copy and paste your `API KEY` to `remote_ai_api_key`    
2. Set `remote_ai_api_key` to your Remote AI API Key, and keep it only for yourself     
3. Run app       
4. Set `AI Prompt Generator` to `Remote`
5. Set `Remote AI url` to your remote AI API address
6. Set `Remote AI model` to your selected remote model
6.5. Got feed back: *For some DSR1 model provider, you man need change `Remote AI connection timeout` from 30s to 60~120+*
7. Put something in `AI Prompt` e.g. `make character furry, and I want a detailed portrait`     

### Local
1. Make sure you know how to build [Llama.cpp](https://github.com/ggml-org/llama.cpp) yourself, or download them from trusted source   
2. Download Model from [HuggingFace](https://huggingface.co/), recommend GGUF like `oh-dcft-v3.1-claude-3-5-sonnet-20241022.Q8_0` ([Here](https://huggingface.co/mradermacher/oh-dcft-v3.1-claude-3-5-sonnet-20241022-GGUF))   
3. Recommend Server args `llama-server.exe -c 16384 -ngl 40 --port <your local LLM port> --no-mmap -m "<your GGUF model here>`
4. Set `AI Prompt Generator` to `Local`
5. Set `Local Llama.cpp server` to your Local AI address and port    
6. (Optional) You may need to check API settings for any other Local AI service     
7. Put something e.g. `make character furry, and I want a detailed portrait` in `AI Prompt`

------
# API Call for Local Image Generator   
### ComfyUI   
1. Enable `DEV mode` in ComfyUI Settings, and load `examples\workflow_comfyui.png` into your ComfyUI ([FAQ:ComfyUI API not working](https://github.com/mirabarukaso/character_select_stand_alone_app/tree/main#comfyui-api-not-working))    
2. Select `Local Image Generator API` to `ComfyUI`   
3. Make sure `Local Image Generator IP Address:Port` same as your ComfyUI page   
4. Have fun   

### WebUI
1. Enable `API mode` by add ` --api` in `COMMANDLINE_ARGS` (webui-user.bat)   
2. Start WebUI       
3. Select `Local Image Generator API` to `WebUI`   
4. Make sure `Local Image Generator IP Address:Port` same as your WerUI page   
5. Have fun
   
------
# Hires Fix and Image Color Transfer
Please refer to [Image Color Transfer](https://github.com/mirabarukaso/ComfyUI_Mira#image-color-transfer) for more details about Image Color Transfer.   

1. WeuUI will(I think...) download upscale models itself, select any model end with `(W)` will work for WebUI.   
2. Comfyui needs to download upscale models by yourself. Select `Manager`->`Model Manager` and filter with `upscale`, then download them.   
3. Upscale model list can be modity in your `settings.json` -> `api_hf_upscaler_list`    
3.1. For WebUI, copy and paste them from WebUI, and add `(W)` in the end.        
3.2. For ComfyUI, check your model's name from `ComfyUI/models/upscale_models`, and add `(C)` in the end.

------
# FAQ
### Not working???
Install [Python](https://www.python.org/downloads/) 3.11~3.13 recommend.     

Then copy and paste the following command into your command line with Python environment.    
```
py -m pip install -r requirements.txt
```

### ComfyUI API not working???
Load `examples\workflow_comfyui.png` in to your ComfyUI, and make sure you have install all custom nodes below:   

[ComfyUI-Image-Saver](https://github.com/alexopus/ComfyUI-Image-Saver)   
[ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira)   

### WebUI API works, but WebUI not working anymore!!!
It seems some plugin caused that issue, try update to the latest version.    
Still not working? Unfortunately, you can't use both the API and WebUI in this case unless you uninstall the buggy plugin.   

### WebUI Http 500 / ComfyUI model not found
Make sure you have `waiNSFWIllustrious_v110` model in your `models/Stable-diffusion` folder.    
Check `Setup Model List` section, setup your proper models folder and set `model_filter` to `false`    

