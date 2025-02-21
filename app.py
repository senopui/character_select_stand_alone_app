import os
import glob
import textwrap
from time import sleep
import requests
import json
import base64
from io import BytesIO
from PIL import Image
import random
import gradio as gr
from comfyui import run_comfyui
from webui import run_webui

# JavaScript
js_func = """
function refresh() {
    const url = new URL(window.location);

    if (url.searchParams.get('__theme') !== 'dark') {
        url.searchParams.set('__theme', 'dark');
        window.location.href = url.href;
    }
}
"""

# CSS
css_script = """
#custom_prompt_text textarea {color: darkorange}
#positive_prompt_text textarea {color: greenyellow}
#negative_prompt_text textarea {color: red}
#ai_prompt_text textarea {color: hotpink}
#prompt_ban_text textarea {color: Khaki}
"""

# CATEGORY
cat = "WAI_Character_Select"

current_dir = os.path.dirname(os.path.abspath(__file__))
json_folder = os.path.join(current_dir, 'json')

character_list = ''
character_dict = {}
action_list = ''
action_dict = {}
original_character_list = ''
original_character_dict = {}
wai_llm_config = {}
wai_image_dict = {}

settings_json = {
    "model_path": "F:\\ComfyUI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints",
    "model_filter": True,
    "model_filter_keyword": "waiNSFW",
    "ui_right_to_left": False,        
    "character1": "none",
    "character2": "none",
    "character3": "none",
    "action": "none",    
    "api_model_file_select" : "default",
    "random_seed": -1,    
    "custom_prompt": "1girl",
    "api_prompt": "masterpiece, best quality, amazing quality",
    "api_neg_prompt": "bad quality,worst quality,worst detail,sketch,censor,3d",
    "api_image_data": "7.0,30,1024,1360,1",
    "ai_only_create_one_time": True,
    "ai_prompt" : "",
    "prompt_ban" : "",
    "ai_interface": "none",
    "ai_local_addr": "http://127.0.0.1:8080/chat/completions",
    "ai_local_temp": 0.3,
    "ai_local_n_predict": 1536,    
    "api_interface": "none",
    "api_addr": "127.0.0.1:7860",
}

model_files_list = []

last_prompt = ''
last_info = ''

wai_illustrious_character_select_files = [
    {'name': 'wai_action', 'file_path': os.path.join(json_folder, 'wai_action.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/action.json'}, 
    {'name': 'wai_zh_tw', 'file_path': os.path.join(json_folder, 'wai_zh_tw.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/zh_TW.json'},
    # settings are now in https://github.com/mirabarukaso/character_select_stand_alone_app
    {'name': 'wai_remote_ai_settings', 'file_path': os.path.join(json_folder, 'wai_remote_ai_settings.json'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/json/wai_remote_ai_settings.json'},
    {'name': 'settings', 'file_path': os.path.join(json_folder, 'settings.json'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/json/settings.json'},
    {'name': 'original_character', 'file_path': os.path.join(json_folder, 'original_character.json'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/json/original_character.json'},
    # local cache
    {'name': 'wai_image', 'file_path': os.path.join(json_folder, 'wai_image.json'), 'url': 'local'},
    # images
    {'name': 'wai_output_1', 'file_path': os.path.join(json_folder, 'wai_output_1.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_1.json'},
    {'name': 'wai_output_2', 'file_path': os.path.join(json_folder, 'wai_output_2.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_2.json'},
    {'name': 'wai_output_3', 'file_path': os.path.join(json_folder, 'wai_output_3.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_3.json'},
    {'name': 'wai_output_4', 'file_path': os.path.join(json_folder, 'wai_output_4.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_4.json'},
    {'name': 'wai_output_5', 'file_path': os.path.join(json_folder, 'wai_output_5.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_5.json'},
    {'name': 'wai_output_6', 'file_path': os.path.join(json_folder, 'wai_output_6.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_6.json'},
    {'name': 'wai_output_7', 'file_path': os.path.join(json_folder, 'wai_output_7.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_7.json'},
    {'name': 'wai_output_8', 'file_path': os.path.join(json_folder, 'wai_output_8.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_8.json'},
    {'name': 'wai_output_9', 'file_path': os.path.join(json_folder, 'wai_output_9.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_9.json'},
    {'name': 'wai_output_10', 'file_path': os.path.join(json_folder, 'wai_output_10.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/output_10.json'},
]

prime_directive = textwrap.dedent("""\
    Act as a prompt maker with the following guidelines:               
    - Break keywords by commas.
    - Provide high-quality, non-verbose, coherent, brief, concise, and not superfluous prompts.
    - Focus solely on the visual elements of the picture; avoid art commentaries or intentions.
    - Construct the prompt with the component format:
    1. Start with the subject and keyword description.
    2. Follow with motion keyword description.
    3. Follow with scene keyword description.
    4. Finish with background and keyword description.
    - Limit yourself to no more than 20 keywords per component  
    - Include all the keywords from the user's request verbatim as the main subject of the response.
    - Be varied and creative.
    - Always reply on the same line and no more than 100 words long. 
    - Do not enumerate or enunciate components.
    - Create creative additional information in the response.    
    - Response in English.
    - Response prompt only.                                                
    The following is an illustrative example for you to see how to construct a prompt your prompts should follow this format but always coherent to the subject worldbuilding or setting and consider the elements relationship.
    Example:
    Demon Hunter,Cyber City,A Demon Hunter,standing,lone figure,glow eyes,deep purple light,cybernetic exoskeleton,sleek,metallic,glowing blue accents,energy weapons,Fighting Demon,grotesque creature,twisted metal,glowing red eyes,sharp claws,towering structures,shrouded haze,shimmering energy,                            
    Make a prompt for the following Subject:
    """)

def decode_response(response):
    if response.status_code == 200:
        ret = response.json().get('choices', [{}])[0].get('message', {}).get('content', '')
        print(f'[{cat}]:Response:{ret}')
        # Renmove <think> for DeepSeek
        if str(ret).__contains__('</think>'):
            ret = str(ret).split('</think>')[-1].strip()
            print(f'\n[{cat}]:Trimed response:{ret}')    
            
        ai_text = ret
        if ai_text.__contains__('.'):
            ai_text = ai_text.replace('.','')            
        if not ai_text.endswith(','):
            ai_text = f'{ai_text},'            
        return ai_text    
    else:
        print(f"[{cat}]:Error: Request failed with status code {response.status_code}")
        return []


def llm_send_request(input_prompt, llm_config):
    data = {
            'model': llm_config["model"],
            'messages': [
                {"role": "system", "content": prime_directive},
                {"role": "user", "content": input_prompt + ";Response in English"}
            ],  
        }
    response = requests.post(llm_config["base_url"], headers={"Content-Type": "application/json", "Authorization": "Bearer " + llm_config["api_key"]}, json=data, timeout=30)
    return decode_response(response)

def llm_send_local_request(input_prompt, server, temperature=0.5, n_predict=512):
    data = {
            "temperature": temperature,
            "n_predict": n_predict,
            "cache_prompt": True,
            "stop": ["<|im_end|>"],
            'messages': [
                {"role": "system", "content": prime_directive},
                {"role": "user", "content": input_prompt + ";Response in English"}
            ],  
        }
    response = requests.post(server, headers={"Content-Type": "application/json"}, json=data)    
    return decode_response(response)    

def download_file(url, file_path):   
    response = requests.get(url)
    response.raise_for_status() 
    print('[{}]:Downloading... {}'.format(cat, url))
    with open(file_path, 'wb') as file:
        file.write(response.content)        

def dase64_to_image(base64_data):
    base64_str = base64_data.split("base64,")[1]
    image_data = base64.b64decode(base64_str)
    image_bytes = BytesIO(image_data)
    image = Image.open(image_bytes)    
    return image

def get_safetensors_files(directory):
    if not os.path.isdir(directory):
        print('[{}]:{} not exist, use default'.format(cat, directory))
        return []
    
    safetensors_files = glob.glob(os.path.join(directory, '*.safetensors'))
    safetensors_filenames = [os.path.basename(file) for file in safetensors_files]
    
    return safetensors_filenames

def download_jsons():
    global character_list
    global character_dict
    global action_list
    global action_dict
    global original_character_dict
    global original_character_list
    global wai_llm_config
    global wai_image_dict
    global settings_json
    global model_files_list
    
    wai_image_cache = False
    wai_image_dict_temp = {}
    
    # download file
    for item in wai_illustrious_character_select_files:
        name = item['name']
        file_path = item['file_path']
        url = item['url']        
            
        if 'local' == url and 'wai_image' == name:
            if os.path.exists(file_path):
                wai_image_cache = True   
            else:
                continue
        else:
            if not os.path.exists(file_path):
                download_file(url, file_path)

        with open(file_path, 'r', encoding='utf-8') as file:
            # print('[{}]:Loading... {}'.format(cat, url))
            if 'wai_action' == name:
                action_dict.update(json.load(file))
                action_list = list(action_dict.keys())
                action_list.insert(0, "none")
            elif 'wai_zh_tw' == name:            
                character_dict.update(json.load(file))
                character_list = list(character_dict.keys())    
                character_list.insert(0, "none")
                character_list.insert(0, "random")
            elif 'wai_remote_ai_settings' == name:
                wai_llm_config.update(json.load(file))
            elif 'settings' == name:
                settings_json.update(json.load(file))
            elif 'original_character' == name:
                original_character_dict.update(json.load(file))
                original_character_list = list(original_character_dict.keys())    
                original_character_list.insert(0, "none")
                original_character_list.insert(0, "random")
            elif 'wai_image' == name and wai_image_cache:
                print(f'[{cat}]:Loading wai_image.json, delete this file for update.')
                wai_image_dict = json.load(file)                
            elif name.startswith('wai_output_') and not wai_image_cache:
                # [ {} ] .......
                # Got some s..special data format from the source
                # Luckily we have a strong enough cpu for that.
                wai_image_dict_temp = json.load(file)
                for item in wai_image_dict_temp:
                    key = list(item.keys())[0]
                    value = list(item.values())[0]
                    wai_image_dict.update({key : value}) 
        
        if wai_image_cache:
            break
        
    # Create cache
    # Loading time 4.3s to 0.1s
    if not wai_image_cache:
        print(f'[{cat}]:Creating wai_image.json ...')
        with open(os.path.join(json_folder, 'wai_image.json'), 'w', encoding='utf-8') as file:
            json.dump(wai_image_dict, file, ensure_ascii=False, indent=4)
            
    # Search models
    files_list = get_safetensors_files(settings_json["model_path"])
    if len(files_list) > 0 and settings_json["model_filter"]:
        for model in files_list:
            if str(model).__contains__(settings_json["model_filter_keyword"]):
                model_files_list.append(model)
    model_files_list.insert(0, 'default')    
            
def remove_duplicates(input_string):
    items = input_string.split(',')    
    unique_items = list(dict.fromkeys(item.strip() for item in items))    
    result = ', '.join(unique_items)
    return result


def illustrious_action_select_ex(action = 'random', random_action_seed = 1):   
    act = ''        
    rnd_action = ''
    
    if 'random' == action:
        index = random_action_seed % len(action_list)
        rnd_action = action_list[index]
        act = f'{action_dict[rnd_action]}, '
    elif 'none' == action:
        rnd_action = action
        act = ''
    else:
        rnd_action = action
        act = f'{action_dict[rnd_action]}, '   
        
    return rnd_action, act

def illustrious_character_select_ex(character = 'random', optimise_tags = True, random_action_seed = 1):
    chara = ''
    rnd_character = ''
    
    if 'none' == character:
        return '', '', None
    
    if 'random' == character:
        index = random_action_seed % len(character_list)
        rnd_character = character_list[index]
        if 'random' == rnd_character:
            rnd_character = character_list[index+2]
        elif 'none' == rnd_character:
            rnd_character = character_list[index+1]
    else:
        rnd_character = character
    chara = character_dict[rnd_character]                    
                
    thumb_image = Image.new('RGB', (128, 128), (128, 128, 128))
    if wai_image_dict.keys().__contains__(chara):
        thumb_image = dase64_to_image(wai_image_dict.get(chara))
    
    opt_chara = chara
    if optimise_tags:
        opt_chara = remove_duplicates(chara.replace('_', ' ').replace(':', ' '))
        opt_chara = opt_chara.replace('(', '\\(').replace(')', '\\)')
        if not opt_chara.endswith(','):
            opt_chara = f'{opt_chara},'        
            
    return rnd_character, opt_chara, thumb_image

def original_character_select_ex(character = 'random', optimise_tags = True, random_action_seed = 1):
    chara = ''
    rnd_character = ''
    
    if 'none' == character:
        return '', ''
    
    if 'random' == character:
        index = random_action_seed % len(original_character_list)
        rnd_character = original_character_list[index]
        if 'random' == rnd_character:
            rnd_character = original_character_list[index+2]
        elif 'none' == rnd_character:
            rnd_character = original_character_list[index+1]
    else:
        rnd_character = character
    chara = original_character_dict[rnd_character]                                    
    
    opt_chara = chara
    if optimise_tags:
        opt_chara = remove_duplicates(chara.replace('_', ' ').replace(':', ' '))
        opt_chara = opt_chara.replace('(', '\\(').replace(')', '\\)')
        if not opt_chara.endswith(','):
            opt_chara = f'{opt_chara},'        
            
    return rnd_character, opt_chara

def parse_api_image_data(api_image_data):
    try:
        cfg, steps, width, height, loops = map(float, api_image_data.split(','))
        if 1 > int(loops) or 8 < int(loops):
            loops = 1
        return float(cfg), int(steps), int(width), int(height), int(loops)
    except ValueError:
        return 7.0, 30, 1024, 1360, 1

def create_prompt_info(rnd_character1='', opt_chara1='',rnd_character2='', opt_chara2='',rnd_character3='', opt_chara3='' , rnd_oc = '', opt_oc=''):
    info = ''    
    if '' != opt_chara1:
        info += f'Character 1:{rnd_character1}[{opt_chara1}]\n'
        
    if '' != opt_chara2:
        info += f'Character 2:{rnd_character2}[{opt_chara2}]\n'
    
    if '' != opt_chara3:
        info += f'Character 3:{rnd_character3}[{opt_chara3}]\n'

    if '' != rnd_oc:
        info += f'Original Character:{rnd_oc}[{opt_oc}]\n'

    prompt = f'{opt_chara1}{opt_chara2}{opt_chara3}{opt_oc}'
    
    return prompt, info

def create_image(interface, addr, model_file_select, prompt, neg_prompt, seed, cfg, steps, width, height):
    if 'none' != interface:
        if 'ComfyUI' == interface:
            image_data_list = run_comfyui(server_address=addr, model_name=model_file_select, positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height)
            image_data_bytes = bytes(image_data_list)  
            api_image = Image.open(BytesIO(image_data_bytes))    
        elif 'WebUI' == interface:
            api_image = run_webui(server_address=addr, model_name=model_file_select, positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height)      
        return api_image
    
    return None

def create_prompt(character1='random',character2='none',character3='none', action='none', original_character='none', random_seed=-1, custom_prompt='', 
                ai_interface='none', ai_prompt='a close up portrait', prompt_ban='', ai_local_addr='http://127.0.0.1:8080/chat/completions', ai_local_temp=0.3, ai_local_n_predict=1536, ai_system_prompt_text='',
                api_interface='none', api_addr='127.0.0.1:7890', api_prompt='', api_neg_prompt='', api_image_data='7.0,36,1024,1360,1', api_model_file_select='default'
            ) -> tuple[str, str, Image.Image, Image.Image]:            
    global last_prompt
    global last_info
    global prime_directive
        
    cfg, steps, width, height, _ = parse_api_image_data(api_image_data)
    if '' != custom_prompt and not custom_prompt.endswith(','):
        custom_prompt = f'{custom_prompt},'    
        
    seed1 = random_seed
    seed2 = random.randint(0, 4294967295)
    seed3 = random.randint(0, 4294967295)
    if random_seed == -1:
        seed1 = random.randint(0, 4294967295)    
    
    rnd_character1, opt_chara1, thumb_image1 = illustrious_character_select_ex(character = character1, random_action_seed=seed1)        
    rnd_character2, opt_chara2, thumb_image2 = illustrious_character_select_ex(character = character2, random_action_seed=seed2)
    rnd_character3, opt_chara3, thumb_image3 = illustrious_character_select_ex(character = character3, random_action_seed=seed3)
    rnd_oc, opt_oc = original_character_select_ex(character = original_character, random_action_seed=seed3)
        
    rnd_action, act = illustrious_action_select_ex(action = action, random_action_seed=seed1)            
    thumb_image = []
    if thumb_image1:
        thumb_image.append(thumb_image1)
    if thumb_image2:
        thumb_image.append(thumb_image2)
    if thumb_image3:
        thumb_image.append(thumb_image3)
    
    prompt, info = create_prompt_info(rnd_character1, opt_chara1, rnd_character2, opt_chara2, rnd_character3, opt_chara3, rnd_oc, opt_oc)
    if '' != rnd_action:
        info += f'Action:{rnd_action}[{act}]'    
    
    last_prompt = prompt
    last_info = info
    
    ai_text = ''
    prime_directive = textwrap.dedent(ai_system_prompt_text)
    if 'Remote' == ai_interface:
        ai_text = llm_send_request(ai_prompt, wai_llm_config)
    elif 'Local' == ai_interface:
        ai_text = llm_send_local_request(ai_prompt, ai_local_addr, ai_local_temp, ai_local_n_predict)        
    
    final_prompt = f'{custom_prompt}{prompt}{act}{ai_text}{api_prompt}'
    for ban_word in prompt_ban.split(','):
        final_prompt = final_prompt.replace(ban_word.strip(), '')
        
    api_images = []
    api_image = create_image(api_interface, api_addr, api_model_file_select, final_prompt, api_neg_prompt, seed1, cfg, steps, width, height)
    if api_image:
        api_images.append(api_image)
    final_info = f'Custom Promot:[{custom_prompt}]\n{info}\nAI Prompt:[{ai_text}]\nSeed:[{seed1}]'
    
    return final_prompt, final_info, thumb_image, api_images

def create_with_last_prompt(random_seed=-1, custom_prompt='', 
                ai_interface='none', ai_only_create_one_time=True, ai_prompt='a close up portrait, turn character to furry', prompt_ban='', ai_local_addr='http://127.0.0.1:8080/chat/completions', ai_local_temp=0.3, ai_local_n_predict=1536, ai_system_prompt_text='',
                api_interface='none', api_addr='127.0.0.1:7890', api_prompt='', api_neg_prompt='', api_image_data='7.0,36,1024,1360,1', api_model_file_select='default'
            ) -> tuple[str, str, Image.Image, Image.Image]:        
    global prime_directive
    if '' == last_prompt:
        return 'Click above button first', '', None
        
    cfg, steps, width, height, loops = parse_api_image_data(api_image_data)
    if '' != custom_prompt and not custom_prompt.endswith(','):
        custom_prompt = f'{custom_prompt},'
            
    api_images = []
    final_prompts = []
    final_infos = []
    
    ai_text = ''
    prime_directive = ai_system_prompt_text
    if 'Remote' == ai_interface:
        ai_text = llm_send_request(ai_prompt, wai_llm_config)
    elif 'Local' == ai_interface:
        ai_text = llm_send_local_request(ai_prompt, ai_local_addr, ai_local_temp, ai_local_n_predict)                

    for index in range(1, loops + 1):
        seed = random_seed
        if random_seed == -1:
            seed = random.randint(0, 4294967295)        
            
        if 1 != index and not ai_only_create_one_time:
            if 'Remote' == ai_interface:
                ai_text = llm_send_request(ai_prompt, wai_llm_config)
            elif 'Local' == ai_interface:
                ai_text = llm_send_local_request(ai_prompt, ai_local_addr, ai_local_temp, ai_local_n_predict)                
            
        final_prompt = f'{index}:\n{custom_prompt}{last_prompt}{ai_text}{api_prompt}\n'
        for ban_word in prompt_ban.split(','):
            final_prompt = final_prompt.replace(ban_word.strip(), '')
        
        final_info = f'{index}:\nCustom Promot:[{custom_prompt}]\n{last_info}\nAI Prompt:[{ai_text}]'
        api_image = create_image(api_interface, api_addr, api_model_file_select, final_prompt, api_neg_prompt, seed, cfg, steps, width, height)
        final_info = f'{final_info}\nSeed {index}:[{seed}]\n'
        
        if api_image:
            api_images.append(api_image)
        final_prompts.append(final_prompt)
        final_infos.append(final_info)
    
    return ''.join(final_prompts), ''.join(final_infos), api_images

def save_current_setting(character1, character2, character3, action, api_model_file_select, random_seed, 
                         custom_prompt, api_prompt, api_neg_prompt, api_image_data, 
                         ai_only_create_one_time, ai_prompt, prompt_ban, ai_interface, ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_addr):
    now_settings_json = {
        "model_path": settings_json["model_path"],
        "model_filter": settings_json["model_filter"],
        "model_filter_keyword": settings_json["model_filter_keyword"],
        "ui_right_to_left": settings_json["ui_right_to_left"],
        
        "character1": character1,
        "character2": character2,
        "character3": character3,
        "action": action,
        
        "api_model_file_select" : api_model_file_select,
        "random_seed": random_seed,
        
        "custom_prompt": custom_prompt,
        "api_prompt": api_prompt,
        "api_neg_prompt": api_neg_prompt,
        "api_image_data": api_image_data,
        "ai_only_create_one_time": ai_only_create_one_time,
        "ai_prompt" : ai_prompt,
        "prompt_ban": prompt_ban,
        
        "ai_interface": ai_interface,
        "ai_local_addr": ai_local_addr,
        "ai_local_temp": ai_local_temp,
        "ai_local_n_predict": ai_local_n_predict,
        
        "api_interface": api_interface,
        "api_addr": api_addr,
    }
    
    tmp_file = os.path.join(json_folder, 'tmp_settings.json')
    with open(tmp_file, 'w', encoding='utf-8') as f:
        json.dump(now_settings_json, f, ensure_ascii=False, indent=4)        
            
    print(f"[{cat}]:Settings saved to {tmp_file}")
    gr.Info(f"[{cat}]:Settings saved to {tmp_file}")

def load_saved_setting(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        settings_json.update(json.load(file))    
        
    print(f"[{cat}]:Settings loaded {file_path}")
    gr.Info(f"[{cat}]:Settings loaded {file_path}")
    
    return settings_json["character1"], settings_json["character2"], settings_json["character3"], settings_json["action"], settings_json["api_model_file_select"], settings_json["random_seed"], settings_json["custom_prompt"], settings_json["api_prompt"], settings_json["api_neg_prompt"], settings_json["api_image_data"], settings_json["ai_only_create_one_time"], settings_json["ai_prompt"], settings_json["prompt_ban"], settings_json["ai_interface"], settings_json["ai_local_addr"], settings_json["ai_local_temp"], settings_json["ai_local_n_predict"], settings_json["api_interface"], settings_json["api_addr"]
            
if __name__ == '__main__':
    download_jsons()
    
    print(f'[{cat}]:Starting...')
    
    with gr.Blocks(js=js_func, css=css_script) as ui:
        with gr.Row():
            character1 = gr.Dropdown(
                choices=character_list,
                label="Character list 1",
                value=settings_json["character1"],
                allow_custom_value = False,
            )
            
            character2 = gr.Dropdown(
                choices=character_list,
                label="Character list 2",
                value=settings_json["character2"],
                allow_custom_value = False,
            )
                            
            character3 = gr.Dropdown(
                choices=character_list,
                label="Character list 3",
                value=settings_json["character3"],
                allow_custom_value = False,
            )

            action = gr.Dropdown(
                choices=action_list,
                label="Action list",
                value=settings_json["action"],
                allow_custom_value = False,    
            )
            
            original_character = gr.Dropdown(
                choices=original_character_list,
                label="Original Character",
                value='none',
                allow_custom_value = False,
            )
            
        with gr.Row():
            with gr.Column():
                api_image = gr.Gallery(type="pil", object_fit='contain', label="Gallery", preview=True, height=768)               
                thumb_image = gr.Gallery(type="pil", columns=3, object_fit='scale-down', height=244, label="Thumb Image Gallery")
                output_prompt = gr.Textbox(label="Prompt")
                output_info = gr.Textbox(label="Information")
                
                gr.Markdown('<h1><span style="color:orangered">System prompt for AI prompt generator.<br>DO NOT MODIFY it if you don\'t understand it!!!</span></h1>')
                ai_system_prompt_text = gr.Textbox(label="System Prompt", value=prime_directive)
            with gr.Column():
                with gr.Row():
                    api_model_file_select = gr.Dropdown(
                            choices=model_files_list,
                            label="Model list (Default:waiNSFWIllustrious_v110)",
                            value=settings_json["api_model_file_select"],
                            allow_custom_value = False,
                        )            
                    random_seed = gr.Slider(minimum=-1,
                            maximum=4294967295,
                            step=1,
                            value=-1,
                            label=settings_json["random_seed"],
                        )    
                with gr.Row():
                    with gr.Column():                        
                        # API prompts
                        custom_prompt = gr.Textbox(value=settings_json["custom_prompt"], label="Custom Prompt (Head)", elem_id="custom_prompt_text") 
                        api_prompt = gr.Textbox(value=settings_json["api_prompt"], label="Positive Prompt (Tail)", elem_id="positive_prompt_text")
                        api_neg_prompt = gr.Textbox(value=settings_json["api_neg_prompt"], label="Negative Prompt", elem_id="negative_prompt_text")
                        api_image_data = gr.Textbox(value=settings_json["api_image_data"], label="CFG,Step,Width,Height,Images(1-8)")   
                        
                        # AI prompts
                        ai_only_create_one_time = gr.Checkbox(
                            label="Only Generate once for Continue Create",
                            value=settings_json["ai_only_create_one_time"]
                        )
                        ai_prompt = gr.Textbox(value=settings_json["ai_prompt"], label="AI Prompt", elem_id="ai_prompt_text")
                        prompt_ban = gr.Textbox(value=settings_json["prompt_ban"], label="Prompt Ban (Remove specific tags e.g. \"masterpiece, quality, amazing\" )", elem_id="prompt_ban_text")
                with gr.Row():
                    with gr.Column():
                        run_button = gr.Button("Create Prompt (1 Image only)", variant='primary') 
                    with gr.Column():
                        run_same_button = gr.Button("Continue with last Character and Action (1-8)")
                with gr.Row():             
                    with gr.Column():                               
                        # AI Prompt Generator                
                        ai_interface = gr.Dropdown(
                            choices=['none', 'Remote', 'Local'],
                            label="AI Prompt Generator",
                            value=settings_json["ai_interface"],
                            allow_custom_value = False,
                        )                
                        ai_local_addr = gr.Textbox(value=settings_json["ai_local_addr"], label="Local Llama.cpp server")   
                        ai_local_temp = gr.Slider(minimum=0.1,
                            maximum=1,
                            step=0.05,
                            value=settings_json["ai_local_temp"],
                            label="Local AI Temperature",
                        )
                        ai_local_n_predict = gr.Slider(minimum=128,
                            maximum=4096,
                            step=128,
                            value=settings_json["ai_local_n_predict"],
                            label="Local AI n_predict",
                        )                            
                        
                    with gr.Column():
                        # API Image Generator                
                        api_interface = gr.Dropdown(
                            choices=['none', 'ComfyUI', 'WebUI'],
                            label="Local Image Generator API",
                            value=settings_json["api_interface"],
                            allow_custom_value = False,
                        )
                        api_addr = gr.Textbox(value=settings_json["api_addr"], label="Local Image Generator IP Address:Port") 
                        with gr.Row():
                                save_settings_button = gr.Button("Save Settings", variant='stop') 
                                load_settings_button = gr.UploadButton("Load Settings", file_count='single', file_types=['.json']) 
        
        run_button.click(fn=create_prompt, 
                         inputs=[character1, character2, character3, action, original_character, random_seed, custom_prompt, 
                                 ai_interface, ai_prompt, prompt_ban, ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                                 api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select
                                 ], 
                         outputs=[output_prompt, output_info, thumb_image, api_image])
        
        run_same_button.click(fn=create_with_last_prompt, 
                         inputs=[random_seed,  custom_prompt,
                                 ai_interface, ai_only_create_one_time, ai_prompt, prompt_ban, ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                                 api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select
                                 ], 
                         outputs=[output_prompt, output_info, api_image])
        
        save_settings_button.click(fn=save_current_setting,
                                   inputs=[character1, character2, character3, action, api_model_file_select, random_seed,
                                           custom_prompt, api_prompt, api_neg_prompt, api_image_data, 
                                           ai_only_create_one_time, ai_prompt, prompt_ban, ai_interface, ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_addr],
                                   outputs=[])
        
        load_settings_button.upload(fn=load_saved_setting,
                                   inputs=[load_settings_button],
                                   outputs=[character1, character2, character3, action, api_model_file_select, random_seed,
                                            custom_prompt, api_prompt, api_neg_prompt, api_image_data, 
                                            ai_only_create_one_time, ai_prompt, prompt_ban, ai_interface, ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_addr])
        
    ui.launch()