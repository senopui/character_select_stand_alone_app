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