import json
from urllib import request, parse
import os
from typing import Dict, Any, Optional
import time
import uuid
import websocket
import re

CAT = "ComfyUI:"

ws = None

class ComfyUIAPIGenerator:
    def __init__(self, server_address: str = "127.0.0.1:8188", client_id = "4d42d601-ffd1-4573-9311-38d3ea2faa1c", workflow_path: Optional[str] = None):        
        self.server_address = server_address    
        self.client_id = client_id
        if workflow_path is None:
            self.workflow_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'workflow.json')
        else:
            self.workflow_path = workflow_path
        
        self.nodes = self.load_workflow()

    def load_workflow(self) -> Dict[str, Any]:
        try:
            with open(self.workflow_path, 'r') as file:
                return json.load(file)
        except FileNotFoundError:
            raise FileNotFoundError(f"{CAT}Workflow file not found: {self.workflow_path}")
        except json.JSONDecodeError:
            raise ValueError(f"{CAT}Invalid JSON in workflow file: {self.workflow_path}")
    
    def set_png_filename(self, filename: str, node_id: str) -> None:       
        str_prompt = '%time_%seed' + '_' + filename.replace(' ', '_').replace('\\', '').replace(':0.7', '').replace(',', '_') 
        self.nodes[node_id]["inputs"]["filename"] = str_prompt

    def set_model(self, model_name: str, node_id: str) -> None:
            self.nodes[node_id]["inputs"]["ckpt_name"] = model_name
                    
    def set_postive_prompt(self, quality: str, node_id: str) -> None:
            self.nodes[node_id]["inputs"]["text"] = quality

    def set_negative_prompt(self, negquality: str, node_id: str) -> None:
            self.nodes[node_id]["inputs"]["text"] = negquality
    
    def set_seed(self, seed: int, knode_id: str, snode_id: str) -> None:
        self.nodes[knode_id]["inputs"]["seed"] = seed
        self.nodes[snode_id]["inputs"]["seed_value"] = seed
    
    def set_width_height(self, width: int, height: int, node_id: str) -> None:
        self.nodes[node_id]["inputs"]["Width"] = width
        self.nodes[node_id]["inputs"]["Height"] = height
        
    def set_steps_cfg(self, steps: int, cfg: float, node_id: str) -> None:              
        self.nodes[node_id]["inputs"]["steps"] = steps
        self.nodes[node_id]["inputs"]["cfg"] = cfg

    def get_image(self, filename, subfolder, folder_type):
        data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        url_values = parse.urlencode(data)
        with request.urlopen("http://{}/view?{}".format(self.server_address, url_values)) as response:
            return response.read()

    def get_history(self, prompt_id):
        with request.urlopen("http://{}/history/{}".format(self.server_address, prompt_id)) as response:
            return json.loads(response.read())   
             
    def get_images(self, ws, prompt_id):
        while True:
            out = ws.recv()
            if isinstance(out, str):
                message = json.loads(out)
                if message['type'] == 'executing':
                    data = message['data']
                    if data['node'] is None and data['prompt_id'] == prompt_id:
                        break #Execution is done
            else:
                # If you want to be able to decode the binary stream for latent previews, here is how you can do it:
                # bytesIO = BytesIO(out[8:])
                # preview_image = Image.open(bytesIO) # This is your preview in PIL image format, store it in a global
                continue #previews are binary data

        history = self.get_history(prompt_id)[prompt_id]
        for node_id in history['outputs']:
            node_output = history['outputs'][node_id]
            images_output = []
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

def run_comfyui(server_address, model_name, positive_prompt, negative_prompt, random_seed, steps, cfg, width, height ):
    global ws
    client_id = str(uuid.uuid4())   
    current_file_path = os.path.abspath(__file__)
    current_folder = os.path.dirname(current_file_path)
                
    ws = websocket.WebSocket()
    ws.connect("ws://{}/ws?clientId={}".format(server_address, client_id))            
    
    my_gen = ComfyUIAPIGenerator(server_address, client_id, current_folder+'\\workflow_api.json')
    
    if 'default' != model_name:
        my_gen.set_model(model_name=model_name, node_id="11")
        
    my_gen.set_steps_cfg(steps=steps, cfg=cfg, node_id="13")
    my_gen.set_seed(seed=random_seed, knode_id="4", snode_id='10')
    my_gen.set_width_height(width=width, height=height, node_id="12")
    my_gen.set_postive_prompt(positive_prompt, "14")              
    my_gen.set_negative_prompt(negquality=negative_prompt, node_id="15")
    images = my_gen.queue_prompt()
        
    ws.close()            
        
    return my_gen.pick_image(images)
