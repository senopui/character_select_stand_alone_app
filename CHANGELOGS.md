2025.05.23 v1.5.3
Bugfix:
WebUI backend generate always report error with `imageData.startsWith.......`                
Search subfolder from only 1 depth to infinity depth #18        

2025.05.23 v1.5.1        
Improvements:     
More detailed error report information from A1111(WebUI) backend      
Right-click menu selections have an easier-to-read background color           
Batch size 128 to 2048    


2025.05.21 v1.5.0     
Add:     
Hires fix steps 1~100      
Spell Check en-US      


2025.05.13 v1.4.3
Bugfix:     
Interface didn't change to normal/regional by loading settings      
Prompt textbox mouse hover message error      

Change:
Regional Condition Character List now has new outline color      


2025.05.12 v1.4.1
Regional Condition Bugfix:     
Copy Tags missing     
Copy Metadata missing Right clip      
`undefined` in Info      
Character list always `None` when load settings      


2025.05.12 v1.4.0
Add:     
Regional Condition two      


2025.05.11 v1.3.0
Add:     
Error dialog for initialization phase     
`Privacy Ball` now supports custom image, try replace `data/imgs/privacy_ball.png` to your own image      
Weight adjust (0.1~2.0 step 0.1) for Character and View lists      


2025.05.09 v1.2.9
Modify code to fix security alerts    

Bugfix:
Thumb preview missing when generate with selected character           

2025.05.07 v1.2.7      
Bugfix:     
Index never choose 0 and 1      
WebUI Folder setup error in wizard     

2025.05.06 v1.2.5      
Bugfix:     
Index error after clear gallery      
#10 Forge High-res fix doesn't work      
Comfyui High-res fix error if you don't have `waiNSFWIllustrious_v120.safetensors`       

Improvements:       
`Image Interface` Now supports whatever starts with `http` or not      


2025.05.05 v1.2.2      
Bugfix:     
Load Seting didn't work with few dropdowns      
Radiobox callback didn't return any value     


2025.05.04 v1.2.1     
Bugfix:     
Hires-Fix model select overwrite model list      


2025.05.04 v1.2.0     
Add:
Send LoRA data to slot from Common and Positive prompt      
LoRA slot now saved in setting.json      

Bugfix:     
The right click menu shows in the upper left corner after initialization     

Change:
When clicked `Send` in image information, `Landscape` will set to false, and `AI generate rule` set to None.    


2025.05.03 v1.1.1     
Add:     
CheckBox - Auto scroll to latest image in split mode.     

Bugfix:     
CheckBox callback didn't pass value back.     
CombyUI backend sometimes didn't parse WA preview data correctly in some cases, ignore those data.      


2025.05.03 v1.1.0     
Add:    
Progress information for ComfyUI and WebUI          
Right Click menu     
    Copy Image/Metadata     
    AI generate test   

Bugfix:          
A dead loop caused by sending the exactly same prompt to ComfyUI.     
Resize button missing on information overlay.     
Elements drag issue.       


2025.05.02 v1.0.0     
Initial Release, Code Completely Refactored from Python     