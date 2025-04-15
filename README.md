# Character Select SAA
This is a Stand Alone App with AI prompt, Semi-auto Tag Complete and ComfyUI/WebUI API support.    
Now supports 5177 (includes multiple costumes) Character list.   

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/screenshot01.png" width=45% height=45%>   

| Item Support | ComfyUI| WebUI | Forge|
| --- | --- | --- | --- |
| LoRA | Yes | Yes | Yes |
| BREAK | No | Yes | Yes |
| vPred | Yes | Yes(*1) | Yes |
| Refiner | Yes | Yes | Yes |
| Preview | Yes | Yes | Yes |
| Image Color Transfer | Yes | Yes | Yes |
| Image Info to Prompt | Yes(*2) | Yes | Yes |
| Regional Condition | No | No | No |

*1 Dev branch    
*2 Image Saved by Image Saver node   

Try Online Character Select Simple Advanced App [Hugging Face Space](https://huggingface.co/spaces/flagrantia/character_select_saa)    

# One-Click embedded package
In case you don't know how to build your own Python enverment, try the [embeded_env_for_SAA](https://huggingface.co/datasets/flagrantia/character_select_stand_alone_app/resolve/main/embeded_env_for_SAA.zip)    

1. Download and unzip to your computer    
2. Db-click `#run_XX.bat`   
3. Follow setup wizard setup your `model folder` and `API Key`    

# Chinese Translate and Character Verification       
Many thanks to the following people for their selfless contributions, who gave up their valuable time to provide Chinese translation and character data verification. They are listed in no particular order.   
**Silence, 燦夜, 镜流の粉丝, 樱小路朝日, 满开之萤, and two more who wish to remain anonymous.**   

Special thanks    
lanner0403 [WAI-NSFW-illustrious-character-select](https://github.com/lanner0403/WAI-NSFW-illustrious-character-select) 2000+  Verified Character List, please support his WebUI plugin.   
Cell1310  [Illustrious XL (v0.1) Recognized Characters List](https://civitai.com/articles/10242/illustrious-xl-v01-recognized-characters-list) more than 100+ Verified Character List.     

------
# Install and Run 
*IMPORTANT* `Save settings` will NOT overwrite your `settings.json`, it saved as `tmp_settings.json`    
1. Clone the repository to wherever you like   
2. Dbclick `#run_XX.bat`   
3. Follow setup wizard setup your `model folder` and `API Key`    
4. Have fun

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

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/tag_complete.png" width=55% height=55%>   

# New Custom Gallery
Completely redesigned gallery replaces Gradio gallery.     

Supports `Grid Mode`, `Split Mode` and `Full Screen` in browser, press `F11` for `Full Screen`.       

Hightlights:      
`Split Mode`
1. Click on the `BLANK` area of the gallery, will switch images.     
2. Click `Seed` will copy seed to clipboard and override your current seed setting.    
3. Click `Tags` will copy full positive prompts to clipboard.    
4. `Privacy Ball` see bwlow.    

`Full Screen`, `Left` and `Right` arrow to switch images, also supports `Mouse Drag` and `Mouse Scroll Zoom`.     

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/gallery_grid.png" width=25% height=25%><img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/gallery_split.png" width=25% height=25%><img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/gallery_fullscreen.png" width=35% height=35%>   

# Privacy Ball
In case you need share something NSFW, try `Privacy Ball`. You can create 5 `Privacy Balls` for multiple parts, drag them to anywhere you need.    
**WARNING: Privacy Ball is a overlay item, it's not encoded to image. You need screen shot apps to capture the covered image, NOT right click Copy Image.**   

Works on full screen mode.    
Right button drag to adjust `Privacy Ball` size.    
Double click on `Privacy Ball` to close it.   

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/gallery_privacyball.png" width=35% height=35%>   

# Overlay Generate Button, Generating, LoRA Info and Message Overlay
You can drag the `Button`, `Generating` and `LoRA Info` overlay anywhere you like.    
`Button` overlay load by default, you can simply minimize it by click the `Blue` dot, it will hide in the `Top Left` of your browser.    
`Generating` overlay supports `Image Preview`, check `Generate preview interval (0=OFF)` in settings.     
`LoRA Info` overlay, by click the `Red` dot will close it.    
`Message` overlay only appear in the centre of your browser, you can dismiss it by clicking on it, and the error message will be automatically copied to your clipboard.    

------
# Manual Setup by edit settings.json

Model List for model switch    
1. Modify `json/settings.json` 
2. Set `model_path` to your local ComfyUI/WebUI checkpoints folder, make sure use `\\` for Windows      
    2.5. There is a `model_path_2nd` in `settings.json`, if you using WebUI and ComfyUI in same time, set it to another checkpoints folder.     
3. Default is `waiNSFW,waiSHUFFLENOOB`, means it will only accept model name that contains one of those keywords. To use more `wai` models, modify `model_filter_keyword` to `wai`   
4. To use all your local models, modify `model_filter` to `false`    
5. To search subfolder models, modify `search_modelinsubfolder` to `true`    
6. `json.decoder.JSONDecoderError: Invalid ...` means you may use `\` instead `\\`     

Default and custom settings    
1. Your current settings (OC list not included) can be exported as `json/tmp_settings.json` by clicking `Save Settings`    
2. Rename to `settings.json` as default settings    
3. `Load Settings` will override current settings with your `renamed_settings.json`    
4. In case you messed up, just `delete` all json files and restart app      

Original Characters    
1. You can add/remove character in `original_character.json`    
2. I already put some of my OC in it, feel free to use or modify    
3. Original Characters is NOT support thumb image for now   
4. BACKUP `original_character.json` before you feach new version from GitHub    

------
# Right to Left UI
Modify `#run_EN.bat`   
```
@echo off
@set GRADIO_SERVER_PORT=47861
python app_right_to_left.py --english True
pause
```

Modify `#run_CN.bat`   
```
@echo off
@set GRADIO_SERVER_PORT=47861
python app_right_to_left.py
pause
```

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

Or, try [One-Click embedded package](https://github.com/mirabarukaso/character_select_stand_alone_app#one-click-embedded-package)     

### WebUI API works, but WebUI not working anymore!!!
It seems some plugin caused that issue, try update to the latest version.    
Still not working? Unfortunately, you can't use both the API and WebUI in this case unless you uninstall the buggy plugin.   

### WebUI Http 500 / ComfyUI model not found
Make sure you have `waiNSFWIllustrious_v120` model in your `models/Stable-diffusion` folder.    
Check `Setup Model List` section, setup your proper models folder and set `model_filter` to `false`    

