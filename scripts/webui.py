import base64
import requests
import io
from PIL import Image

CAT = "WebUI:"

def run_webui(
    server_address = 'http://127.0.0.1:7860', model_name = 'waiNSFWIllustrious_v110.safetensors',
    positive_prompt = 'miqo\'te',negative_prompt = 'nsfw', random_seed = -1, steps= 20, cfg = 7, 
    my_sampler_name='Euler a', height = 512, width = 512, 
    hf_enable = False, hf_scale=1.5, hf_denoising_strength=0.4, hf_upscaler='R-ESRGAN 4x+', savepath_override = False
    ):        
    if 'default' != model_name:            
        option_payload = {
            "sd_model_checkpoint": model_name,
        }
        response = requests.post(url=f'http://{server_address}/sdapi/v1/options', json=option_payload)
        if response.status_code != 200:
            print(f'{CAT}Failed to connect to server, error code: {response.status_code}')
            return None
    
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
        }

    response = requests.post(url=f'http://{server_address}/sdapi/v1/txt2img', json=payload)
    if response.status_code != 200:
        print(f'{CAT}Failed to connect to server, error code: {response.status_code}')
        return None
    
    res = response.json()
    image = Image.open(io.BytesIO(base64.b64decode(res["images"][0])))    
    parameters = res["parameters"]
    info = res["info"]

    if image:        
        return image, parameters, info
    
    return None, {}, ''

