# Character Select SAA
This is a Stand Alone App with AI prompt and ComfyUI/WebUI API support.     
   
Special thanks to [lanner0403](https://github.com/lanner0403/WAI-NSFW-illustrious-character-select) for providing the role data, please support his webui plugin.   
------

# Install and Run
1. Clone the repository to wherever you like   
2. Dbclick #run.bat   
3. Open your Chrome/Edge and paste `http://127.0.0.1:47861/`   
4. Have fun   
------

# Setup Model List
1. Modify `json/settings.json` 
2. Set `model_path` to your local ComfyUI/WebUI checkpoints folder, make sure use `\\` for Windows      
3. To use more `wai` models, modify `model_filter_keyword` to `wai`   
4. To use all your models, modify `model_filter` to `false`    
------

# Original Characters
1. You can add/remove character (who not in list) in `original_character.json`    
2. I already put some of my OC in it, feel free to use or modify    
3. Original Characters is NOT support thumb image for now   
------

# AI prompt
## Remote   
1. Modify `json/wai_settings.json` to setup your API key and Model   
2. Set `AI Prompt Generator` to `Remote`   
3. Put something e.g. `make character furry, and I wang a detailed portrait` in `AI Prompt`    

## Local
1. Make sure you know how to build [Llama.cpp](https://github.com/ggml-org/llama.cpp) yourself, or download them from trusted source   
2. Download Model from [HuggingFace](https://huggingface.co/), recommend GGUF like `Llama-3.3-7B-q8`   
3. Recommend Server args `llama-server.exe -ngl 40 --no-mmap -m "<your GGUF model here>`
4. Set `AI Prompt Generator` to `Local`
5. Put something e.g. `make character furry, and I wang a detailed portrait` in `AI Prompt`
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
[ComfyUI-QualityOfLifeSuit_Omar92](https://github.com/omar92/ComfyUI-QualityOfLifeSuit_Omar92)

## WebUI API works, but WebUI not working anymore!!!
It seems some plugin caused that issue, try update to the latest version.    
Still not working? Unfortunately, you can't use both the API and WebUI in this case unless you uninstall the buggy plugin.   


