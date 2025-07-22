# Character Select SAA Client v0.9.0 Beta
*That's all you asked for*

<img src="https://github.com/mirabarukaso/character_select_stand_alone_app/blob/main/examples/overall02.png" width=45%>   

Start your SAA as normal, finish the setup wizard, then navigate to `http://127.0.0.1:58189/`     
Web Service/Ports/Addr can be modify in your `settings.json`.    

## Things you need to know
#### Currently, the SAAC web server is unsecured, and it is NOT recommended that expose SAAC port to internet.

1. Report bug with a screenshot and instructions on how to reproduce it.    
2. Works on iPad Pro with keyboard case, for others who didn't have the keyboard case, `right menu` and `preview window drag` is not working.    
3. The `Characters thumb` is not cached because it takes too long to load. You may notice some lag/jitter with the list thumbnail preview. Also, `drag and drop image` will take more time to transfer back to host then decode to base64 and transfer back.        
4. Spell check is now browser-based, so I haven't disable the browser's right-click menu.    
5. I have already set up a `Mutex Lock` for SAAC. You may receive an error message if your backend is working and you send another `Generate` job from a different tab.    
6. Just in case, there is a `Skeleton Key` to unlock the `Mutex Lock`; click `Reload Model` on the left of the `Model List`.    
7. Start your Comfyui/WebUI API on `computer A`; start SAA on `computer B` and set API to `computer A`; connect SAAC from `computer C`...    
8. You can modify/save `SAAC Settings` in `Settings` tab, but be noticed this is for your `SAA host PC`      
