# Character Select SAA

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
| Image Info to Prompt | Yes | Yes | Yes |
| Regional Condition | Yes | No | No |

Try Online Character Select Simple Advanced App [Hugging Face Space](https://huggingface.co/spaces/flagrantia/character_select_saa)    

## Install
Clone this repo into your local folder     
```
git clone https://github.com/mirabarukaso/character_select_stand_alone_app.git
cd character_select_stand_alone_app
npm install
npm start
```

*One-Click package*    
In case ... never mind, the full package [embeded_env_for_SAA](https://huggingface.co/datasets/flagrantia/character_select_stand_alone_app/resolve/main/embeded_env_for_SAA.zip)

# Chinese Translate and Character Verification       
Many thanks to the following people for their selfless contributions, who gave up their valuable time to provide Chinese translation and character data verification. They are listed in no particular order.   
**Silence, 燦夜, 镜流の粉丝, 樱小路朝日, 满开之萤, and two more who wish to remain anonymous.**   

Special thanks    
lanner0403 [WAI-NSFW-illustrious-character-select](https://github.com/lanner0403/WAI-NSFW-illustrious-character-select) 2000+  Verified Character List, please support his WebUI plugin.   
Cell1310  [Illustrious XL (v0.1) Recognized Characters List](https://civitai.com/articles/10242/illustrious-xl-v01-recognized-characters-list) more than 100+ Verified Character List.     
     
------
# Highlights
## Regional Condition (ComfyUI only)
**'Cause WebUI dosn't provide any regional API, sorry...**  

Get tired of [complex workflow](https://github.com/mirabarukaso/ComfyUI_Mira/issues/12#issuecomment-2727190727)?      
Try SAA Regional Condition with only 3 steps:     
1. Click the `Regional Condition` Checkbox     
2. Choose listed character or your OC      
3. Start `common prompt` with `duo, masterpiece, best quality, amazing quality`(Don't forget quality words like me), have fun!     

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/regionalCondition.png" width=35% height=35%>   

## LoRA Slot 
WebUI supports it's default LoRA prompt style `<lora:xxxxx:1.0>`.    
ComfyUI supports more detailed configuration of LoRA, for more information please refer to [LoRA from Text](https://github.com/mirabarukaso/ComfyUI_Mira#lora).    
Also support check LoRA info by click the 'i' button in LoRA Slot. And, if there's a same named PNG file with LoRA, the image will show in LoRA info page.       

**To use LoRA in ComfyUI API, you need update your ComfyUI_Mira node to at least 0.4.9.2**   
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/loraSlot.png" width=45% height=45%>   

## Semi-Auto Tag Complete
Tags credits from [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete/blob/main/tags/danbooru.csv)    

Entering the `first few characters` will automatically search for matching tags, starting with `*` will search for tags with a specific ending, and `*tag*` will search for tags that match in the middle.    
Use `mouse` to select the prompt word, but you can also use the `keyboard up and down` with `Enter` or `Tab` to select, press `Esc` to close the prompt box.     
`ctrl + up` and `ctrl + down` arrow to adjust the weight of the current tag, or adjust multiple tags by selecting a fragment, the usage is similar to comfyui and webui, but some details of the logic may be different.    

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/tagAutoComplete.png" width=45% height=45%>   

## Image info
Just drag your image into SAA window, only support PNG for now.     
Works both for WebUI and ComfyUI(with image save node).      
Double click the image to close.     
The `Send` button will override `Common Prompt`, `Negative Prompt`, `Width & Height`, `CFG`, `Setp` and `Seed`.    
LoRA in `Common Prompt` also works if you have the same one. If you don't like LoRA in prompts, try `Send LoRA to Slot`.      

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/imageInfo.png" width=45% height=45%>   

## Realtime Character preview and Search
The Character List supports keywords search in both Chinese and English.      

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/characterPreview.png" width=45% height=45%>

## Right Click Menu
I just noticed that the electron app doesn't have a right-click menu, so I made one.     

**AI prompt generate test**     
Right click on `AI prompt` to get AI promot without generate.     
Once got result from Remote/Local AI, an information overlay will show in screen, switch AI rule to `Last` to keep  the result in later generate.    
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/aiPromptTest.png" width=45% height=45%>

**Copy Image/Metadata**     
Right click on `Gallery` to copy current image or copy the metadata to clipboard.     
ComfyUI with Image Saver node will output an a1111 like metadata.      
Copy image based on convert base64 data back to png, so I didn't put metadata back, ~because most social software will trim it again.~ The truth is metadata trimed by chromium core, it's impossible to put them back with chromium API, a C based lib could solve that problem, but it's not worth to do. If you do need the original image, try dragging and dropping or getting it from the relevant (ComfyUI/WebUI) output folder.      
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/copyImage.png" width=35% height=35%>

**Send LoRA to Slot**     
Right click on `Common` and `Positive` to send text form LoRA to LoRA Slot.     
<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/sendLoRAtoSlot.png" width=35% height=35%>

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
