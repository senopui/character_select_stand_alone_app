import datetime
import os
import glob
import textwrap
import gradio as gr
import numpy as np
import requests
import json
import base64
from io import BytesIO
from PIL import Image
from PIL import PngImagePlugin
import random
import argparse
from comfyui import run_comfyui
from webui import run_webui
from color_transfer import ColorTransfer

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
    
    "api_hf_enable": "Enable Hires Fix",
    "api_hf_scale": "Upscale by",
    "api_hf_denoise": "Denoising strength",
    "api_hf_upscaler": "Upscaler",
    "api_hf_colortransfer": "Color Transfer",
    "api_hf_incorrect_upscaler": "Incorrect Upscaler selected, reset to default {}",
    "colortransfer_webui_warning": "Image Color Transfer is not a webUI embedded feature, so images are saved separately to the \".\\outputs\" directory of this App.",
    "api_webui_savepath_override": "WebUI Save redirect to \".\\outputs\"",
    
    "run_button": "Create Prompt (1 Image only)",
    "run_same_button": "Batch with last Character and Action",
    "save_settings_button": "Save Settings",
    "load_settings_button": "Load Settings",
    
    "gr_info_create_1": "Creating 1, please wait ...",
    "gr_info_create_n": "Creating {}of{}, please wait ...",
    "gr_info_settings_saved": "Settings Saved to {}",
    "gr_info_settings_loaded": "Settings Loaded {}",
    
    "gr_warning_interface_both_none": "[Warning] Both AI Gen and Image Gen mode are \"none\" nothing will output",
    "gr_warning_click_create_first": "[Warning] Click \"Create Prompt\" first batch generate",
    "gr_warning_creating_ai_prompt":"[Warning] AI prompt request failed with Code [{}] {}",
    
    "gr_error_creating_image":"[Error] Got error from Image API: {}",
    
    "ai_system_prompt": textwrap.dedent("""\
    You are a Stable Diffusion prompt writer. Follow these guidelines to generate prompts:
    1.Prohibited keywords: Do not use any gender-related words such as "man," "woman," "boy," "girl," "person," or similar terms.
    2.Format: Provide 8 to 16 keywords separated by commas, keeping the prompt concise.
    3.Content focus: Concentrate solely on visual elements of the image; avoid abstract concepts, art commentary, or descriptions of intent.
    4.Keyword categories: Ensure the prompt includes keywords from the following categories:
        - Theme or style (e.g., cyberpunk, fantasy, wasteland)
        - Location or scene (e.g., back alley, forest, street)
        - Visual elements or atmosphere (e.g., neon lights, fog, ruined)
        - Camera angle or composition (e.g., front view, side view, close-up)
        - Action or expression (e.g., standing, jumping, smirk, calm)
        - Environmental details (e.g., graffiti, trees)
        - Time of day or lighting (e.g., sunny day, night, golden hour)
        - Additional effects (e.g., depth of field, blurry background)
    5.Creativity and coherence: Select keywords that are diverse and creative, forming a vivid and coherent scene.
    6.User input: Incorporate the exact keywords from the user's query into the prompt where appropriate.
    7.Emphasis handling: If the user emphasizes a particular aspect, you may increase the number of keywords in that category (up to 6), but ensure the total number of keywords remains between 8 and 16.
    8.Character description: You may describe actions and expressions but must not mention specific character traits (such as gender or age). Words that imply a character (e.g., "warrior") are allowed as long as they do not violate the prohibited keywords.
    9.Output: Provide the answer as a single line of comma-separated keywords.
    Prompt for the following theme:
    """),
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
    
    "api_hf_enable": "高清修复",
    "api_hf_scale": "放大倍率",
    "api_hf_denoise": "降噪强度",
    "api_hf_upscaler": "高清修复模型",
    "api_hf_colortransfer": "色彩传递",
    "api_hf_incorrect_upscaler": "选择了错误的高清模型，使用默认 {}",
    "colortransfer_webui_warning" : "注意：色彩传递并非WebUI内嵌功能，色彩传递后的图片保存至 \".\\outputs\" 目录下。",
    "api_webui_savepath_override": "WebUI 存盘重定向 \".\\outputs\"",
    
    "run_button": "生成（单图）",
    "run_same_button": "批量生成（继承人物与动作）",
    "save_settings_button": "保存设置",
    "load_settings_button": "载入设置",
    
    "gr_info_create_1": "正在生成，请稍候……",
    "gr_info_create_n": "正在生成 {} / {}， 请稍候……",
    "gr_info_settings_saved": "配置已保存： {}",
    "gr_info_settings_loaded": "配置已载入： {}",
    
    "gr_warning_interface_both_none": "注意：AI题词和图片生成接口都被设定为 \"none\"，此时执行没有图片输出",
    "gr_warning_click_create_first": "注意：批量生成前需要先点 \"Create Prompt\"",
    "gr_warning_creating_ai_prompt":"注意：AI题词请求失败，代码： [{}] {}",
    
    "gr_error_creating_image":"错误：生成图片返回故障信息：[{}]",    
    
    "ai_system_prompt": textwrap.dedent("""\
    你是一个Stable Diffusion提示词编写者，按照以下指南生成提示词：
    1.禁止关键词： 不得使用任何性别相关词，如“man”、“woman”、“boy”、“girl”、“person”或类似词。
    2.格式： 提供8到16个关键词，用逗号分隔，保持简洁。
    3.内容重点： 仅关注图像的可视元素，避免抽象概念、艺术评论或意图描述。
    4.关键词类别： 确保提示词涵盖以下类别：
        - 主题或风格 (e.g., cyberpunk, fantasy, wasteland)
        - 地点或场景 (e.g., back alley, forest, street)
        - 可视元素或氛围 (e.g., neon lights, fog, ruined)
        - 镜头视角或构图 (e.g., front view, side view, close-up)
        - 动作姿势或表情情绪 (e.g., standing, jumping, smirk, calm)        
        - 环境细节 (e.g., graffiti, trees)
        - 时间或光线 (e.g., sunny day, night, golden hour)
        - 额外效果 (e.g., depth of field, blurry background)        
    5.创意与连贯性： 关键词选择需多样且富有创意，形成一个生动连贯的场景。
    6.用户输入： 将用户查询中的关键词逐字纳入，适当融入提示词。
    7.强调处理： 若用户强调某方面，可增加该类别关键词（最多6个），但总数保持在8到16个。
    8.角色描述： 可描述动作和表情，但不得提及角色特征（如性别、年龄）。允许使用暗示角色的词（如warrior），只要不涉及禁止词。
    9.输出： 以单行逗号分隔的关键词形式且必须以英文回答。
    Prompt for the following theme:
    """),
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
image_outputs_folder = os.path.join(current_dir, 'outputs')

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
    "api_addr": "127.0.0.1:7860",
    "api_webui_savepath_override": False,
    
    "api_hf_enable": False,
    "api_hf_scale": 1.5,
    "api_hf_denoise": 0.4,
    "api_hf_upscaler_list": ["ESRGAN_4x(W)", "R-ESRGAN 2x+(W)", "R-ESRGAN 4x+(W)", "R-ESRGAN 4x+ Anime6B(W)", "4x_NMKD-Siax_200k(C)", "8x_NMKD-Superscale_150000_G(C)", "4x-AnimeSharp(C)", "4x-UltraSharp(C)", "ESRGAN_4x(C)","RealESRGAN_x2(C)","RealESRGAN_x4(C)"],
    "api_hf_upscaler_selected": "R-ESRGAN 4x+(W)",
    "api_hf_colortransfer": "none",
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
        gr.Warning(LANG["gr_warning_creating_ai_prompt"].format(response.status_code, ''))
        return ''

def llm_send_request(input_prompt, ai_remote_addr, ai_remote_model, ai_remote_timeout):
    data = {
            'model': ai_remote_model,
            'messages': [
                {"role": "system", "content": LANG["ai_system_prompt"]},
                {"role": "user", "content": input_prompt + ";Response in English"}
            ],  
        }
    
    try:
        response = requests.post(ai_remote_addr, headers={"Content-Type": "application/json", "Authorization": "Bearer " + settings_json["remote_ai_api_key"]}, json=data, timeout=ai_remote_timeout)
        return decode_response(response)
    except Exception as e:
        print(f"[{CAT}]:Error: Request failed with status code {response.status_code}\nException: {e}")
        gr.Warning(LANG["gr_warning_creating_ai_prompt"].format(response.status_code, e))
    
    return ''

def llm_send_local_request(input_prompt, server, temperature=0.5, n_predict=512):
    data = {
            "temperature": temperature,
            "n_predict": n_predict,
            "cache_prompt": True,
            "stop": ["<|im_end|>"],
            'messages': [
                {"role": "system", "content": LANG["ai_system_prompt"]},
                {"role": "user", "content": input_prompt + ";Response in English"}
            ],  
        }
    try:
        response = requests.post(server, headers={"Content-Type": "application/json"}, json=data)    
        return decode_response(response)
    except Exception as e:
        print(f"[{CAT}]:Error: Request failed with status code {response.status_code}\nException: {e}")
        gr.Warning(LANG["gr_warning_creating_ai_prompt"].format(response.status_code, e))
    
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

def create_image(interface, addr, model_file_select, prompt, neg_prompt, 
                 seed, cfg, steps, width, height, 
                 api_hf_enable, ai_hf_scale, ai_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override):
    def convert_to_condensed_format(data, api_webui_savepath_override):
        # Ensure data is a dictionary by parsing it if it's a string
        if isinstance(data, str):
            data = json.loads(data)
        elif not isinstance(data, dict):
            print(f"[{CAT}]Color Transfer:Input must be a string (JSON) or dictionary")
            return ""
        
        # Extract main prompt components
        main_prompt = data["prompt"]
        negative_prompt = data["negative_prompt"]
        
        # Extract key generation parameters with fallbacks
        steps = data["steps"]
        sampler = data.get("sampler_name", "Euler a")
        cfg_scale = data["cfg_scale"]
        seed = data["seed"]
        width = data["width"]
        height = data["height"]
        
        # Model and VAE parameters
        model_hash = data.get("sd_model_hash", "unknown")
        model = data.get("sd_model_name", "unknown")
        vae_hash = data.get("sd_vae_hash", "unknown")
        vae = data.get("sd_vae_name", "unknown")
        denoising = data["denoising_strength"]
        clip_skip = data.get("clip_skip", 2)
        
        # High-resolution parameters from extra_generation_params
        extra_params = data.get("extra_generation_params", {})
        hires_upscale = extra_params.get("Hires upscale", 1.2)  # Using value from your input
        hires_steps = extra_params.get("Hires steps", 20)
        hires_upscaler = extra_params.get("Hires upscaler", "R-ESRGAN 4x+")
        downcast = extra_params.get("Downcast alphas_cumprod", True)
        version = data.get("version", "unknown")

        # Construct the condensed format
        condensed = f"{main_prompt}\n"
        condensed += f"Negative prompt: {negative_prompt}\n"
        condensed += f"Steps: {steps}, Sampler: {sampler}, Schedule type: Automatic, CFG scale: {cfg_scale}, Seed: {seed}, "
        condensed += f"Size: {width}x{height}, Model hash: {model_hash}, Model: {model}, "        
        if api_webui_savepath_override:
            condensed += f"VAE hash: {vae_hash}, VAE: {vae}, Denoising strength: {denoising}, Clip skip: {clip_skip}, "
            condensed += f"Hires upscale: {hires_upscale}, Hires steps: {hires_steps}, Hires upscaler: {hires_upscaler}, "
        else:
            condensed += f"VAE hash: {vae_hash}, VAE: {vae}, Clip skip: {clip_skip}, "
        condensed += f"Downcast alphas_cumprod: {downcast}, Version: {version}"

        return condensed

    if 'none' != interface:
        api_image = None
        src_info = ''
        current_time = None
        try:            
            if 'ComfyUI' == interface:
                if api_hf_enable: 
                    gr.Warning("WIP: ComfyUI Hires Fix workflow not upload yet")
                    if not str(api_hf_upscaler).__contains__('(C)'):
                        print(f"[{CAT}]Reset {api_hf_upscaler} to 4x-UltraSharp")
                        api_hf_upscaler = '4x-UltraSharp'
                        gr.Warning(LANG["api_hf_incorrect_upscaler"].format(api_hf_upscaler))
                    else:
                        api_hf_upscaler = str(api_hf_upscaler).replace('(C)', '')
                    
                image_data_list = run_comfyui(server_address=addr, model_name=model_file_select, 
                                              positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height
                                              )
                image_data_bytes = bytes(image_data_list)  
                api_image = Image.open(BytesIO(image_data_bytes))    
            elif 'WebUI' == interface:                
                metadata = PngImagePlugin.PngInfo()
                
                if api_hf_enable: 
                    if not str(api_hf_upscaler).__contains__('(W)'):
                        print(f"[{CAT}]Reset {api_hf_upscaler} to R-ESRGAN 4x+")
                        api_hf_upscaler = 'R-ESRGAN 4x+'
                        gr.Warning(LANG["api_hf_incorrect_upscaler"].format(api_hf_upscaler))
                    else:
                        api_hf_upscaler = str(api_hf_upscaler).replace('(W)', '')
                        
                    src_image, _, src_info = run_webui(server_address=addr, model_name=model_file_select, 
                                    positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height,
                                    hf_enable=api_hf_enable, hf_scale=ai_hf_scale, hf_denoising_strength=ai_hf_denoise, hf_upscaler=api_hf_upscaler, savepath_override=api_webui_savepath_override)
                    
                    
                    if 'none' != api_hf_colortransfer:
                        gr.Warning(LANG["colortransfer_webui_warning"])
                        ref_image, _, ref_info = run_webui(server_address=addr, model_name=model_file_select, 
                                            positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height,
                                            hf_enable=False, hf_scale=ai_hf_scale, hf_denoising_strength=ai_hf_denoise, hf_upscaler=api_hf_upscaler, savepath_override=api_webui_savepath_override)  
                        
                        PT = ColorTransfer()        
                        if "Mean" == api_hf_colortransfer:
                            s = np.array(src_image).astype(np.float32)     
                            r = np.array(ref_image).astype(np.float32)       
                            api_image = Image.fromarray(PT.mean_std_transfer(img_arr_in=s, img_arr_ref=r))
                        elif "Lab" == api_hf_colortransfer:
                            s = np.array(src_image).astype(np.uint8)     
                            r = np.array(ref_image).astype(np.uint8)       
                            api_image = Image.fromarray(PT.lab_transfer(img_arr_in=s, img_arr_ref=r))
                            
                        current_time = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")                                                
                        image_filename = f"{current_time}_{seed}_reference.png"
                        image_filepath = os.path.join(image_outputs_folder, image_filename)                                                    
                        ref_para = convert_to_condensed_format(''.join(ref_info), False)
                        metadata.add_text("parameters", ref_para)                        
                        ref_image.save(image_filepath, pnginfo=metadata)
                        print(f"[{CAT}]Color Transfer: Reference Image saved to {image_filepath}")                        
                    else:
                        api_image = src_image                    
                else:
                    api_image, _, src_info = run_webui(server_address=addr, model_name=model_file_select, 
                                        positive_prompt=prompt, negative_prompt=neg_prompt, random_seed=seed, cfg=cfg, steps=steps, width=width, height=height,
                                        hf_enable=api_hf_enable, hf_scale=ai_hf_scale, hf_denoising_strength=ai_hf_denoise, hf_upscaler=api_hf_upscaler, savepath_override=api_webui_savepath_override)                                    
                
                if api_webui_savepath_override:
                    if not current_time:
                        current_time = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    image_filename = f"{current_time}_{seed}.png"
                    image_filepath = os.path.join(image_outputs_folder, image_filename)                        
                    str_para = convert_to_condensed_format(''.join(src_info), api_hf_enable)
                    metadata.add_text("parameters", str_para)       
                    api_image.save(image_filepath, pnginfo=metadata)                        
                    print(f"[{CAT}]WebUI: Image saved to {image_filepath}")
                                                
            return api_image
        except Exception as e:
            print(f"[{CAT}]Error creating image: {e}")
            raise gr.Error(LANG["gr_error_creating_image"].format(e))            
    
    return None

def create_prompt(character1, character2, character3, action, original_character, random_seed, custom_prompt, 
                    ai_interface, ai_prompt, prompt_ban, ai_remote_addr, ai_remote_model, ai_remote_timeout,
                    ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                    api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select,
                    api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override
            ) -> tuple[str, str, Image.Image, Image.Image]:            
    global last_prompt
    global last_info
    global last_ai_text
    global LANG
        
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
    LANG["ai_system_prompt"] = textwrap.dedent(ai_system_prompt_text)
    if 'Remote' == ai_interface:
        ai_text = llm_send_request(ai_prompt, ai_remote_addr, ai_remote_model, ai_remote_timeout)
    elif 'Local' == ai_interface:
        ai_text = llm_send_local_request(ai_prompt, ai_local_addr, ai_local_temp, ai_local_n_predict)        
    
    final_prompt = f'{custom_prompt}{prompt}{act}{ai_text}{api_prompt}'
    for ban_word in prompt_ban.split(','):
        final_prompt = final_prompt.replace(ban_word.strip(), '')
        
    api_images = []
    api_image = create_image(api_interface, api_addr, api_model_file_select, final_prompt, api_neg_prompt, 
                             seed1, cfg, steps, width, height, 
                             api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override)
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
                            api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select,
                            api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override
            ) -> tuple[str, str, Image.Image, Image.Image]:        
    global LANG
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
            LANG["ai_system_prompt"] = textwrap.dedent(ai_system_prompt_text)
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
            
        to_image_create_prompt = f'{custom_prompt}{last_prompt}{ai_text}{api_prompt}'
        for ban_word in prompt_ban.split(','):
            to_image_create_prompt = to_image_create_prompt.replace(ban_word.strip(), '')
        
        final_info = f'{index}:\nCustom Promot:[{custom_prompt}]\n{last_info}\nAI Prompt:[{ai_text}]'
        api_image = create_image(api_interface, api_addr, api_model_file_select, to_image_create_prompt, api_neg_prompt, 
                                 seed, cfg, steps, width, height, 
                                 api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override)
        final_prompt = f'{index}:\n{to_image_create_prompt}\n'
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
                        ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_addr,
                        api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer,api_webui_savepath_override
                        ):        
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
        
        "api_hf_enable": api_hf_enable,
        "api_hf_scale": api_hf_scale,
        "api_hf_denoise": api_hf_denoise,
        "api_hf_upscaler_list": settings_json["api_hf_upscaler_list"],
        "api_hf_upscaler_selected": api_hf_upscaler,
        "api_hf_colortransfer": api_hf_colortransfer,
        "api_webui_savepath_override": api_webui_savepath_override,
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
            settings_json["ai_local_addr"],settings_json["ai_local_temp"],settings_json["ai_local_n_predict"],settings_json["api_interface"],settings_json["api_addr"],\
            settings_json["api_hf_enable"], settings_json["api_hf_scale"], settings_json["api_hf_denoise"], settings_json["api_hf_upscaler_selected"], settings_json["api_hf_colortransfer"], settings_json["api_webui_savepath_override"]

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
    
    return character_list, action_list, original_character_list, model_files_list, LANG
