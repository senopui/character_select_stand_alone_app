import os
import re
from typing import List, Dict
import gradio as gr

CAT = "Auto Tag Complete"

class PromptManager:
    def __init__(self, prompt_file_path: str, translate_file_path: str = None, use_translate = False):
        """
        Initialize the prompt manager with the path to the prompt file and an optional translate file.
        """
        self.prompts = []
        self.prompt_file_path = prompt_file_path
        self.translate_file_path = translate_file_path  
        self.use_translate = use_translate
        self.last_custom_prompt = ""
        self.previous_custom_prompt = ""
        self.data_loaded = False

        self.load_prompts(prompt_file_path, translate_file_path)

    def load_prompts(self, prompt_file_path: str, translate_file_path: str = None):
        """
        Load prompts from the main file and update with translate file if provided, then sort by heat in descending order.
        """
        if not os.path.exists(prompt_file_path):
            print(f"File {prompt_file_path} not found.")
            self.data_loaded = False
            return

        with open(prompt_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split(',', 3)
                if len(parts) >= 2:
                    prompt = parts[0].strip()
                    group = int(parts[1]) if parts[1].strip().isdigit() else 0
                    heat = int(parts[2]) if len(parts) > 2 and parts[2].strip().isdigit() else 0
                    aliases = parts[3].strip('"') if len(parts) > 3 else ""
                    
                    if heat == 0:
                        heat = group
                        group = 0
                    
                    self.prompts.append({
                        'prompt': prompt,
                        'group': group,
                        'heat': heat,
                        'aliases': aliases
                    })
        # Load zh_cn
        if self.use_translate:
            print(f"[{CAT}] Use translate file {translate_file_path}")
            if translate_file_path and os.path.exists(translate_file_path):
                prompt_dict = {p['prompt']: p for p in self.prompts}  
                with open(translate_file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        
                        parts = line.split(',', 2)  
                        if len(parts) < 3:
                            print(f"Skipping invalid line in {translate_file_path}: {line}")
                            continue
                        
                        prompt, group, new_aliases = parts[0].strip(), parts[1].strip(), parts[2].strip()
                        group = int(group) if group.isdigit() else 0
                        
                        if prompt in prompt_dict:
                            existing = prompt_dict[prompt]
                            if existing['aliases']:
                                existing_aliases = set(existing['aliases'].split(','))
                                new_aliases_set = set(new_aliases.split(','))
                                combined_aliases = ','.join(existing_aliases | new_aliases_set)
                                existing['aliases'] = combined_aliases
                            else:
                                existing['aliases'] = new_aliases
                        else:
                            self.prompts.append({
                                'prompt': prompt,
                                'group': group,
                                'heat': 1, 
                                'aliases': new_aliases
                            })
                            prompt_dict[prompt] = self.prompts[-1]  

        # sort
        self.prompts.sort(key=lambda x: x['heat'], reverse=True)
        self.data_loaded = True
        print(f"[{CAT}] Loaded {len(self.prompts)} prompts.")

    def reload_data(self):
        """
        Reset the state and reload the prompt data.
        """
        print(f"[{CAT}] Reloading prompts from {self.prompt_file_path} and {self.translate_file_path}...")
        self.prompts = []
        self.last_custom_prompt = ""
        self.previous_custom_prompt = ""
        self.load_prompts(self.prompt_file_path, self.translate_file_path)

    def get_suggestions(self, text: str) -> List[Dict]:
        """
        Create suggestions based on the input text.
        """
        if not text:
            return []
        
        parts = text.split(',')
        last_word = parts[-1].strip().lower()
        
        if not last_word:
            return []
        
        matches = {}
        for prompt_info in self.prompts:
            prompt = prompt_info['prompt'].lower()
            aliases = prompt_info['aliases'].lower().split(',') if prompt_info['aliases'] else []
            
            matched_alias = None  
            if '*' in last_word:
                # wildcards
                if last_word.startswith('*') and last_word.endswith('*'):
                    pattern = last_word[1:-1]
                    if pattern in prompt:
                        matched_alias = None  
                    else:
                        for alias in aliases:
                            if pattern in alias.strip():
                                matched_alias = alias.strip()
                                break
                elif last_word.startswith('*'):
                    pattern = last_word[1:]
                    if prompt.endswith(pattern):
                        matched_alias = None
                    else:
                        for alias in aliases:
                            if alias.strip().endswith(pattern):
                                matched_alias = alias.strip()
                                break
                elif last_word.endswith('*'):
                    pattern = last_word[:-1]
                    if prompt.startswith(pattern):
                        matched_alias = None
                    else:
                        for alias in aliases:
                            if alias.strip().startswith(pattern):
                                matched_alias = alias.strip()
                                break
            else:
                # normal
                if prompt.startswith(last_word):
                    matched_alias = None  
                else:
                    for alias in aliases:
                        if alias.strip().startswith(last_word):
                            matched_alias = alias.strip()
                            break
            
            if (matched_alias is not None) or (matched_alias is None and '*' in last_word and pattern in prompt) or (matched_alias is None and not '*' in last_word and prompt.startswith(last_word)):
                if prompt not in matches or prompt_info['heat'] > matches[prompt]['heat']:
                    if matched_alias is None:
                        alias_display = ', '.join([a.strip() for a in prompt_info['aliases'].split(',')]) if prompt_info['aliases'] else ''
                    else:
                        alias_display = matched_alias
                    matches[prompt] = {
                        'prompt': prompt_info['prompt'],
                        'heat': prompt_info['heat'],
                        'alias': alias_display if alias_display else None
                    }

            if len(matches) == 50:
                break
        
        sorted_matches = sorted(matches.values(), key=lambda x: x['heat'], reverse=True)
        return sorted_matches

    def update_suggestions_js(self, text):
        """
        Update suggestions based on the current input and update global variables.
        """
        items = []
        
        if not self.data_loaded:
            print(f"[{CAT}] No data loaded. Returning empty dataset.")
            return items
        
        matches = []        
        current_parts = text.replace('\n',',').split(',') if text else []
        previous_parts = self.previous_custom_prompt.split(',') if self.previous_custom_prompt else []
        
        modified_index = -1
        for i, (current, previous) in enumerate(zip(current_parts, previous_parts)):
            if current.strip() != previous.strip():
                modified_index = i
                break
        
        if modified_index == -1 and len(current_parts) > len(previous_parts):
            modified_index = len(current_parts) - 1
        
        target_word = None
        if 0 <= modified_index < len(current_parts):
            target_word = current_parts[modified_index].strip()
            matches = self.get_suggestions(target_word)
        
        if matches:
            for _, m in enumerate(matches):
                if m['alias']:
                    key = f"<b>{m['prompt']}</b>: ({m['alias']}) ({m['heat']})"
                else:
                    key = f"<b>{m['prompt']}</b> ({m['heat']})"
                items.append([key])
        
        self.previous_custom_prompt = self.last_custom_prompt
        self.last_custom_prompt = text
        
        return items