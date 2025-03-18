import os
from typing import List, Dict

CAT = "Auto Tag Complete"

class PromptSuggester:
    def __init__(self, prompt_file_path):
        self.prompts = []
        self.load_prompts(prompt_file_path)
        
    def load_prompts(self, file_path: str):
        if not os.path.exists(file_path):
            print(f"File {file_path} not found.")
            return
            
        with open(file_path, 'r', encoding='utf-8') as f:
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
        
        self.prompts.sort(key=lambda x: x['heat'], reverse=True)
        print(f"[{CAT}] Loaded {len(self.prompts)} prompts.")
    
    def get_suggestions(self, text: str) -> List[Dict]:        
        if not text:
            return []
            
        parts = text.split(',')
        last_word = parts[-1].strip().lower()
        
        if not last_word:
            return []
        
        #print(f"Getting suggestions for: {last_word}")
            
        matches = {}
        for prompt_info in self.prompts:
            prompt = prompt_info['prompt'].lower()
            aliases = prompt_info['aliases'].lower().split(',') if prompt_info['aliases'] else []
            
            if '*' in last_word:
                # wildcards
                if last_word.startswith('*') and last_word.endswith('*'):
                    # middle
                    pattern = last_word[1:-1]
                    if pattern in prompt or any(pattern in alias.strip() for alias in aliases):
                        if prompt not in matches or prompt_info['heat'] > matches[prompt]['heat']:
                            matches[prompt] = {'prompt': prompt_info['prompt'], 'heat': prompt_info['heat']}
                elif last_word.startswith('*'):
                    # endswith
                    pattern = last_word[1:]
                    if prompt.endswith(pattern) or any(alias.strip().endswith(pattern) for alias in aliases):
                        if prompt not in matches or prompt_info['heat'] > matches[prompt]['heat']:
                            matches[prompt] = {'prompt': prompt_info['prompt'], 'heat': prompt_info['heat']}
                elif last_word.endswith('*'):
                    # startswith
                    pattern = last_word[:-1]
                    if prompt.startswith(pattern) or any(alias.strip().startswith(pattern) for alias in aliases):
                        if prompt not in matches or prompt_info['heat'] > matches[prompt]['heat']:
                            matches[prompt] = {'prompt': prompt_info['prompt'], 'heat': prompt_info['heat']}
            else:
                # normal
                if prompt.startswith(last_word) or any(alias.strip().startswith(last_word) for alias in aliases):
                    if prompt not in matches or prompt_info['heat'] > matches[prompt]['heat']:
                        matches[prompt] = {'prompt': prompt_info['prompt'], 'heat': prompt_info['heat']}

            # we only need 12 items
            if len(matches) == 12:
                break
        
        sorted_matches = sorted(matches.values(), key=lambda x: x['heat'], reverse=True)
        #print(f"Found {len(sorted_matches)} unique matches")
        return sorted_matches