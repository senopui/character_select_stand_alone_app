import gradio as gr
from lib import init, create_prompt, create_with_last_prompt, save_current_setting, load_saved_setting, batch_generate_rule_change
from lib import JAVA_SCRIPT, CSS_SCRIPT, TITLE, settings_json

if __name__ == '__main__':
    character_list, action_list, original_character_list, model_files_list, LANG = init()
    
    with gr.Blocks(js=JAVA_SCRIPT, css=CSS_SCRIPT, title=TITLE) as ui:
        with gr.Row():
            character1 = gr.Dropdown(
                choices=character_list,
                label=LANG["character1"],
                value=settings_json["character1"],
                allow_custom_value=False,
            )
            
            character2 = gr.Dropdown(
                choices=character_list,
                label=LANG["character2"],
                value=settings_json["character2"],
                allow_custom_value=False,
            )
                            
            character3 = gr.Dropdown(
                choices=character_list,
                label=LANG["character3"],
                value=settings_json["character3"],
                allow_custom_value=False,
            )

            action = gr.Dropdown(
                choices=action_list,
                label=LANG["action"],
                value=settings_json["action"],
                allow_custom_value=False,    
            )
            
            original_character = gr.Dropdown(
                choices=original_character_list,
                label=LANG["original_character"],
                value='none',
                allow_custom_value=False,
            )
            
        with gr.Row(elem_classes='main_row'):           
            with gr.Column(elem_classes='column_prompts'):
                with gr.Row():
                    api_model_file_select = gr.Dropdown(
                            choices=model_files_list,
                            label=LANG["api_model_file_select"],
                            value=settings_json["api_model_file_select"],
                            allow_custom_value=False,
                        )            
                    random_seed = gr.Slider(minimum=-1,
                            maximum=4294967295,
                            step=1,
                            value=-1,
                            label=LANG["random_seed"],
                        )    
                with gr.Row():
                    thumb_image = gr.Gallery(type="pil", columns=3, show_download_button=False, object_fit='scale-down', height=244, label="Thumb Image Gallery")
                with gr.Row(equal_height=True):
                    with gr.Row(scale=2):
                        api_hf_enable = gr.Checkbox(label=LANG["api_hf_enable"],value=False)
                        api_webui_savepath_override = gr.Checkbox(label=LANG["api_webui_savepath_override"], value=False)
                        api_hf_upscaler = gr.Dropdown(
                            choices=settings_json["api_hf_upscaler_list"],
                            label=LANG["api_hf_upscaler"],
                            value=settings_json["api_hf_upscaler_selected"],
                            allow_custom_value=False,
                        )
                        api_hf_colortransfer = gr.Dropdown(
                            choices=["none", "Mean", "Lab"],
                            label=LANG["api_hf_colortransfer"],
                            value=settings_json["api_hf_colortransfer"],
                            allow_custom_value=False,
                        )
                    with gr.Row(scale=1):
                        api_hf_scale = gr.Slider(minimum=1.2,
                            maximum=2.0,
                            step=0.1,
                            value=settings_json["api_hf_scale"],
                            label=LANG["api_hf_scale"],
                        )
                        api_hf_denoise = gr.Slider(minimum=0.1,
                            maximum=0.7,
                            step=0.01,
                            value=settings_json["api_hf_denoise"],
                            label=LANG["api_hf_denoise"],
                        )
                with gr.Row():
                    with gr.Column():
                        run_button = gr.Button(value=LANG["run_button"], variant='primary') 
                    with gr.Column():
                        run_same_button = gr.Button(value=LANG["run_same_button"])
                with gr.Row():
                    with gr.Column():                        
                        # API prompts
                        custom_prompt = gr.Textbox(value=settings_json["custom_prompt"], label=LANG["custom_prompt"], elem_id="custom_prompt_text") 
                        api_prompt = gr.Textbox(value=settings_json["api_prompt"], label=LANG["api_prompt"], elem_id="positive_prompt_text")
                        api_neg_prompt = gr.Textbox(value=settings_json["api_neg_prompt"], label=LANG["api_neg_prompt"], elem_id="negative_prompt_text")                        
                        with gr.Row():
                            # AI prompts
                            batch_generate_rule = gr.Radio(choices=["Last", "Once", "Everytime", "Disable"], 
                                                        value=settings_json["batch_generate_rule"],
                                                        label=LANG["batch_generate_rule"],
                                                        scale=3)
                            api_image_data = gr.Textbox(value=settings_json["api_image_data"], label=LANG["api_image_data"], scale=2)                            
                        ai_prompt = gr.Textbox(value=settings_json["ai_prompt"], label=LANG["ai_prompt"], elem_id="ai_prompt_text")
                        prompt_ban = gr.Textbox(value=settings_json["prompt_ban"], label=LANG["prompt_ban"], elem_id="prompt_ban_text")                
                with gr.Row():             
                    with gr.Column():                               
                        # AI Prompt Generator                
                        ai_interface = gr.Dropdown(
                            choices=['none', 'Remote', 'Local'],
                            label=LANG["ai_interface"],
                            value=settings_json["ai_interface"],
                            allow_custom_value=False,
                        )
                        
                        ai_remote_addr = gr.Textbox(value=settings_json["remote_ai_base_url"], label=LANG["ai_remote_addr"])
                        ai_remote_model = gr.Textbox(value=settings_json["remote_ai_model"], label=LANG["ai_remote_model"])
                        ai_remote_timeout = gr.Slider(minimum=5,
                            maximum=300,
                            step=1,
                            value=settings_json["remote_ai_timeout"],
                            label=LANG["ai_remote_timeout"],
                        )   
                        
                        ai_local_addr = gr.Textbox(value=settings_json["ai_local_addr"], label=LANG["ai_local_addr"])   
                        ai_local_temp = gr.Slider(minimum=0.1,
                            maximum=1,
                            step=0.05,
                            value=settings_json["ai_local_temp"],
                            label=LANG["ai_local_temp"],
                        )
                        ai_local_n_predict = gr.Slider(minimum=128,
                            maximum=4096,
                            step=128,
                            value=settings_json["ai_local_n_predict"],
                            label=LANG["ai_local_n_predict"],
                        )                            
                        
                    with gr.Column():
                        # API Image Generator                
                        api_interface = gr.Dropdown(
                            choices=['none', 'ComfyUI', 'WebUI'],
                            label=LANG["api_interface"],
                            value=settings_json["api_interface"],
                            allow_custom_value=False,
                        )
                        api_addr = gr.Textbox(value=settings_json["api_addr"], label=LANG["api_addr"])                     
                        
                        with gr.Row():
                            save_settings_button = gr.Button(value=LANG["save_settings_button"], variant='stop') 
                            load_settings_button = gr.UploadButton(label=LANG["load_settings_button"], file_count='single', file_types=['.json']) 
            with gr.Column(elem_classes='column_images'):
                api_image = gr.Gallery(type="pil", columns=4, show_download_button=False, object_fit='contain', preview=True, height=872, label=LANG["api_image"])
                output_prompt = gr.Textbox(label=LANG["output_prompt"])
                output_info = gr.Textbox(label=LANG["output_info"])
                
                gr.Markdown(LANG["ai_system_prompt_warning"])
                ai_system_prompt_text = gr.Textbox(label=LANG["ai_system_prompt_text"], value=LANG["ai_system_prompt"])
        
        run_button.click(fn=create_prompt, 
                         inputs=[character1, character2, character3, action, original_character, random_seed, custom_prompt, 
                                 ai_interface, ai_prompt, prompt_ban, ai_remote_addr, ai_remote_model, ai_remote_timeout,
                                 ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                                 api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select,
                                 api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override
                                 ], 
                         outputs=[output_prompt, output_info, thumb_image, api_image])
        
        run_same_button.click(fn=create_with_last_prompt, 
                         inputs=[random_seed,  custom_prompt,
                                 ai_interface, ai_prompt, batch_generate_rule, prompt_ban, ai_remote_addr, ai_remote_model, ai_remote_timeout,
                                 ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                                 api_interface, api_addr, api_prompt, api_neg_prompt, api_image_data, api_model_file_select,
                                 api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override
                                 ], 
                         outputs=[output_prompt, output_info, api_image])
        
        save_settings_button.click(fn=save_current_setting,
                                   inputs=[character1, character2, character3, action, api_model_file_select, random_seed,
                                           custom_prompt, api_prompt, api_neg_prompt, api_image_data, 
                                           ai_prompt, batch_generate_rule, prompt_ban, ai_interface, 
                                           ai_remote_addr, ai_remote_model, ai_remote_timeout,
                                           ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_addr,
                                           api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override
                                           ],
                                   outputs=[])
        
        load_settings_button.upload(fn=load_saved_setting,
                                   inputs=[load_settings_button],
                                   outputs=[character1, character2, character3, action, api_model_file_select, random_seed,
                                            custom_prompt, api_prompt, api_neg_prompt, api_image_data, 
                                            batch_generate_rule, ai_prompt, prompt_ban, ai_interface, 
                                            ai_remote_addr, ai_remote_model, ai_remote_timeout,
                                            ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_addr,
                                            api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler, api_hf_colortransfer, api_webui_savepath_override
                                            ])
        
        batch_generate_rule.change(fn=batch_generate_rule_change,
                                inputs=batch_generate_rule)
        
    ui.launch()