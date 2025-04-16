import base64
import requests
import io
import os
from PIL import Image
import websocket
import threading
import time
import json
from urllib import request

CAT = "WebUI: "
cancel_trigger = False

class WebUIAPIGenerator:
    def __init__(self, webui_server_address, ws_port):
        self.ws_client = None
        self.last_image_hash = None
        self.last_sent_time = 0
        self.connect_websocket(webui_server_address, ws_port)

    def connect_websocket(self, websocket_address = "127.0.0.1", websocket_port = 47850):
        try:
            self.ws_client = websocket.WebSocket()
            self.ws_client.connect(f'ws://{websocket_address}:{websocket_port}/ws')
            #print(f"{CAT}WebSocket client connected to ws://{websocket_address}:{websocket_port}/ws")
        except Exception as e:
            print(f"{CAT}Failed to connect WebSocket client: {str(e)}")
            self.ws_client = None
            
def poll_progress(webui_server_address, ws_port, preview_refresh_time, stop_event: threading.Event):
    global cancel_trigger
    gen = WebUIAPIGenerator("127.0.0.1", ws_port)
    try:        
        progress_url = f'http://{webui_server_address}/sdapi/v1/progress'
        last_progress = -1
        retire = 0
        counter = 0
        while not stop_event.is_set():
            if cancel_trigger:
                break
            
            response = requests.get(progress_url)            
            if response.status_code != 200:
                continue
            
            data = response.json()
            progress = data.get('progress', 0.0)                
            if preview_refresh_time == counter:
                current_image = data.get('current_image', '')
                counter = 0
                if abs(progress - last_progress) >= 0.05:
                    try:
                        gen.ws_client.send(json.dumps({"base64": f'data:image/png;base64,{current_image}'}))
                    except Exception as e:
                        if retire == 3:
                            print(f"{CAT}Failed to send WebSocket message: {str(e)}")
                            break
                        gen.connect_websocket() 
                        retire += 1                            
                    last_progress = progress
            
            if progress >= 0.93:
                break
            else:
                time.sleep(0.5)
                counter += 1
    except Exception as e:
        print(f"{CAT}Error polling progress: {str(e)}")
    finally:
        gen.ws_client.close()

def run_webui(
    server_address = 'http://127.0.0.1:7860', ws_port=47850, preview_refresh_time = 0, model_name = 'waiNSFWIllustrious_v120.safetensors',
    positive_prompt = 'miqo\'te',negative_prompt = 'nsfw', random_seed = -1, steps= 20, cfg = 7, 
    my_sampler_name='Euler a', height = 512, width = 512, 
    hf_enable = False, hf_scale=1.5, hf_denoising_strength=0.4, hf_upscaler='R-ESRGAN 4x+', savepath_override = False,
    refiner_enable = False, refiner_model_name='none', refiner_ratio=0.4, 
    ):
    global cancel_trigger
    cancel_trigger = False
    
    if 'default' != model_name:            
        option_payload = {
            "sd_model_checkpoint": model_name,
        }
        response = requests.post(url=f'http://{server_address}/sdapi/v1/options', json=option_payload)
        if response.status_code != 200:
            ret_info = f'{CAT}Failed to connect to server, error code: {response.status_code}'
            print(ret_info)
            return None, {}, ret_info
    
    payload = {        
        "prompt": positive_prompt,
        "negative_prompt": negative_prompt,
        "steps": steps,
        "width": width,
        "height": height,
        "sampler_index": my_sampler_name,
        "scheduler": 'Automatic',
        "seed": random_seed,
        "cfg_scale": cfg,
        "save_images": not savepath_override,
    }
    
    if hf_enable:
        payload.update({            
            "enable_hr": True,
            "denoising_strength": hf_denoising_strength,
            "firstphase_width": width,
            "firstphase_height": height,
            "hr_scale": hf_scale,
            "hr_upscaler": hf_upscaler,
            "hr_second_pass_steps": 20,
            "hr_sampler_name": my_sampler_name,
            "hr_scheduler": "Automatic",
            "hr_prompt": positive_prompt,
            "hr_negative_prompt": negative_prompt,
        })
        
    if refiner_enable and 'none' != refiner_model_name and model_name != refiner_model_name:
        payload.update({
            "refiner_checkpoint": refiner_model_name,
            "refiner_switch_at": refiner_ratio,
        })
    
    stop_event = None
    progress_thread = None
    if 0 != preview_refresh_time:
        stop_event = threading.Event()
        progress_thread = threading.Thread(
            target=poll_progress,
            args=(server_address, ws_port, preview_refresh_time * 2, stop_event),
            daemon=True
        )
        progress_thread.start()
    
    info = 'Unknown Error from WebUI backend'    
    try:
        response = requests.post(url=f'http://{server_address}/sdapi/v1/txt2img', json=payload)
        if response.status_code != 200:
            ret_info = f'{CAT}Failed to connect to server, error code: {response.status_code}'
            return None, {}, ret_info
        if not cancel_trigger:
            res = response.json()
            image = Image.open(io.BytesIO(base64.b64decode(res["images"][0])))    
            parameters = res["parameters"]
            info = res["info"]
        else:
            image = None
            parameters = {}
            info = ''
    except Exception as ret:
        image = None
        parameters = {}
        info = ret
    finally:
        if 0 != preview_refresh_time:
            if progress_thread.is_alive():
                stop_event.set()
                progress_thread.join(timeout=1.0)
                if progress_thread.is_alive():
                    print(f"{CAT}Progress thread did not terminate gracefully")
                
    return image, parameters, info

def cancel_Webui(server_address):
    global cancel_trigger
    req = request.Request(f"http://{server_address}/sdapi/v1/interrupt", method='POST')
    try:
        cancel_trigger = True
        request.urlopen(req)
        print(f"{CAT}Processing interrupted")
    except Exception as e:
        print(f"{CAT}Failed to interrupt: {e}")
        