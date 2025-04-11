# Language
import textwrap


LANG_EN = {
    "character1": "Character list 1",
    "character2": "Character list 2",
    "character3": "Character list 3",
    "tag_assist": "Tag assist",
    "original_character": "Original Character",
    "view_angle": "Angle",
    "view_camera": "Camera",
    "view_background": "Background",
    "view_style": "Style",
    "api_model_file_select": "Model list (ComfyUI Default:waiNSFWIllustrious_v120)",
    "random_seed": "Random Seed",
    "thumb_image": "Character Thumb Preview",
    "custom_prompt": "Custom Prompt (Head)",
    "api_prompt": "Positive Prompt (Tail)",
    "api_neg_prompt": "Negative Prompt",
    "batch_generate_rule": "AI rule for Batch generate",
    "api_image_data": "CFG,Step,W,H,Batch (1-32)",
    "api_image_landscape": "Landscape",
    "ai_prompt": "AI Prompt",
    "prompt_ban": "Prompt Ban List",
    "ai_interface": "AI Prompt Generator",
    "remote_ai_base_url": "Remote AI url",
    "remote_ai_model": "Remote AI model",
    "remote_ai_timeout": "Remote AI connection timeout",
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
    "system_settings": "Settings",
    "image_info": "Image Info Reader",
    "image_info_to_generate": "Send image info to generator",
    
    "api_hf": "Hires Fix & Refiner",
    "api_hf_enable": "Enable Hires Fix",
    "api_hf_scale": "Upscale by",
    "api_hf_denoise": "Denoising",
    "api_hf_upscaler_selected": "Upscaler",
    "api_hf_colortransfer": "Color Transfer",
    "api_hf_incorrect_upscaler": "Incorrect Upscaler selected, reset to default {}",
    "api_hf_random_seed":"HF Random Seed (ComfyUI)",
    
    "api_refiner_enable":"Enable Refiner",
    "api_refiner_model":"Refiner Model",
    "api_refiner_ratio":"Ratio",
        
    "api_webui_savepath_override": "WebUI Save to \".\\outputs\"",
    "api_comfyui_new_workflow": "New Workflow for ComfyUI",
    "api_warning_lora": "Before you start, upgrade custom node ComfyUI_Mira to v0.4.9.2 or higher.\n[COPY_CUSTOM=IndianRed]LoRA, vPred & Refiner not working in old workflow.[/COPY_CUSTOM]\n\nCheck: [COPY_URL]https://github.com/mirabarukaso/ComfyUI_Mira#lora[/COPY_URL]\n\nClick to close and copy URL to clip board.",
    
    "run_button": "Create Prompt",
    "run_random_button": "Batch (Random)",
    "run_same_button": "Batch (Last Prompt)",
    "save_settings_button": "Save Settings",
    "load_settings_button": "Load Settings",
    "manual_update_database": "Update thumbs and tags",
    
    "gr_info_create_n": "Creating {} of {}, please wait ...",
    "gr_info_settings_saved": "Settings Saved to {}",
    "gr_info_settings_loaded": "Settings Loaded {}",
    "gr_info_manual_update_database": "Now downloading {}, please wait a while.",
    "gr_info_manual_update_database_done": " {} updated",
    "gr_info_tag_assist_add": "Tag assist: [{}] add to [{}].\nOther characters may be affected when you generate multicharacter images.",
    "gr_info_color_transfer_webui": "Creating refernect image for WebUI Color Transfer...",
    "gr_info_color_transfer_webui_warning": "Image Color Transfer is not a webUI embedded feature, so images are saved separately to the \".\\outputs\" directory of this App.",
    
    "gr_warning_interface_both_none": "[Warning] Both AI Gen and Image Gen mode are \"none\" nothing will output",
    "gr_warning_creating_ai_prompt":"[Warning] AI prompt request failed with Code [{}] {}",
    "gr_warning_cfgstepwh_mismatch":"[Warning] \"CFG,Step,W,H,Batch\" data mismatch, use default: 7.0, 30, 1024, 1360, 1",
    "gr_warning_manual_update_database": "Download files failed, please check console logs.\n{}",
    
    "gr_error_creating_image":"[Error] Got error from Image API:\n[COPY_CUSTOM=red]{}[/COPY_CUSTOM]\nCheck your {} console logs, and Local Image Generator API/IP/Port settings.",
    
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
    9.Output: Provide the answer as a single line of comma-separated keywords in English, do not include any responses other than keywords.
    10. Output Example:nature style, eating, forest, meadow, sunlight, vibrant colors, close-up, detailed, serene, peaceful, green foliage, wild berries, natural textures, soft focus, shallow depth of field, tranquil atmosphere
    Prompt for the following theme:
    """),
    
    "overlay_title": "Now generating...",
    "overlay_te": "Elapsed time:",
    "overlay_sec": "seconds",
    
    "setup_greet_title": "Initial Setup Wizard",
    "setup_greet_message": "Hi there! This wizard will run automatically the first time you start this program, or if you can't find the settings.json configuration file, please follow the instructions to initialize the settings.",
    "setup_model_folder_title": "Setup Model Folder",
    "setup_model_folder": "Please specify the directory where the model file safetensors is located. It is recommended to copy it from the Explore's address bar.",    
    "setup_model_filter_title": "Model File Filter",
    "setup_model_filter": "Do you want to enable the model name filter?",    
    "setup_model_filter_keyword_title": "Model Name Whitelist",
    "setup_model_filter_keyword": "Please set the keyword for the model name in the whitelist, multiple keywords separated by semicolon commas \",\"",
    "setup_search_modelinsubfolder_title": "Subfolder",
    "setup_search_modelinsubfolder": "Do you want to search for model files in subfolders?",    
    "setup_remote_ai_api_key_title": "API Key",
    "setup_remote_ai_api_key": "Enter Remote Large Language Model API key (also changeable in settings.json)",    
    "setup_webui_comfyui_title": "Important!",
    "setup_webui_comfyui": "If you are using ComfyUI, enable dev mode in the settings. \nIf you are using WebUI, modify webui-user.bat and COMMANDLINE_ARGS= --api\nThere is a \"model_path_2nd\" in settings.json, if you using WebUI and ComfyUI in same time, set it to another checkpoints folder."
}

LANG_CN = {
    "character1": "角色1",
    "character2": "角色2",
    "character3": "角色3",
    "tag_assist": "角色标签辅助",
    "original_character": "自定义及原创角色",
    "view_angle": "视角",
    "view_camera": "镜头",
    "view_background": "背景",
    "view_style": "风格",
    "api_model_file_select": "模型选择 (ComfyUI默认:waiNSFWIllustrious_v120)",
    "random_seed": "种子",
    "thumb_image": "角色预览",
    "custom_prompt": "自定义提示词（放在最前）",
    "api_prompt": "效果提示词（放在末尾）",
    "api_neg_prompt": "负面提示词",
    "batch_generate_rule": "AI填词规则",
    "api_image_data": "引导,步数,宽,高,批量1-32",
    "api_image_landscape": "宽高互换",
    "ai_prompt": "AI提示词（用于生成填词）",
    "prompt_ban": "提示词黑名单",
    "ai_interface": "AI填词设置",
    "remote_ai_base_url": "远程AI地址",
    "remote_ai_model": "远程AI模型",
    "remote_ai_timeout": "远程AI超时（秒）",
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
    "system_settings": "设置",
    "image_info": "读取图片信息",
    "image_info_to_generate": "传输图片数据到生成器",
    
    "api_hf": "高清修复 & Refiner",
    "api_hf_enable": "启用高清修复",
    "api_hf_scale": "放大倍率",
    "api_hf_denoise": "降噪强度",
    "api_hf_upscaler_selected": "高清修复模型",
    "api_hf_colortransfer": "色彩传递",
    "api_hf_incorrect_upscaler": "选择了错误的高清模型，使用默认 {}",
    "api_hf_random_seed":"高修随机种子(ComfyUI)",
    
    "api_refiner_enable":"启用Refiner",
    "api_refiner_model":"Refiner模型",
    "api_refiner_ratio":"比例",
    
    "api_webui_savepath_override": "WebUI 存盘重定向 \".\\outputs\"",
    "api_comfyui_new_workflow": "ComfyUI新工作流",
    "api_warning_lora": "注意，在你开始前，必须把自定义节点 ComfyUI_Mira 升级到至少0.4.9.2或更高。\n[COPY_CUSTOM=IndianRed]LoRA、vPred、Refiner功能需要新工作流。[/COPY_CUSTOM]\n\n参考：[COPY_URL]https://github.com/mirabarukaso/ComfyUI_Mira#lora[/COPY_URL]\n\n点击此处会关闭提示，并复制URL到剪贴板。",
    
    "run_button": "单图生成",
    "run_random_button": "批量（随机）",
    "run_same_button": "批量（上次生成）",
    "save_settings_button": "保存设置",
    "load_settings_button": "载入设置",
    "manual_update_database": "更新缩略图与标签库",
    
    "gr_info_create_n": "正在生成 {} / {}， 请稍候……",
    "gr_info_settings_saved": "配置已保存： {}",
    "gr_info_settings_loaded": "配置已载入： {}",
    "gr_info_manual_update_database": "正在下载 {} 请稍候",
    "gr_info_manual_update_database_done": " {} 更新完成",
    "gr_info_color_transfer_webui": "正在生成参考图像用于WebUI色彩传递...",
    "gr_info_color_transfer_webui_warning": "注意：色彩传递并非WebUI内嵌功能，色彩传递后的图片保存至 \".\\outputs\" 目录下",
    
    "gr_warning_interface_both_none": "注意：AI题词和图片生成接口都被设定为 \"none\"，此时执行没有图片输出",
    "gr_warning_creating_ai_prompt":"注意：AI题词请求失败，代码： [{}] {}",
    "gr_warning_cfgstepwh_mismatch":"注意：“引导,步数,宽,高,批量”设置存在错误，使用默认数据：7.0, 30, 1024, 1360, 1",
    "gr_warning_manual_update_database": "文件下载失败，请检查控制台日志确认问题\n{}",
    "gr_info_tag_assist_add": "角色标签辅助：[{}] 追加到角色 [{}].\n如果你在生成多人图像，其他人可能会受到影响，请注意。",
    
    "gr_error_creating_image":"错误：生成图片返回故障信息：\n[COPY_CUSTOM=red]{}[/COPY_CUSTOM]\n请检查{}控制台输出的日志，同时检查本地生图设置是否正确配置。",
    
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
    9.输出： 仅以单行逗号分隔的关键词形式且必须以英文回答，不要加入关键词以外的任何回复。
    10.输出示例：nature style, eating, forest, meadow, sunlight, vibrant colors, close-up, detailed, serene, peaceful, green foliage, wild berries, natural textures, soft focus, shallow depth of field, tranquil atmosphere
    Prompt for the following theme:
    """),
    
    "overlay_title": "后端正在生成……",
    "overlay_te": "经过时间：",
    "overlay_sec": "秒",
    
    "setup_greet_title": "初次设定界面",
    "setup_greet_message": "你好！在本程序第一次启动或找不到settings.json文件时，会自动运行向导程序，请按照说明进行初始化设定。",
    "setup_model_folder_title": "模型路径",
    "setup_model_folder": "请设置您的模型文件safetensors所在目录，建议从文件夹地址栏复制",    
    "setup_model_filter_title": "模型白名单",
    "setup_model_filter": "请选择是否要开启模型白名单",
    "setup_model_filter_keyword_title": "白名单关键字",
    "setup_model_filter_keyword": "请设置过滤器白名单关键字，如果需要多个关键字，请用半角逗号隔开“,”",
    "setup_search_modelinsubfolder_title": "子目录",
    "setup_search_modelinsubfolder": "是否搜索模型文件夹子目录下的模型文件",    
    "setup_remote_ai_api_key_title": "API密钥",
    "setup_remote_ai_api_key": "请输入你的远程语言模型API密钥（以后可以修改settings.json来设置）",    
    "setup_webui_comfyui_title": "重要信息",
    "setup_webui_comfyui": "如果你使用ComfyUI，请在设置中开启Dev Mode\n如果你使用WebUI，请修改webui-user.bat，修改COMMANDLINE_ARGS= --api\n在settings.json中有一个名叫model_path_2nd的设置项，如果你同时使用WebUI和ComfyUI，可以把它设置为另一个程序的模型所在目录。"
}
