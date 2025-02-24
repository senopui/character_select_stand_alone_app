import os
import glob
import textwrap
import gradio as gr
import requests
import json
import base64
from io import BytesIO
from PIL import Image
import random
from comfyui import run_comfyui
from webui import run_webui
import argparse

# Language
LANG_EN = {
    "character1": "Character list 1",
    "character2": "Character list 2",
    "character3": "Character list 3",
    "action": "Action list",
    "original_character": "Original Character",
    "api_model_file_select": "Model list (ComfyUI Default:waiNSFWIllustrious_v110)",
    "random_seed": "Random Seed",
    "custom_prompt": "Custom Prompt (Head)",
    "api_prompt": "Positive Prompt (Tail)",
    "api_neg_prompt": "Negative Prompt",
    "batch_generate_rule": "AI rule for Batch generate",
    "api_image_data": "CFG,Step,Width,Height,Batch Images(1-16)",
    "ai_prompt": "AI Prompt",
    "prompt_ban": "Prompt Ban (Remove specific tags e.g. \"masterpiece, quality, amazing\" )",
    "ai_interface": "AI Prompt Generator",
    "ai_remote_addr": "Remote AI url",
    "ai_remote_model": "Remote AI model",
    "ai_remote_timeout": "Remote AI connection timeout",
    "ai_local_addr": "Local Llama.cpp server",
    "ai_local_temp": "Local AI Temperature",
    "ai_local_n_predict": "Local AI n_predict",
    "api_interface": "Local Image Generator API",
    "api_addr": "Local Image Generator IP Address:Port",
    "api_image": "Gallery",
    "output_prompt": "Prompt",
    "output_info": "Information",
    "ai_system_prompt_warning": "<h1><span style=\"color:orangered\">System prompt for AI prompt generator.<br>DO NOT MODIFY it if you don\'t understand it!!!</span></h1>",
    "ai_system_prompt_text": "AI System Prompt",
    
    "gr_info_create_1": "Creating 1, please wait ...",
    "gr_info_create_n": "Creating {}of{}, please wait ...",
    "gr_info_settings_saved": "Settings Saved to {}",
    "gr_info_settings_loaded": "Settings Loaded {}",
    
    "gr_warning_interface_both_none": "[Warning] Both AI Gen and Image Gen mode are \"none\" nothing will output",
    "gr_warning_click_create_first": "[Warning] Click \"Create Prompt\" first batch generate",
    "gr_warning_creating_ai_prompt":"[Warning] AI prompt request failed: {}",
    
    "gr_error_creating_image":"[Error] Got error from Image API: {}",
}

LANG_CN = {
    "character1": "角色1",
    "character2": "角色2",
    "character3": "角色3",
    "action": "动作",
    "original_character": "自定义及原创角色",
    "api_model_file_select": "模型选择 (ComfyUI默认:waiNSFWIllustrious_v110)",
    "random_seed": "种子",
    "custom_prompt": "自定义提示词（放在最前）",
    "api_prompt": "效果提示词（放在末尾）",
    "api_neg_prompt": "负面提示词",
    "batch_generate_rule": "AI填词规则",
    "api_image_data": "引导,步数,宽,高,批量数量(1-16)",
    "ai_prompt": "AI提示词（用于生成填词）",
    "prompt_ban": "提示词黑名单（用于删除特定标签，例如：\"masterpiece, quality, amazing\" ）",
    "ai_interface": "AI填词设置",
    "ai_remote_addr": "远程AI地址",
    "ai_remote_model": "远程AI模型",
    "ai_remote_timeout": "远程AI超时（秒）",
    "ai_local_addr": "本地 Llama.cpp 服务地址",
    "ai_local_temp": "本地AI温度（Temperature）",
    "ai_local_n_predict": "本地AI回复长度（n_predict）",
    "api_interface": "本地生图设置",
    "api_addr": "本地生图API地址（IP Address:Port）",
    "api_image": "输出",
    "output_prompt": "最终提示词",
    "output_info": "相关信息",
    "ai_system_prompt_warning": "<h1><span style=\"color:orangered\">AI系统提示词，建议使用英文<br>如果你不清楚这是干什么的，不要修改！！！</span></h1>",
    "ai_system_prompt_text": "AI系统提示词",
    
    "gr_info_create_1": "正在生成，请稍候……",
    "gr_info_create_n": "正在生成 {} / {}， 请稍候……",
    "gr_info_settings_saved": "配置已保存： {}",
    "gr_info_settings_loaded": "配置已载入： {}",
    
    "gr_warning_interface_both_none": "注意：AI题词和图片生成接口都被设定为 \"none\"，此时执行没有图片输出",
    "gr_warning_click_create_first": "注意：批量生成前需要先点 \"Create Prompt\"",
    "gr_warning_creating_ai_prompt":"注意：AI题词返回回故障信息： [{}]",
    
    "gr_error_creating_image":"错误：生成图片返回故障信息：[{}]",    
}

LANG = LANG_CN

# JavaScript
JAVA_SCRIPT = """
function refresh() {
    const url = new URL(window.location);

    if (url.searchParams.get('__theme') !== 'dark') {
        url.searchParams.set('__theme', 'dark');
        window.location.href = url.href;
    }
}
"""

# CSS
CSS_SCRIPT = """
#custom_prompt_text textarea {color: darkorange}
#positive_prompt_text textarea {color: greenyellow}
#negative_prompt_text textarea {color: red}
#ai_prompt_text textarea {color: hotpink}
#prompt_ban_text textarea {color: Khaki}
"""

TITLE = "WAI Character Select SAA"
CAT = "WAI_Character_Select"
ENGLISH_CHARACTER_NAME = False

current_dir = os.path.dirname(os.path.abspath(__file__))
json_folder = os.path.join(current_dir, 'json')

character_list = ''
character_dict = {}
action_list = ''
action_dict = {}
original_character_list = ''
original_character_dict = {}
wai_image_dict = {}

settings_json = {
    "remote_ai_base_url": "https://api.groq.com/openai/v1/chat/completions",
    "remote_ai_model": "llama-3.3-70b-versatile",
    "remote_ai_api_key":"<Your API Key here>",
    "remote_ai_timeout":30,
    
    "model_path": "F:\\ComfyUI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints",
    "model_filter": False,
    "model_filter_keyword": "waiNSFW",
    
    "character1": "random",
    "character2": "none",
    "character3": "none",
    "action": "none",
    
    "api_model_file_select" : "default",    
    "random_seed": -1,
    
    "custom_prompt": "",
    "api_prompt": "masterpiece, best quality, amazing quality",
    "api_neg_prompt": "bad quality,worst quality,worst detail,sketch,censor,3d",
    "api_image_data": "7.0,30,1024,1360,1",
    
    "batch_generate_rule": "Last",
    "ai_prompt": "",
    "prompt_ban" : "",
    
    "ai_interface": "none",
    "ai_local_addr": "http://127.0.0.1:8080/chat/completions",
    "ai_local_temp": 0.7,
    "ai_local_n_predict": 768,
    
    "api_interface": "none",
    "api_addr": "127.0.0.1:7860"
}

model_files_list = []

last_prompt = ''
last_info = ''
last_ai_text = ''

wai_illustrious_character_select_files = [
    {'name': 'wai_action', 'file_path': os.path.join(json_folder, 'wai_action.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/action.json'}, 
    {'name': 'wai_zh_tw', 'file_path': os.path.join(json_folder, 'wai_zh_tw.json'), 'url': 'https://raw.githubusercontent.com/lanner0403/WAI-NSFW-illustrious-character-select/refs/heads/main/zh_TW.json'},
    # settings are now in https://github.com/mirabarukaso/character_select_stand_alone_app
    {'name': 'original_character', 'file_path': os.path.join(json_folder, 'original_character.json'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/json/original_character.json'},    
    # local files
    {'name': 'settings', 'file_path': os.path.join(json_folder, 'settings.json'), 'url': 'local'},
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
    As a prompt writer, follow these guidelines               
    - Separate keywords with commas.
    - Provide high quality, non-verbose, coherent, brief, concise and non-extraneous prompts.
    - Focus solely on the visual elements of the image; avoid art commentary or intentions.
    - Construct the prompt using the component format:
    1. Begin with a description of the subject.
    2. Follow with an action or operation of something keyword description 
    3. Follow with a scene keyword description.
    4. Finish with a background keyword description.
    - Keep to no less than 8 and no more than 16 keywords in total. 
    - In principle, there should be no more than 4 descriptor keywords in a component but note the following exceptions.
    - If the user's input emphasizes something, you can increase the number of descriptors keywords up to 6 and reduce other descriptors as necessary to ensure that the final keywords do not exceed the total upper limit.
    - Include all keywords from the user's query verbatim as the main subject of the answer.
    - You can describe the character's actions, but not specific characteristics of the character.
    - Be varied and creative.
    - Always answer on the same line and in no more than 120 words. 
    - Do not list or pronounce components.
    - Include creative additional information in your answer.    
    - Answer in English.
    - Answer the prompt only.                                                
    The following is an illustrative example of how to construct a prompt. Your prompts should follow this format but always be consistent with the theme of worldbuilding or setting and consider the relationship between the elements.
    Example:
    front view, cyberpunk, neon lights, night, standing, looking at viewer, smirk, back alley, graffiti, blood, crowds, depth of field, reflection,
    Prompt for the following theme:
    """)

def decode_response(response):
    if response.status_code == 200:
        ret = response.json().get('choices', [{}])[0].get('message', {}).get('content', '')
        print(f'[{CAT}]:Response:{ret}')
        # Renmove <think> for DeepSeek
        if str(ret).__contains__('</think>'):
            ret = str(ret).split('</think>')[-1].strip()
            print(f'\n[{CAT}]:Trimed response:{ret}')    
            
        ai_text = ret.strip()
        ai_text = ai_text.replace('"','').replace('*','')
                
        if ai_text.endswith('.'):
            ai_text = ai_text[:-1] + ','      
        if not ai_text.endswith(','):
            ai_text = f'{ai_text},'            
        return ai_text    
    else:
        print(f"[{CAT}]:Error: Request failed with status code {response.status_code}")        
        return ''

def llm_send_request(input_prompt, ai_remote_addr, ai_remote_model, ai_remote_timeout):
    data = {
            'model': ai_remote_model,
            'messages': [
                {"role": "system", "content": prime_directive},
                {"role": "user", "content": input_prompt + ";Response in English"}
            ],  
        }
    
    try:
        response = requests.post(ai_remote_addr, headers={"Content-Type": "application/json", "Authorization": "Bearer " + settings_json["remote_ai_api_key"]}, json=data, timeout=ai_remote_timeout)
        return decode_response(response)
    except Exception as e:
        gr.Warning(LANG["gr_warning_creating_ai_prompt"].format(e))
    
    return ''

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
    try:
        response = requests.post(server, headers={"Content-Type": "application/json"}, json=data)    
        return decode_response(response)
    except Exception as e:
        gr.Warning(LANG["gr_warning_creating_ai_prompt"].format(e))
    
    return ''

def download_file(url, file_path):   
    response = requests.get(url)
    response.raise_for_status() 
    print(f'[{CAT}]:Downloading... {url}')
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
        print(f'[{CAT}]:{directory} not exist, use default')
        return []
    
    safetensors_files = glob.glob(os.path.join(directory, '*.safetensors'))
    safetensors_filenames = [os.path.basename(file) for file in safetensors_files]
    
    return safetensors_filenames

def load_settings(temp_settings_json):    
    for key, value in temp_settings_json.items():
        if settings_json.__contains__(key):
            #print(f'[{CAT}] Settings: Load [{key}] : [{value}]')
            settings_json[key] = value
        else:
            print(f'[{CAT}] Settings: Ignore Unknown [{key}] : [{value}]')    
            
def load_jsons():
    global character_list
    global character_dict
    global action_list
    global action_dict
    global original_character_dict
    global original_character_list
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
            
        if 'local' == url:
            if 'wai_image' == name:
                if os.path.exists(file_path):
                    wai_image_cache = True   
                else:
                    continue
            elif 'settings' == name and not os.path.exists(file_path):                                        
                print(f'[{CAT}] Settings: Local settings.json not found, use default. Use Save settings to save your settings, and rename tmp_settings to settings.json.')
                continue
        else:
            if not os.path.exists(file_path):
                download_file(url, file_path)

        with open(file_path, 'r', encoding='utf-8') as file:
            if 'wai_action' == name:
                action_dict.update(json.load(file))
            elif 'wai_zh_tw' == name:
                character_dict.update(json.load(file))        
            elif 'original_character' == name:
                original_character_dict.update(json.load(file))                
            elif 'settings' == name:
                temp_settings_json = {}
                temp_settings_json.update(json.load(file))
                load_settings(temp_settings_json)
            elif 'wai_image' == name and wai_image_cache:
                print(f'[{CAT}]:Loading wai_image.json, delete this file for update.')
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
                        
    # Create list
    action_list = list(action_dict.keys())
    action_list.insert(0, "none")
    
    if ENGLISH_CHARACTER_NAME:
        character_list = list(character_dict.values())   
    else:
        character_list = list(character_dict.keys())   
    character_list.insert(0, "none")
    character_list.insert(0, "random")
    
    original_character_list = list(original_character_dict.keys())    
    original_character_list.insert(0, "none")
    original_character_list.insert(0, "random")    
                
    # Create cache
    # Loading time 4.3s to 0.1s
    if not wai_image_cache:
        print(f'[{CAT}]:Creating wai_image.json ...')
        with open(os.path.join(json_folder, 'wai_image.json'), 'w', encoding='utf-8') as file:
            json.dump(wai_image_dict, file, ensure_ascii=False, indent=4)
            
    # Search models
    files_list = get_safetensors_files(settings_json["model_path"])
    
    if len(files_list) > 0 :
        for model in files_list:
            if settings_json["model_filter"]:
                if (model).__contains__(settings_json["model_filter_keyword"]):
                    model_files_list.append(model)
            else:
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
    if ENGLISH_CHARACTER_NAME:
        chara = rnd_character
    else:
        chara = character_dict[rnd_character]                    
                
    thumb_image = Image.new('RGB', (128, 128), (128, 128, 128))
    if wai_image_dict.keys().__contains__(chara):
        thumb_image = dase64_to_image(wai_image_dict.get(chara))
    
    opt_chara = chara
    if optimise_tags:
        #opt_chara = remove_duplicates(chara.replace('_', ' ').replace(':', ' '))
        opt_chara = opt_chara.split(',')[1].strip()
        opt_chara = opt_chara.replace('(', '\\(').replace(')', '\\)')
        if not opt_chara.endswith(','):
            opt_chara = f'{opt_chara},'   
    
        print(f'{CAT}:Optimise Tags:[{chara}]->[{opt_chara}]')
            
    return rnd_character, opt_chara, thumb_image

def original_character_select_ex(character = 'random', random_action_seed = 1):
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
    if not opt_chara.endswith(','):
        opt_chara = f'{opt_chara},'   
            
    return rnd_character, opt_chara

def parse_api_image_data(api_image_data):
    try:
        cfg, steps, width, height, loops = map(float, api_image_data.split(','))
        if 1 > int(loops) or 16 < int(loops):
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
        try:
            if 'ComfyUI' == interface:
                image_data_list = run_comfyui(server_address=addr, model_name=model_file_select, positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height)
                image_data_bytes = bytes(image_data_list)  
                api_image = Image.open(BytesIO(image_data_bytes))    
            elif 'WebUI' == interface:
                api_image = run_webui(server_address=addr, model_name=model_file_select, positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height)      
            return api_image
        except Exception as e:
            print(f"[{CAT}]Error creating image: {e}")
            raise gr.Error(LANG["gr_error_creating_image"].format(e))
    
    return None

def create_prompt(character1, character2, character3, action, original_character, random_seed, custom_prompt, 
                ai_interface, ai_prompt, prompt_ban, ai_remote_addr, ai_remote_model, ai_remote_timeout,
                ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select
            ) -> tuple[str, str, Image.Image, Image.Image]:            
    global last_prompt
    global last_info
    global last_ai_text
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
    
    if 'none' == ai_interface == api_interface:
        gr.Warning(LANG["gr_warning_interface_both_none"])
    else:
        gr.Info(LANG["gr_info_create_1"])
    
    ai_text = ''
    prime_directive = textwrap.dedent(ai_system_prompt_text)
    if 'Remote' == ai_interface:
        ai_text = llm_send_request(ai_prompt, ai_remote_addr, ai_remote_model, ai_remote_timeout)
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
    
    # Collect prompts
    last_prompt = prompt
    last_info = info
    last_ai_text = ai_text
    
    return final_prompt, final_info, thumb_image, api_images

def create_with_last_prompt(random_seed,  custom_prompt,
                            ai_interface, ai_prompt, batch_generate_rule, prompt_ban, ai_remote_addr, ai_remote_model, ai_remote_timeout,
                            ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                            api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select
            ) -> tuple[str, str, Image.Image, Image.Image]:        
    global prime_directive
    if '' == last_prompt and '' == custom_prompt:
        gr.Warning(LANG["gr_warning_click_create_first"])
        return 'Click \"Create Prompt" or add some \"Custom prompt\" first', '', None
        
    cfg, steps, width, height, loops = parse_api_image_data(api_image_data)
    if '' != custom_prompt and not custom_prompt.endswith(','):
        custom_prompt = f'{custom_prompt},'
            
    api_images = []
    final_prompts = []
    final_infos = []

    ai_text=''
    if 'Disable' != batch_generate_rule:         
        ai_text = last_ai_text        
        if 'Last' != batch_generate_rule:            
            prime_directive = textwrap.dedent(ai_system_prompt_text)
            if 'Remote' == ai_interface:
                ai_text = llm_send_request(ai_prompt, ai_remote_addr, ai_remote_model, ai_remote_timeout)
            elif 'Local' == ai_interface:
                ai_text = llm_send_local_request(ai_prompt, ai_local_addr, ai_local_temp, ai_local_n_predict)                

    for index in range(1, loops + 1):       
        gr.Info(LANG["gr_info_create_n"].format(index, loops))
        seed = random_seed
        if random_seed == -1:
            seed = random.randint(0, 4294967295)        
            
        if 1 != index and 'Everytime' == batch_generate_rule:
            if 'Remote' == ai_interface:
                ai_text = llm_send_request(ai_prompt, ai_remote_addr, ai_remote_model, ai_remote_timeout)
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
                        ai_prompt, batch_generate_rule, prompt_ban, ai_interface, 
                        ai_remote_addr, ai_remote_model, ai_remote_timeout,
                        ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_addr):        
    now_settings_json = {        
        "remote_ai_base_url": ai_remote_addr,
        "remote_ai_model": ai_remote_model,
        "remote_ai_api_key": settings_json["remote_ai_api_key"],
        "remote_ai_timeout":ai_remote_timeout,
        
        "model_path": settings_json["model_path"],
        "model_filter": settings_json["model_filter"],
        "model_filter_keyword": settings_json["model_filter_keyword"],
        
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

        "batch_generate_rule": batch_generate_rule,
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
            
    print(f"[{CAT}]:Settings saved to {tmp_file}")
    gr.Info(LANG["gr_info_settings_saved"].format(tmp_file))
    

def load_saved_setting(file_path):
    
    temp_settings_json = {}                
    with open(file_path, 'r', encoding='utf-8') as file:
        temp_settings_json.update(json.load(file))    
    load_settings(temp_settings_json)        
    gr.Info(LANG["gr_info_settings_loaded"].format(file_path))

    return settings_json["character1"],settings_json["character2"],settings_json["character3"],settings_json["action"],settings_json["api_model_file_select"],settings_json["random_seed"],\
            settings_json["custom_prompt"],settings_json["api_prompt"],settings_json["api_neg_prompt"],settings_json["api_image_data"],\
            settings_json["batch_generate_rule"],settings_json["ai_prompt"],settings_json["prompt_ban"],settings_json["ai_interface"],\
            settings_json["remote_ai_base_url"],settings_json["remote_ai_model"],settings_json["remote_ai_timeout"],\
            settings_json["ai_local_addr"],settings_json["ai_local_temp"],settings_json["ai_local_n_predict"],settings_json["api_interface"],settings_json["api_addr"]

def batch_generate_rule_change(options_selected):
    print(f'[{CAT}]AI rule for Batch generate:{options_selected}')

def parse_arguments():
    parser = argparse.ArgumentParser(description='Character Select Application')
    parser.add_argument("--english", type=bool, default=False, required=False, help='Use English Character Name')
    args = parser.parse_args()

    return args.english

def init():
    global ENGLISH_CHARACTER_NAME
    global LANG
        
    ENGLISH_CHARACTER_NAME = parse_arguments()
    if ENGLISH_CHARACTER_NAME:
        print(f'[{CAT}]:Use tags as Character Name')
        LANG = LANG_EN
        
    load_jsons()    
    print(f'[{CAT}]:Starting...')
    
    return character_list, action_list, original_character_list, model_files_list, prime_directive, LANG
