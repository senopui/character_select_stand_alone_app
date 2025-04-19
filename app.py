import os
import signal
import gradio as gr
import sys
sys.path.append("scripts/")
from lib import init, create_prompt_ex, create_with_last_prompt, save_current_setting, load_saved_setting, batch_generate_rule_change, refresh_character_thumb_image_overlay, refresh_character_thumb_image, manual_update_database, create_characters
from lib import skip_next_generate_click, cancel_current_generate_click, update_sampler_and_scheduler
from lib import TITLE, settings_json, get_prompt_manager, add_lora, update_lora_list, warning_lora, get_lora_info 
from custom_com import custom_gallery_default, custom_thumb_default, get_13, get_7, get_2, get_1
from custom_com import JS_SHOWLOADING_WITHTHUMB, JS_HANDLERESPONSE, JS_SHOWTHUMB, JS_SHOWTHUMB_OVERLAY, JS_INIT, JS_SHOWCUSTOM_ERRORMESSAGE, JS_SHOWCUSTOM_MESSAGE
from custom_com import JS_CUSTOM_CHARACTERS_DROPDOWN, JS_CUSTOM_VIEW_DROPDOWN, JS_CUSTOM_DROPDOWN_UPDATE
from image_info import read_image_metadata, send_image_metadata
from websocket_server import run_websocket_server_in_thread

def run_gradio():
    character_list, character_list_values, view_tags, original_character_list, model_files_list, refiner_model_files_list, lora_file_list,\
        LANG, JAVA_SCRIPT, CSS_SCRIPT, LOADING_WAIT_BASE64, LOADING_FAILED_BASE64, SAMPLER, SCHEDULER = init(WSPORT)                                        
    
    def sync_trigger(trigger):
        return trigger
            
    def generate_lock():
        run_button = gr.Button(value=LANG["run_button"], variant='primary', scale=4, elem_id="run_button", visible=False)
        run_random_button = gr.Button(value=LANG["run_random_button"], variant='stop', scale=1, elem_id="run_random_button", visible=False)
        run_same_button = gr.Button(value=LANG["run_same_button"], variant='huggingface', scale=3, elem_id="run_same_button", visible=False)
        run_skip_button = gr.Button(value=LANG["run_skip_button"], scale=4, elem_id="run_skip_button", interactive=True, visible=True)
        run_cancel_button = gr.Button(value=LANG["run_cancel_button"], scale=4, elem_id="run_cancel_button", interactive=True, visible=True)
        return run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button
    
    def generate_unlock(js_ret):
        run_button = gr.Button(value=LANG["run_button"], variant='primary', scale=4, elem_id="run_button", visible=True)
        run_random_button = gr.Button(value=LANG["run_random_button"], variant='stop', scale=1, elem_id="run_random_button", visible=True)
        run_same_button = gr.Button(value=LANG["run_same_button"], variant='huggingface', scale=3, elem_id="run_same_button", visible=True)
        run_skip_button = gr.Button(value=LANG["run_skip_button"], scale=4, elem_id="run_skip_button", visible=False)
        run_cancel_button = gr.Button(value=LANG["run_cancel_button"], scale=4, elem_id="run_cancel_button", visible=False)
        return run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button
    
    def lock_skip_cancel():
        run_skip_button = gr.Button(value=LANG["run_skip_button"], scale=4, elem_id="run_skip_button", interactive=False)
        run_cancel_button = gr.Button(value=LANG["run_cancel_button"], scale=4, elem_id="run_cancel_button", interactive=False)
        return run_skip_button, run_cancel_button
        
    with gr.Blocks(js=JAVA_SCRIPT, css=CSS_SCRIPT, title=TITLE) as ui:        
        with gr.Row():
            custom_character_dropdown = gr.HTML(JS_CUSTOM_CHARACTERS_DROPDOWN, padding=False)

            # hide selected
            character = gr.Textbox(value='', visible=False, elem_id="cd-character-overlay")
            character1 = gr.Textbox(value=settings_json["character1"], visible=False, elem_id="cd-character1")
            character2 = gr.Textbox(value=settings_json["character2"], visible=False, elem_id="cd-character2")
            character3 = gr.Textbox(value=settings_json["character3"], visible=False, elem_id="cd-character3")
            original_character = gr.Textbox(value='none', visible=False, elem_id="cd-original-character")      
            
            # A lot dummy for java script
            dummy_dropdown = gr.Dropdown(visible=False, allow_custom_value=True)
            dummy_textbox1 = gr.Textbox(visible=False, value=f'{LANG["character1"]},{LANG["character2"]},{LANG["character3"]},{LANG["original_character"]}')
            dummy_textbox2 = gr.Textbox(visible=False, value=f'{LANG["view_angle"]},{LANG["view_camera"]},{LANG["view_background"]},{LANG["view_style"]}')
            dummy_text = gr.Text(visible=False, value='')
            
            dummy_wait_base64=gr.Text(value=LOADING_WAIT_BASE64, visible=False)
            dummy_failed_base64=gr.Text(value=LOADING_FAILED_BASE64, visible=False)
            dummy_show_loading_text=gr.Text(value=f"{LANG['overlay_title']},{LANG['overlay_te']},{LANG['overlay_sec']}", visible=False)
            
            dummy_view_data = gr.JSON(visible=False, value=view_tags)
            dummy_keys = gr.JSON(visible=False, value=character_list)
            dummy_values = gr.JSON(visible=False, value=character_list_values)
            dummy_oc = gr.JSON(visible=False, value=original_character_list)
            dummy_preview_image = gr.Textbox(visible=False, value=f'{WSPORT}')
            
        with gr.Row(elem_classes='main_row'):
            with gr.Column(elem_classes='column_prompts'):
                with gr.Row():  
                    random_seed = gr.Slider(minimum=-1,
                            maximum=4294967295,
                            step=1,
                            value=-1,
                            label=LANG["random_seed"],
                            elem_id="random_seed",
                            scale = 2
                        )    
                    api_image_data = gr.Textbox(value=settings_json["api_image_data"], label=LANG["api_image_data"], scale = 2)
                    api_image_landscape = gr.Checkbox(value=settings_json["api_image_landscape"], label=LANG["api_image_landscape"], scale = 1)
                with gr.Row():
                    api_hf_enable_shadow = gr.Checkbox(label=LANG["api_hf_enable"],value=settings_json["api_hf_enable"])
                    api_refiner_enable_shadow = gr.Checkbox(label=LANG["api_refiner_enable"],value=settings_json["api_refiner_enable"])
                    tag_assist = gr.Checkbox(label=LANG["tag_assist"], value=settings_json["tag_assist"])                    
                    keep_gallery = gr.Checkbox(label=LANG["keep_gallery"], value=settings_json["keep_gallery"])
                with gr.Row(elem_id="generate_buttons"):                    
                        run_button = gr.Button(value=LANG["run_button"], variant='primary', scale=4, elem_id="run_button")
                        run_random_button = gr.Button(value=LANG["run_random_button"], variant='stop', scale=1, elem_id="run_random_button")
                        run_same_button = gr.Button(value=LANG["run_same_button"], variant='huggingface', scale=3, elem_id="run_same_button")
                        run_skip_button = gr.Button(value=LANG["run_skip_button"], scale=4, elem_id="run_skip_button", visible=False)
                        run_cancel_button = gr.Button(value=LANG["run_cancel_button"], scale=4, elem_id="run_cancel_button", visible=False)
                with gr.Accordion(label=LANG["thumb_image"], open=True):
                    thumb_image = gr.HTML(custom_thumb_default, label=LANG["api_image"], elem_id="cg-thumb-wrapper", max_height=274, min_height=274, padding=False)                
                with gr.Row():
                    with gr.Accordion(label=LANG["api_hf"], open=False):
                        with gr.Column():
                            with gr.Row():
                                api_hf_enable = gr.Checkbox(label=LANG["api_hf_enable"],value=settings_json["api_hf_enable"])
                                api_webui_savepath_override = gr.Checkbox(label=LANG["api_webui_savepath_override"], value=settings_json["api_webui_savepath_override"])
                            with gr.Row():
                                api_hf_upscaler_selected = gr.Dropdown(
                                    choices=settings_json["api_hf_upscaler_list"],
                                    label=LANG["api_hf_upscaler_selected"],
                                    value=settings_json["api_hf_upscaler_selected"],
                                    allow_custom_value=False,
                                    scale=2
                                )
                                api_hf_colortransfer = gr.Dropdown(
                                    choices=["none", "Mean", "Lab"],
                                    label=LANG["api_hf_colortransfer"],
                                    value=settings_json["api_hf_colortransfer"],
                                    allow_custom_value=False,
                                    scale=1
                                )
                                api_hf_random_seed = gr.Checkbox(label=LANG["api_hf_random_seed"], value=settings_json["api_hf_random_seed"], scale=2)
                            with gr.Row():
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
                                api_refiner_enable = gr.Checkbox(label=LANG["api_refiner_enable"],value=settings_json["api_refiner_enable"], scale=1)
                                api_refiner_add_noise = gr.Checkbox(label=LANG["api_refiner_add_noise"],value=settings_json["api_refiner_add_noise"], scale=1)
                            with gr.Row():
                                api_refiner_model_list = gr.Dropdown(
                                        choices=refiner_model_files_list,
                                        label=LANG["api_refiner_model"],
                                        value=settings_json["api_refiner_model"],
                                        allow_custom_value=False,
                                        scale=2
                                    )  
                                api_refiner_ratio = gr.Slider(minimum=0.1,
                                    maximum=1.0,
                                    step=0.05,
                                    value=settings_json["api_refiner_ratio"],
                                    label=LANG["api_refiner_ratio"],
                                    scale=1
                                )                                
                with gr.Row():
                    with gr.Column():
                        # API prompts
                        custom_prompt = gr.Textbox(value=settings_json["custom_prompt"], label=LANG["custom_prompt"], elem_id="custom_prompt_text") 
                        api_prompt = gr.Textbox(value=settings_json["api_prompt"], label=LANG["api_prompt"], elem_id="positive_prompt_text")
                        api_neg_prompt = gr.Textbox(value=settings_json["api_neg_prompt"], label=LANG["api_neg_prompt"], elem_id="negative_prompt_text")                        
                        with gr.Accordion(label='LoRA', open=False):
                            with gr.Row():
                                lora_info = gr.Button(value='?', variant='secondary', min_width=24, scale=1)
                                lora_list = gr.Dropdown(choices=lora_file_list, label='', value='none', allow_custom_value=False, scale=18)
                                lora_insert = gr.Button(value='+', variant='primary', min_width=24, scale=1)                                                
                        with gr.Accordion(label=LANG["api_model_settings"], open=False):
                            with gr.Row():
                                api_model_sampler = gr.Dropdown(choices=SAMPLER, label=LANG["api_model_sampler"], value=settings_json["api_model_sampler"], allow_custom_value=False, scale=2)
                                api_model_scheduler = gr.Dropdown(choices=SCHEDULER, label=LANG["api_model_scheduler"], value=settings_json["api_model_scheduler"], allow_custom_value=False, scale=1)
                                api_model_file_select = gr.Dropdown(
                                    choices=model_files_list,
                                    label=LANG["api_model_file_select"],
                                    value=settings_json["api_model_file_select"],
                                    allow_custom_value=False,
                                    scale=4
                                )
                        # AI prompts
                        batch_generate_rule = gr.Radio(choices=["Last", "Once", "Every", "none"], 
                                                    value=settings_json["batch_generate_rule"],
                                                    label=LANG["batch_generate_rule"],
                                                    scale=1)
                        ai_prompt = gr.Textbox(value=settings_json["ai_prompt"], label=LANG["ai_prompt"], elem_id="ai_prompt_text")
                        prompt_ban = gr.Textbox(value=settings_json["prompt_ban"], label=LANG["prompt_ban"], elem_id="prompt_ban_text")                
                with gr.Row():
                    with gr.Accordion(label=LANG["system_settings"], open=False):
                        with gr.Column():                   
                            with gr.Row():
                                save_settings_button = gr.Button(value=LANG["save_settings_button"], variant='stop') 
                                load_settings_button = gr.UploadButton(label=LANG["load_settings_button"], file_count='single', file_types=['.json'])                         
                                            
                            # AI Prompt Generator                
                            ai_interface = gr.Dropdown(
                                choices=['none', 'Remote', 'Local'],
                                label=LANG["ai_interface"],
                                value=settings_json["ai_interface"],
                                allow_custom_value=False,
                            )
                            
                            remote_ai_base_url = gr.Textbox(value=settings_json["remote_ai_base_url"], label=LANG["remote_ai_base_url"])
                            remote_ai_model = gr.Textbox(value=settings_json["remote_ai_model"], label=LANG["remote_ai_model"])
                            remote_ai_timeout = gr.Slider(minimum=5,
                                maximum=300,
                                step=1,
                                value=settings_json["remote_ai_timeout"],
                                label=LANG["remote_ai_timeout"],
                            )   
                            
                            ai_local_addr = gr.Textbox(value=settings_json["ai_local_addr"], label=LANG["ai_local_addr"])   
                            ai_local_temp = gr.Slider(minimum=0.1,
                                maximum=2,
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
                            
                            # API Image Generator                
                            api_interface = gr.Dropdown(
                                choices=['none', 'ComfyUI', 'WebUI'],
                                label=LANG["api_interface"],
                                value=settings_json["api_interface"],
                                allow_custom_value=False,
                            )
                            api_preview_refresh_time = gr.Slider(
                                minimum=0,
                                maximum=5,
                                step=1,
                                value=settings_json["api_preview_refresh_time"],
                                label=LANG["api_preview_refresh_time"],
                            )
                            api_addr = gr.Textbox(value=settings_json["api_addr"], label=LANG["api_addr"])            
                            
                            manual_update_database_button = gr.Button(value=LANG["manual_update_database"], variant='primary')
                with gr.Row():
                    with gr.Accordion(LANG["ai_system_prompt_text"], open=False):
                        with gr.Row():
                            gr.Markdown(LANG["ai_system_prompt_warning"])                
                        with gr.Row():
                            ai_system_prompt_text = gr.Textbox(value=LANG["ai_system_prompt"], show_label=False, lines=24)
            with gr.Column(elem_classes='column_images'):
                with gr.Row():
                    custom_view_dropdown = gr.HTML(JS_CUSTOM_VIEW_DROPDOWN, padding=False)                    
                    view_angle = gr.Textbox(value=settings_json["view_angle"], visible=False, elem_id="cd-view-angle")
                    view_camera = gr.Textbox(value=settings_json["view_camera"], visible=False, elem_id="cd-view-camera")
                    view_background = gr.Textbox(value=settings_json["view_background"], visible=False, elem_id="cd-view-background")
                    view_style = gr.Textbox(value=settings_json["view_style"], visible=False, elem_id="cd-view-style")                       
                with gr.Row():
                    api_image = gr.HTML(custom_gallery_default, label=LANG["api_image"], elem_id="cg-gallery-wrapper", max_height=846, min_height=846, padding=False)
                    images_data = gr.JSON(visible=False, elem_id="images-data-json")                
                with gr.Row():                    
                    output_prompt = gr.Textbox(label=LANG["output_prompt"])
                with gr.Row():
                    output_info = gr.Textbox(label=LANG["output_info"])
                with gr.Accordion(label=LANG["image_info"], open=False):
                    with gr.Row():
                        image_info_to_generate = gr.Button(value=LANG["image_info_to_generate"], variant='primary')
                    with gr.Row():
                        image_info = gr.Image(label=None, elem_id="png-info", type="pil", sources="upload")
        
        run_button.click(fn=generate_lock, outputs=[run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button]).then(fn=create_characters,
                              inputs=[gr.Checkbox(value=False, visible=False), character1, character2, character3, tag_assist, original_character, random_seed, api_image_data, api_image_landscape],
                              outputs=[images_data]
                              ).then(
                                    fn=get_1,
                                    inputs=[images_data],
                                    js=JS_SHOWLOADING_WITHTHUMB
                                ).then(fn=create_prompt_ex, 
                                    inputs=[gr.Checkbox(value=False, visible=False), view_angle, view_camera, view_background, view_style, custom_prompt, keep_gallery,
                                                ai_interface, ai_prompt, batch_generate_rule, prompt_ban, remote_ai_base_url, remote_ai_model, remote_ai_timeout,
                                                ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                                                api_interface, api_preview_refresh_time, api_addr, api_prompt, api_neg_prompt, api_image_data, api_image_landscape,  
                                                api_model_sampler, api_model_scheduler, api_model_file_select,
                                                api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler_selected, api_hf_colortransfer, api_webui_savepath_override, api_hf_random_seed,
                                                api_refiner_enable, api_refiner_add_noise, api_refiner_model_list, api_refiner_ratio
                                            ], 
                                    outputs=[output_prompt, output_info, dummy_textbox2]
                                ).then(
                                    fn=generate_unlock,                                    
                                    inputs=[dummy_textbox2],
                                    outputs=[run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button],
                                    js=JS_HANDLERESPONSE
                                )

        run_random_button.click(fn=generate_lock, outputs=[run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button]).then(fn=create_characters,
                              inputs=[gr.Checkbox(value=True, visible=False), character1, character2, character3, tag_assist, original_character, random_seed, api_image_data, api_image_landscape],
                              outputs=[images_data]
                              ).then(
                                    fn=get_1,
                                    inputs=[images_data],
                                    js=JS_SHOWLOADING_WITHTHUMB
                                ).then(fn=create_prompt_ex, 
                                    inputs=[gr.Checkbox(value=True, visible=False), view_angle, view_camera, view_background, view_style, custom_prompt, keep_gallery,
                                                ai_interface, ai_prompt, batch_generate_rule, prompt_ban, remote_ai_base_url, remote_ai_model, remote_ai_timeout,
                                                ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                                                api_interface, api_preview_refresh_time, api_addr, api_prompt, api_neg_prompt, api_image_data, api_image_landscape,  
                                                api_model_sampler, api_model_scheduler, api_model_file_select,
                                                api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler_selected, api_hf_colortransfer, api_webui_savepath_override, api_hf_random_seed,
                                                api_refiner_enable, api_refiner_add_noise, api_refiner_model_list, api_refiner_ratio
                                            ], 
                                    outputs=[output_prompt, output_info, dummy_textbox2]
                                ).then(
                                    fn=generate_unlock,                                    
                                    inputs=[dummy_textbox2],
                                    outputs=[run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button],
                                    js=JS_HANDLERESPONSE
                                )
        
        run_same_button.click(fn=generate_lock, outputs=[run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button]).then(
                                fn=get_1,
                                inputs=[images_data],
                                js=JS_SHOWLOADING_WITHTHUMB
                                ).then(fn=create_with_last_prompt, 
                                inputs=[view_angle, view_camera, view_background, view_style, random_seed,  custom_prompt, keep_gallery,
                                        ai_interface, ai_prompt, batch_generate_rule, prompt_ban, remote_ai_base_url, remote_ai_model, remote_ai_timeout,
                                        ai_local_addr, ai_local_temp, ai_local_n_predict, ai_system_prompt_text,
                                        api_interface, api_preview_refresh_time, api_addr, api_prompt, api_neg_prompt, api_image_data, api_image_landscape,  
                                        api_model_sampler, api_model_scheduler, api_model_file_select,
                                        api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler_selected, api_hf_colortransfer, api_webui_savepath_override, api_hf_random_seed,
                                        api_refiner_enable, api_refiner_add_noise, api_refiner_model_list, api_refiner_ratio
                                        ], 
                                outputs=[output_prompt, output_info, dummy_textbox2]
                            ).then(
                                    fn=generate_unlock,                                    
                                    inputs=[dummy_textbox2],
                                    outputs=[run_button, run_random_button, run_same_button, run_skip_button, run_cancel_button],
                                    js=JS_HANDLERESPONSE
                                )
                            
        run_skip_button.click(fn=skip_next_generate_click).then(fn=lock_skip_cancel, outputs=[run_skip_button, run_cancel_button])
        run_cancel_button.click(fn=cancel_current_generate_click, inputs=[api_addr, api_interface]).then(fn=lock_skip_cancel, outputs=[run_skip_button, run_cancel_button])
        
        save_settings_button.click(fn=save_current_setting,
                                   inputs=[character1, character2, character3, tag_assist,
                                           view_angle, view_camera, view_background, view_style, api_model_sampler, api_model_scheduler, api_model_file_select, random_seed,
                                           custom_prompt, api_prompt, api_neg_prompt, api_image_data, api_image_landscape, keep_gallery,
                                           ai_prompt, batch_generate_rule, prompt_ban, ai_interface, 
                                           remote_ai_base_url, remote_ai_model, remote_ai_timeout,
                                           ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_preview_refresh_time, api_addr,
                                           api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler_selected, api_hf_colortransfer, api_webui_savepath_override, api_hf_random_seed,
                                           api_refiner_enable, api_refiner_add_noise, api_refiner_model_list, api_refiner_ratio
                                           ],
                                   outputs=[])
        
        load_settings_button.upload(fn=load_saved_setting,
                                   inputs=[load_settings_button],
                                   outputs=[character1, character2, character3, tag_assist,
                                           view_angle, view_camera, view_background, view_style, api_model_file_select, random_seed,
                                           custom_prompt, api_prompt, api_neg_prompt, api_image_data, api_image_landscape, keep_gallery,
                                           ai_prompt, batch_generate_rule, prompt_ban, ai_interface, 
                                           remote_ai_base_url, remote_ai_model, remote_ai_timeout,
                                           ai_local_addr, ai_local_temp, ai_local_n_predict, api_interface, api_preview_refresh_time, api_addr,
                                           api_hf_enable, api_hf_scale, api_hf_denoise, api_hf_upscaler_selected, api_hf_colortransfer, api_webui_savepath_override, api_hf_random_seed,
                                           api_refiner_enable, api_refiner_add_noise, api_refiner_model_list, api_refiner_ratio
                                            ]).then(
                                                fn=update_sampler_and_scheduler,
                                                outputs=[api_model_sampler, api_model_scheduler]
                                                ).then(
                                                    fn=refresh_character_thumb_image,
                                                    inputs=[character1,character2,character3],
                                                    outputs=[output_info, images_data]
                                                    ).then(fn=get_1,
                                                        inputs=[images_data],
                                                        js=JS_SHOWTHUMB
                                                        ).then(fn=get_7,
                                                            inputs=[character1,character2,character3,view_angle, view_camera, view_background, view_style],
                                                            js=JS_CUSTOM_DROPDOWN_UPDATE)
        
        manual_update_database_button.click(fn=manual_update_database, inputs=None).then(fn=manual_update_database, inputs=[manual_update_database_button], outputs=[manual_update_database_button])
                
        batch_generate_rule.change(fn=batch_generate_rule_change,inputs=batch_generate_rule)        
        
        lora_insert.click(fn=add_lora, inputs=[lora_list, api_prompt, api_interface], outputs=[api_prompt])
        lora_info.click(fn=get_lora_info, inputs=[lora_list], outputs=[dummy_text, dummy_textbox2]).then(fn=None,inputs=[dummy_text, dummy_textbox2], js=JS_SHOWCUSTOM_MESSAGE)
        
        # update lora list
        api_interface.change(
            fn=update_lora_list, inputs=[api_interface], outputs=[lora_list]
            ).then(
                fn=update_sampler_and_scheduler,
                outputs=[api_model_sampler, api_model_scheduler]
                )

        character.change(fn=refresh_character_thumb_image_overlay, inputs=[character], outputs=[images_data]).then(fn=get_2,inputs=[character, images_data],js=JS_SHOWTHUMB_OVERLAY)
        character1.change(fn=refresh_character_thumb_image,inputs=[character1,character2,character3],outputs=[output_info, images_data]).then(fn=get_1,inputs=[images_data],js=JS_SHOWTHUMB)
        character2.change(fn=refresh_character_thumb_image,inputs=[character1,character2,character3],outputs=[output_info, images_data]).then(fn=get_1,inputs=[images_data],js=JS_SHOWTHUMB)
        character3.change(fn=refresh_character_thumb_image,inputs=[character1,character2,character3],outputs=[output_info, images_data]).then(fn=get_1,inputs=[images_data],js=JS_SHOWTHUMB)
                       
        dummy_textbox1.change(fn=get_prompt_manager().update_suggestions_js, inputs=[dummy_textbox1], outputs=[dummy_dropdown])
        
        api_hf_enable_shadow.change(fn=sync_trigger, inputs=[api_hf_enable_shadow], outputs=[api_hf_enable])
        api_hf_enable.change(fn=sync_trigger, inputs=[api_hf_enable], outputs=[api_hf_enable_shadow])
        
        api_refiner_enable_shadow.change(fn=sync_trigger, inputs=[api_refiner_enable_shadow], outputs=[api_refiner_enable])
        api_refiner_enable.change(fn=sync_trigger, inputs=[api_refiner_enable], outputs=[api_refiner_enable_shadow])
                
        image_info.change(fn=read_image_metadata, inputs=[image_info], outputs=[output_info])
        image_info_to_generate.click(fn=read_image_metadata, inputs=[image_info], outputs=[output_info]
                                     ).then(fn=send_image_metadata, inputs=[output_info, api_image_data], outputs=[custom_prompt, api_neg_prompt, api_prompt, random_seed, api_image_data])
        
        ui.load(
            fn=get_13,
            inputs=[dummy_wait_base64, dummy_failed_base64, dummy_show_loading_text, dummy_keys, dummy_values, dummy_oc, dummy_textbox1, character1, character2, character3, dummy_view_data, dummy_textbox2, dummy_preview_image],
            js=JS_INIT
            ).then(
                fn=refresh_character_thumb_image,
                inputs=[character1,character2,character3],
                outputs=[output_info, images_data]
                ).then(fn=get_1,
                    inputs=[images_data],
                    js=JS_SHOWTHUMB).then(fn=warning_lora, inputs=[api_interface], outputs=[dummy_textbox1]).then(fn=None,inputs=[dummy_textbox1], js=JS_SHOWCUSTOM_ERRORMESSAGE)
            
    ui.launch(inbrowser=True)

if __name__ == '__main__':    
    #os.environ["GRADIO_SERVER_PORT"]='47861'   #test
    WSPORT = (int(os.environ.get("GRADIO_SERVER_PORT")) - 100)
    thread, stop_server = run_websocket_server_in_thread(host='127.0.0.1', port=WSPORT)
        
    def signal_handler(sig, frame):        
        print("*** Received shutdown signal")
        stop_server()
        sys.exit(0)            
    signal.signal(signal.SIGINT, signal_handler)
            
    run_gradio()
        
