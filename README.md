## SAA now supports browser UI for Chrome and Edge.
For more information check [README_SAAC.md](https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/README_SAAC.md)     

# Character Select SAA
### If you find a character that isn't show on the list but can be generated correctly, please don't hesitate to let me know.

This is a Stand Alone App with AI prompt, Semi-auto Tag Complete and ComfyUI/WebUI(A1111) API support.    
Now supports 5328 (includes multiple costumes) Characters in list.   

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/overall01.png" width=45%>   

| Item Support | ComfyUI| A1111(WebUI) | Forge|
| --- | --- | --- | --- |
| LoRA | Yes | Yes | Yes |
| BREAK | No | Yes | Yes |
| Refiner | Yes | Yes | Yes |
| Image Color Transfer | Yes | No | No |
| Regional Condition | Yes | No | No |
| ControlNet/IPA | Yes | Yes | No |
| API authentication| No | Yes | Yes |

Try Online Character Select Simple Advanced App [Hugging Face Space](https://huggingface.co/spaces/flagrantia/character_select_saa)    

## Install and run
Setup your [API Call](https://github.com/mirabarukaso/character_select_stand_alone_app#api-call-for-local-image-generator) before you start SAA.     

Important: For ComfyUI, you need [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) for SAA.     

Clone this repo into your local folder     
```
git clone https://github.com/mirabarukaso/character_select_stand_alone_app.git
cd character_select_stand_alone_app
npm install
npm start
```

*One-Click package v1.15.2*    
In case ... never mind, the full package [embeded_env_for_SAA](https://huggingface.co/datasets/flagrantia/character_select_stand_alone_app/resolve/main/embeded_env_for_SAA.zip)      

## Update
The `One-Click package` may not the latest version. If you need to update, please use the GitHub clone version with following command instead.     
```
git fetch
git pull
npm install
```
**REMINDER:Updating version from github will not update the database files `danbooru_e621_merged.csv` and `wai_character_thumbs.json`.**    
Update to the latest version, then manually delete the `danbooru_e621_merged.csv` and `wai_character_thumbs.json` file. Restart the app to automatically download the latest thumbnail database from HF.      

# Chinese Translate and Character Verification       
Many thanks to the following people for their selfless contributions, who gave up their valuable time to provide Chinese translation and character data verification. They are listed in no particular order.   
**Silence, 燦夜, 镜流の粉丝, 樱小路朝日, 满开之萤, and two more who wish to remain anonymous.**   

Special thanks    
lanner0403 [WAI-NSFW-illustrious-character-select](https://github.com/lanner0403/WAI-NSFW-illustrious-character-select) 2000+  Verified Character List, please support his plugin.   
Cell1310  [Illustrious XL (v0.1) Recognized Characters List](https://civitai.com/articles/10242/illustrious-xl-v01-recognized-characters-list) more than 100+ Verified Character List.     
mobedoor [#23 MIssing characters](https://github.com/mirabarukaso/character_select_stand_alone_app/issues/23)       
     
------
# Highlights
## Image Tagger
Supports [WD@SmilingWolf](https://huggingface.co/SmilingWolf), [CL@cella110n](https://huggingface.co/cella110n/cl_tagger) and [Camie@Camais03](https://huggingface.co/spaces/Camais03/camie-tagger-v2-app) models in ONNX format.             

Download models with tags from [HF](https://huggingface.co), manually rename them according to the following rules, then copy them into `models/tagger` folder:      
  - cl_tagger_v2.onnx + cl_tagger_v2_tag_mapping.json    
  - wd-eva02-large-tagger-v3.onnx + wd-eva02-large-tagger-v3_selected_tags.csv    
  - wd-v1-4-convnext-tagger.onnx + wd-v1-4-convnext-tagger_selected_tags.csv    

```
SAA
|---models
|   |---tagger
|       |---cl_tagger_1_02.onnx
|       |---cl_tagger_1_02_tag_mapping.json
|       |---wd-eva02-large-tagger-v3.onnx
|       |---wd-eva02-large-tagger-v3_selected_tags.csv
|       |---wd-vit-large-tagger-v3.onnx
|       |---wd-vit-large-tagger-v3_selected_tags.csv
|       |---camie-tagger-v2.onnx
|       |---camie-tagger-v2-metadata.json

Options:
Model Name  >>>  General Threshold(CL/WD/Camie)  >>>  Character Threshold(CL/WD)  >>> Categories(CL/Camie) or mCut(WD)      
```

The Image Tagger running on Node.JS with `onnxruntime-node`. *It DOES NOT require any backend support* But, GPU acceleration seems not working      
The `Generate Speed` is about 3 times slower than `Python` with `onnxruntime` in CPU mode, and 12 times slower than `onnxruntime-gpu`         

In other words with my i9-9960x with Titan RTX    
The good news is, you can run `Image tagger` during gegenerate       
| Device | Avg Tagging Time | Model | Platform | Resolution | Recommend Value |
| --- | --- | --- | --- | --- | --- | 
| onnxruntime | 1.053s | cl_tagger_1_02 | Python | 448 | 0.55/0.60 |
| onnxruntime-gpu | 0.297s | cl_tagger_1_02 | Python | 448 | 0.55/0.60 |
| onnxruntime-node | 3.185s | cl_tagger_1_02 | Electron(NodeJS@CPU) | 448 | 0.55/0.60 |
| onnxruntime-node | 2.917s | wd-eva02-large-tagger-v3 | Electron(NodeJS@CPU) | 448 | 0.35/0.85 |
| onnxruntime-node | 2.113s | camie-tagger-v2 | Electron(NodeJS@CPU) | 512 |  0.50/(NOT USE) |

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/imageTagger.png" width=35%>   

## ControlNet / IP Adapter (ComfyUI & A1111)
*For ComfyUI*     
Upgrade your [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) version to `0.4.9.6 or above`      

`ControlNet` requires [comfyui_controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux)       
Put your `ControlNet` models in `ComfyUI\\models\\controlnet`      

`IP Adapter` requires [comfyui-art-venture](https://github.com/sipherxyz/comfyui-art-venture) and [ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus)       
Put your `Clip Vision` models in `ComfyUI\\models\\clip_vision`      
Put your `IP Adapter` models in `ComfyUI\\models\\ipadapter`      
I didn't test too much on IPA, but for `SDXL/ilXL/NoobXL` recommends `CLIP-ViT-bigG-14-laion2B-39B-b160k.safetensors` with `ipa_styleIpadapterFor_NoobAI-XL_v10.safetensors`. You may also need `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`           
Only the first `IP Adapter` slot will accept by ComfyUI, others set to `On` will ignore.     

*For A1111(WebUI)*      
Requires [sd-webui-controlnet](https://github.com/Mikubill/sd-webui-controlnet).      
Put your `ControlNet` and `IP Adapter` models in `stable-diffusion-webui\\extensions\\sd-webui-controlnet\\models`, the extension plugin path.       

Forge will not be supported. Tired to treat Forge and A1111 as two different backends, but API doesn't work well, and no documents at all... :(      

1. Drag and drop (or click `Add` then `Paste`) your Image(or openPose image) to SAA/SAAC `Image Info`, select `Pre-processor`, `Resolution`, `Post-processor` and then click `Add ControlNet`. After it says `Added` the previre image will swap to your `Pre-processed` image, close `Image info` window, check `ControlNet` tab for more settings. **Hover your mouse over a dropdown/text item to view its feature.**                 
2. In `ControlNet` tab, you can change `Pre-processor` by select the a one and click `Refresh` to generate it and update preview. (Or set `Method` to `On` but SAA preview will not update).      
3. Because images are too big to save in settings file, so `ControlNet` settings will not save when SAA close, but also select another settings will not override current `ControlNet` settings.      
4. `ControlNet` works on normal and regional conditon.       
5. If you are new to `ControlNet`, try `Canny` or `OpenPose` first.      
6. ComfyUI *D-O-E-S N-O-T* like submitting the same data, you may receive an `Empty response error` when submit same data.       
7. ComfyUI [comfyui-art-venture](https://github.com/sipherxyz/comfyui-art-venture) requires a `square image`, you may get warnings with NOT square image input.      
8. In case of your IPA image is too big, the `Resolution` selection for `IP Adapter` will resize your input image to target size, `1024` is enough for most case.      
9. The `Info` button is not working when `Pre-Process Model` select to  `IP Adapter`      

All `Pre-processor` models are managed by  [comfyui_controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux)(ComfyUI) and [sd-webui-controlnet](https://github.com/Mikubill/sd-webui-controlnet)(A1111),  most models will download from Hugging Face.      
All `Post-processor` models, aka the `Apply ControlNet Model` you need download by yourself from `ComfyUI Model Manager` or Hugging Face.      

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/controlnet.png" width=35%>   

## JSON/CSV List
Support `*.json` and `*.csv` files, just drag and drop (or click `Add` then `Paste`) those file info `Image Info` window. File format please refer to `wai_characters.csv` and `wai_tag_assist.json`, try drag them into SAA.     
`__Random__`, randomly selects an item from the list without a seed bound, works for `Single` and `Batch (Random)`  generate mode.          
`__Enumerate__`, enumerates every item one by one and only works in `Batch (Random)` mode, in `Single` it downgrade to `__Random__`             

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/json-csv.png" width=35%>   

## Wildcards    
Supports `*.txt` wildcard files, copy your wildcards into `resources\app\data\wildcards`      
By default, wildcards are randomly selected using the current seed. If `wildcard random seed` is `Checked`, a new random seed will be generated for every selection every time.      
**Subfolder is not supported**     

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/wildcards.png" width=35%>   

## Regional Condition (ComfyUI only)
Get tired of [complex workflow](https://github.com/mirabarukaso/ComfyUI_Mira/issues/12#issuecomment-2727190727)?      
Try SAA Regional Condition with only 3 steps:     
1. Click the `Regional Condition` Checkbox     
2. Choose listed character or your OC      
3. Start `common prompt` with `duo, masterpiece, best quality, amazing quality`(Don't forget quality words like me), have fun!     

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/regionalCondition.png" width=35%>   

## LoRA Slot 
WebUI(A1111) supports it's default LoRA prompt style `<lora:xxxxx:1.0>`.    
ComfyUI supports more detailed configuration of LoRA, for more information please refer to [LoRA from Text](https://github.com/mirabarukaso/ComfyUI_Mira#lora).    
Also support check LoRA info by click the 'i' button in LoRA Slot. And, if there's a same named PNG file with LoRA, the image will show in LoRA info page.       

**To use LoRA in ComfyUI API, you need update your ComfyUI_Mira node to at least 0.4.9.2**    

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/loraSlot.png" width=45%>   

## Semi-Auto Tag Complete
Tags credits from [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete/blob/main/tags/danbooru_e621_merged.csv)    

Entering the `first few characters` will automatically search for matching tags, starting with `*` will search for tags with a specific ending, and `*tag*` will search for tags that match in the middle.    
Use `mouse` to select the prompt word, but you can also use the `keyboard up and down` with `Enter` or `Tab` to select, press `Esc` to close the prompt box.     
`ctrl + up` and `ctrl + down` arrow to adjust the weight of the current tag, or adjust multiple tags by selecting a fragment, the usage is similar to comfyui and webui, but some details of the logic may be different.      

Supports English and Chinese(translate file required) tag search.     
**Special thanks to Kiratian(天痕) for helping to translate the tags into Chinese version.**

| Mark | ID | Category | Group |
| --- | --- | --- |  --- | 
| `[G]` | 0 | General | Danbooru |
| `[A]` | 1 | Artist | Danbooru |
| `[©]` | 3 | Copyright | Danbooru |
| `[C]` | 4 | Character | Danbooru |
| `[M]` | 5 | Meta | Danbooru |
| `<G>` | 7 | General | E621 |
| `<A>` | 8 | Artist | E621 |
| `<©>` | 10 | Copyright | E621 |
| `<C>` | 11 | Character | E621 |
| `<S>` | 12 | Species | E621 |
| `<M>` | 14 | Meta | E621 |
| `<L>` | 15 | Lore | E621 |
| `Wildcards` | 255 | Wildcards | SAA |

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/tagAutoComplete.png" width=45%>   

## Image info
Drag and drop your image into SAA window, supports Png/Jpeg/Webp.     
Works both for WebUI(A1111) and ComfyUI(with image save node from ComfyUI_Mira).      
Double click the image to close.     
The `Send` button will override `Common Prompt`, `Negative Prompt`, `Width & Height`, `CFG`, `Setp` and `Seed`.    
LoRA in `Common Prompt` also works if you have the same one. If you don't like LoRA in prompts, try `Send LoRA to Slot`.      

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/imageInfo.png" width=45%>   

## Realtime Character preview and Search
The Character List supports keywords search in both Chinese and English.      

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/characterPreview.png" width=45%>

## Right Click Menu
I just noticed that the electron app doesn't have a right-click menu, so I made one.     

**Spell Check (English)**    
Right-click on a word that has a spell check error (a wavy line drawn at the bottom) to see a hint for the corresponding word.     
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/spellCheck.png" width=45%>

**AI prompt generate test**     
Right click on `AI prompt` to get AI promot without generate.     
Once got result from Remote/Local AI, an information overlay will show in screen, switch AI rule to `Last` to keep  the result in later generate.    
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/aiPromptTest.png" width=45%>

**Copy Image/Metadata**     
Right click on `Gallery` to copy current image or copy the metadata to clipboard.     
ComfyUI with Image Saver node will output an a1111 like metadata.      
Copy image based on convert base64 data back to png, but metadata trimed by chromium core, it's impossible to put them back with chromium API, a C based lib could solve that problem, but it's not worth to do. If you do need the original image, check from the relevant (ComfyUI/WebUI) output folder.      
For SAAC: Drag and drop image from browser to local folder or `save as` from browser right click.        
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/copyImage.png" width=35%>

**Send LoRA to Slot**     
Right click on `Common` and `Positive` to send text form LoRA to LoRA Slot.     
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/sendLoRAtoSlot.png" width=35%>

***The Top buttons***     
From Left to right: Save Settings, Reload Model List, Refresh page, Right to Left, Theme Switch.     

------
# AI prompt
Remote   
1. Follow the setup guide to setup your `Remote AI url` , `Remote AI model` and `API Key`     
2. Put something in `AI Prompt` e.g. `make character furry, and I want a detailed portrait`        

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
1. Enable `DEV mode` in ComfyUI Settings, and load `examples\2025-05-03-022732_1775747588.png` into your ComfyUI, make sure you have install [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) **v0.4.9.2** or above from ComfyUI Custom Node Manager.         
    1.1. You might need install `opencv-python` by ComfyUI->Manager->Install PIP packages-> opencv-python     
2. Select `Local Image Generator API` to `ComfyUI`   
3. Make sure `Local Image Generator IP Address:Port` same as your ComfyUI page   
4. Have fun

WebUI(A111/Forge)    
1. Enable `API mode` by add ` --api` in `COMMANDLINE_ARGS` (webui-user.bat)   
2. Start WebUI       
3. Select `Local Image Generator API` to `WebUI`   
4. Make sure `Local Image Generator IP Address:Port` same as your WerUI page   
5. Have fun    

## Folder path issue for Remote usage   
SAA needs to search your ComfyUI/WebUI checkpoints folder to retrieve models, LoRAs and other items. If you use a remote back-end address instead of 127.0.0.1, the folder search will fail and SAA will run in 'Default' mode. In this mode, you cannot change the models or set the LoRAs by LoRA slot.    
There are two ways to solve this problem:    
1. `Mirror folder` - copy your remote `models` folder to local, then setup SAA with the local folder. This is simple, but you need more space to mirror the entire `models` folder to local folder.
2. `Symbolic link or Shared folder` - Create a `Symbolic link ` or simply setup your remote `models` folder as shared folder (read-only recommended), then setup SAA with that folder.     

## Advanced security settings (API authentication)    
*DO NOT forward any UNSECURED local port to public internet*    
*WebUI(A1111) ONLY, DO NOT forward Comfyui API to public internet until they create a proper and secured way*    

Check more WebUI(A1111) command args at [Command-Line-Arguments-and-Settings](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Command-Line-Arguments-and-Settings)     

Copy your `webui-user.bat` to `webui-user-api.bat` then edit it with following args.     
Replace `user:pass` to your `Username:Password`     
`--api` `--api-auth` Enable API and API authentication.    
`--nowebui` means you don't need the WebUI browser interface.    
`--port 58189` API Call port to `58189`      
```
set COMMANDLINE_ARGS= --xformers --no-half-vae --api --api-auth user:pass --nowebui --port 58189
```
Start your A1111 with new `webui-user-api.bat`    
Copy and paste your `Username:Password` to SAA->Settings->`WebUI API Auth`, then set `Enable` to `ON`    

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
Double clicked `saa.exe` but nothing happen?    
1. It might caused by files download issue or missing files.    
2. Try run it in console, by input `cmd` in your Explorer's address bar to open a console.      
3. Type `saa` then enter in console, check backend logs for more information.     

I messed up with setup wizard...      
1. Close the App    
2. Delete `settings.json` in `resources/app/settings`     
3. Try it again     

ERR_CONNECTION_REFUSED       
1. In most cases, it's the wrong address for the (ComfyUI/WebUI) back-end API.      

A Browser based SAA?    
1. YES    
2. Check `Advanced security settings (API authentication)` for more information.    

Error HTTP 400 ...... Cannot xecute because node StepAndCfg does not exist ......       
1. Install `ComfyUI_Mira`     
2. Restart your ComfyUI

ComfyUI/WebUI is busy, cannot run new generation, please try again later.       
Refer to 5, 6 in [README_SAAC.md](https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/README_SAAC.md)     
