import json
from urllib import request, parse
import os
from typing import Dict, Any, Optional
import uuid
import websocket
import base64
from io import BytesIO
from PIL import Image
import time

CAT = "ComfyUI: "
ws = None
cancel_trigger = False

class ComfyUIAPIGenerator:
    def __init__(self, server_address: str = "127.0.0.1:8188", ws_port=47850, preview_refresh_time = 0, client_id = "4d42d601-ffd1-4573-9311-38d3ea2faa1c", workflow_path: Optional[str] = None):                
        self.server_address = server_address
        self.ws_port = ws_port
        self.preview_refresh_time = preview_refresh_time
        self.client_id = client_id
        if workflow_path is None:
            self.workflow_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'workflow.json')
        else:
            self.workflow_path = workflow_path        
        self.nodes = self.load_workflow()
        
        self.ws_client = None
        self.last_image_hash = None
        self.last_sent_time = 0
        self.connect_websocket()

    def connect_websocket(self):
        try:
            self.ws_client = websocket.WebSocket()
            self.ws_client.connect(f"ws://127.0.0.1:{self.ws_port}/ws")
            #print(f"{CAT}WebSocket client connected to ws://127.0.0.1:{self.ws_port}/ws")
        except Exception as e:
            print(f"{CAT}Failed to connect WebSocket client: {str(e)}")
            self.ws_client = None

    def load_workflow(self) -> Dict[str, Any]:
        try:
            with open(self.workflow_path, 'r') as file:
                return json.load(file)
        except FileNotFoundError:
            raise FileNotFoundError(f"{CAT}Workflow file not found: {self.workflow_path}")
        except json.JSONDecodeError:
            raise ValueError(f"{CAT}Invalid JSON in workflow file: {self.workflow_path}")
    
    def set_ex(self, node_id: str, inputs: str, item: str, data: any) -> None:
            self.nodes[node_id][inputs][item] = data        

    def get_image(self, filename, subfolder, folder_type):
        data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        url_values = parse.urlencode(data)
        with request.urlopen("http://{}/view?{}".format(self.server_address, url_values)) as response:
            return response.read()

    def get_history(self, prompt_id):
        with request.urlopen("http://{}/history/{}".format(self.server_address, prompt_id)) as response:
            return json.loads(response.read())   
             
    def get_images(self, ws, prompt_id):
        global cancel_trigger
        current_time = time.time()
        self.last_sent_time = current_time
        retire = 0
        while True:
            if cancel_trigger:
                cancel_trigger = False
                break
            
            out = ws.recv()
            if isinstance(out, str):
                message = json.loads(out)
                if message['type'] == 'executing':
                    data = message['data']
                    if data['node'] is None and data['prompt_id'] == prompt_id:
                        break #Execution is done
            else:
                current_time = time.time()
                if current_time - self.last_sent_time < self.preview_refresh_time or 0 == self.preview_refresh_time:
                    continue

                try:                    
                    self.last_sent_time = current_time

                    image_data = out[8:] 
                    bytes_io = BytesIO(image_data)
                    preview_image = Image.open(bytes_io)
                    buffered = BytesIO()
                    preview_image.save(buffered, format="PNG")
                    base64_image = base64.b64encode(buffered.getvalue()).decode('utf-8')
                    base64_image = f"data:image/png;base64,{base64_image}"

                    if self.ws_client:
                        try:
                            self.ws_client.send(json.dumps({"base64": base64_image}))
                        except Exception as e:
                            if retire == 3:
                                print(f"{CAT}Failed to send WebSocket message: {str(e)}")
                                break
                            self.connect_websocket() 
                            retire += 1
                            
                except Exception as e:
                    print(f"{CAT}Error processing preview image: {str(e)}")

        history = self.get_history(prompt_id)[prompt_id]
        images_output = []
        for node_id in history['outputs']:
            node_output = history['outputs'][node_id]            
            if 'images' in node_output:
                for image in node_output['images']:
                    image_data = self.get_image(image['filename'], image['subfolder'], image['type'])
                    images_output.append(image_data)
        return images_output        

    def pick_image(self, images):
        for _, image_data in enumerate(images):
            return image_data

    def queue_prompt(self) -> None:
        data = json.dumps({"prompt": self.nodes, "client_id": self.client_id}).encode('utf-8')        
        req = request.Request(f"http://{self.server_address}/prompt", data=data,  headers={'Content-Type': 'application/json'})        
        
        prompt_id = json.loads(request.urlopen(req).read())['prompt_id']
        #print(f"{CAT}Prompt queued with ID: {prompt_id}")
        
        images = self.get_images(ws, prompt_id)        
        return images

def run_comfyui(server_address, preview_refresh_time, sampler, scheduler, model_name, positive_prompt, negative_prompt, 
                random_seed, steps, cfg, width, height,
                hf_enable = False, hf_scale=1.5, hf_denoising_strength=0.4, hf_upscaler='4x-UltraSharp', hf_colortransfer='none', hf_seed = 42,
                refiner_enable = False, refiner_add_noise= False, refiner_model_name='none', refiner_ratio=0.4, 
                workflow = 'workflow_api_new.json', ws_port=47850,
                ):
    global ws
    global cancel_trigger
    
    cancel_trigger = False
    client_id = str(uuid.uuid4())   
    current_file_path = os.path.abspath(__file__)
    current_folder = os.path.dirname(current_file_path)
    workflow_path = os.path.join(current_folder, workflow)
                
    ws = websocket.WebSocket()
    ws.connect("ws://{}/ws?clientId={}".format(server_address, client_id)) 
    
    my_gen = ComfyUIAPIGenerator(server_address, ws_port, preview_refresh_time, client_id, workflow_path)
    
    if 'default' != model_name:
        # Set model name
        my_gen.set_ex(node_id="45", inputs="inputs", item="ckpt_name", data=model_name)
        if model_name.__contains__('vPred'):
            my_gen.set_ex(node_id="35", inputs="inputs", item="sampling", data="v_prediction")
    
        # Set model name to Image Save
        my_gen.set_ex(node_id="29", inputs="inputs", item="modelname", data=model_name)
    
    refiner_start_step = 1000
    if refiner_enable and 'none' != refiner_model_name and model_name != refiner_model_name:
        # Set refiner model name
        my_gen.set_ex(node_id="43", inputs="inputs", item="ckpt_name", data=refiner_model_name)
        if refiner_model_name.__contains__('vPred'):
            my_gen.set_ex(node_id="44", inputs="inputs", item="sampling", data="v_prediction")
        
        refiner_start_step = int(steps * refiner_ratio)
        # Set refiner seed and steps
        my_gen.set_ex(node_id="37", inputs="inputs", item="noise_seed", data=random_seed)
        my_gen.set_ex(node_id="37", inputs="inputs", item="start_at_step", data=refiner_start_step)
        
        if refiner_add_noise:
            # Set refiner add noise
            my_gen.set_ex(node_id="37", inputs="inputs", item="add_noise", data='enable')
    else:
        # Reconnect nodes
        # Ksampler and Model Loader to Vae Decode
        my_gen.set_ex(node_id="6", inputs="inputs", item="samples", data=["36", 0])
        my_gen.set_ex(node_id="6", inputs="inputs", item="vae", data=["45", 2])
        # Model Loader to Hires fix Vae Decode Tiled 
        my_gen.set_ex(node_id="18", inputs="inputs", item="vae", data=["45", 2])
        # Model Loader to Hires fix Vae Encode Tiled
        my_gen.set_ex(node_id="19", inputs="inputs", item="vae", data=["45", 2])
    
    # Set Sampler and Scheduler
    my_gen.set_ex(node_id="20", inputs="inputs", item="sampler_name", data=sampler)
    my_gen.set_ex(node_id="29", inputs="inputs", item="sampler_name", data=sampler)
    my_gen.set_ex(node_id="36", inputs="inputs", item="sampler_name", data=sampler)
    my_gen.set_ex(node_id="37", inputs="inputs", item="sampler_name", data=sampler)
    
    my_gen.set_ex(node_id="20", inputs="inputs", item="scheduler", data=scheduler)
    my_gen.set_ex(node_id="29", inputs="inputs", item="scheduler", data=scheduler)
    my_gen.set_ex(node_id="36", inputs="inputs", item="scheduler", data=scheduler)
    my_gen.set_ex(node_id="37", inputs="inputs", item="scheduler", data=scheduler)
                
    # Set steps and cfg
    my_gen.set_ex(node_id="13", inputs="inputs", item="steps", data=steps)
    my_gen.set_ex(node_id="13", inputs="inputs", item="cfg", data=cfg)
                
    # Set Image Saver seed
    my_gen.set_ex(node_id="29", inputs="inputs", item="seed_value", data=random_seed)
    # Set Ksampler seed and steps
    my_gen.set_ex(node_id="36", inputs="inputs", item="noise_seed", data=random_seed)
    my_gen.set_ex(node_id="36", inputs="inputs", item="end_at_step", data=refiner_start_step)            
    
    # Set Positive prompt
    my_gen.set_ex(node_id="32", inputs="inputs", item="text", data=positive_prompt)
    # Set Negative prompt
    my_gen.set_ex(node_id="33", inputs="inputs", item="text", data=negative_prompt)
    
    # Set width and height
    my_gen.set_ex(node_id="17", inputs="inputs", item="Width", data=width)  
    my_gen.set_ex(node_id="17", inputs="inputs", item="Height", data=height)  
        
    if not hf_enable:
        # Image Save set to 1st VAE Decode
        my_gen.set_ex(node_id="29", inputs="inputs", item="images", data=["6", 0])
    else:
        # Set Hires fix parameters
        my_gen.set_ex(node_id="17", inputs="inputs", item="HiResMultiplier", data=hf_scale)
        # Set Hires fix seed and denoise
        my_gen.set_ex(node_id="20", inputs="inputs", item="seed", data=hf_seed)
        my_gen.set_ex(node_id="20", inputs="inputs", item="denoise", data=hf_denoising_strength)
        # Set Hires fix model name
        my_gen.set_ex(node_id="27", inputs="inputs", item="model_name", data=f'{hf_upscaler}.pth')
        if 'none' == hf_colortransfer:
            # Image Save set to 2nd VAE Decode (Tiled)
            my_gen.set_ex(node_id="29", inputs="inputs", item="images", data=["18", 0])
        else:
            # Default to Image Color Transfer
            my_gen.set_ex(node_id="28", inputs="inputs", item="method", data=hf_colortransfer)
                    
    images = my_gen.queue_prompt()
    my_gen.ws_client.close()
    ws.close()                
    return my_gen.pick_image(images)

def cancel_comfyui(server_address):
    global cancel_trigger
    req = request.Request(f"http://{server_address}/interrupt", method='POST')
    try:
        cancel_trigger = True
        request.urlopen(req)
        print(f"{CAT}Processing interrupted")
    except Exception as e:
        print(f"{CAT}Failed to interrupt: {e}")
        