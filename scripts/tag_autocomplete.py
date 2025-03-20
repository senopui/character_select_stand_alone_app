import os
import re
from typing import List, Dict
import gradio as gr

CAT = "Auto Tag Complete"

class PromptManager:
    def __init__(self, prompt_file_path):
        """
        Initialize the prompt manager with the path to the prompt file.
        """
        self.prompts = []
        # file path
        self.prompt_file_path = prompt_file_path
        # save user input to keep track of changes
        self.last_custom_prompt = ""
        self.previous_custom_prompt = ""
        # flag for just applied suggestion
        self.just_applied_suggestion = False 
        # flag for data loaded
        self.data_loaded = False

        # load prompts
        self.load_prompts(prompt_file_path)

    def load_prompts(self, file_path: str):
        """
        Load prompts from a file, and sort them by heat in descending order.
        """
        if not os.path.exists(file_path):
            print(f"File {file_path} not found.")
            self.data_loaded = False 
            return
            
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                # split the line by comma, and get the prompt, group, heat, and aliases
                parts = line.split(',', 3)                 
                if len(parts) >= 2:
                    prompt = parts[0].strip()
                    group = int(parts[1]) if parts[1].strip().isdigit() else 0
                    heat = int(parts[2]) if len(parts) > 2 and parts[2].strip().isdigit() else 0
                    aliases = parts[3].strip('"') if len(parts) > 3 else ""
                    
                    # some tags didn't have a group, so we set the group to the heat
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
        self.data_loaded = True
        print(f"[{CAT}] Loaded {len(self.prompts)} prompts.")

    def reload_data(self):
        """
        Reset the state and reload the prompt data.
        """
        print(f"[{CAT}] Reloading prompts from {self.prompt_file_path}...")
        self.prompts = []
        self.last_custom_prompt = ""
        self.previous_custom_prompt = ""
        self.load_prompts(self.prompt_file_path)

    def get_suggestions(self, text: str) -> List[Dict]:
        """
        Create suggestions based on the input text.
        """
        if not text:
            return []
        
        # split the text by comma, and get the last word
        parts = text.split(',')
        last_word = parts[-1].strip().lower()
        
        if not last_word:
            return []
        
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

            # we only need 50 items
            if len(matches) == 50:
                break
        
        sorted_matches = sorted(matches.values(), key=lambda x: x['heat'], reverse=True)
        return sorted_matches

    def process_parts(self, parts):
        """
        Process each part of the prompt, handling ':' and '_'.
        """
        processed_parts = []
        for part in parts:
            # Remove extra spaces
            part = part.strip()
    
            # If the part starts with ':', keep it as is
            if part.startswith(':'):
                processed_parts.append(part)
                continue
    
            # If the part is enclosed in parentheses, process the content inside
            if part.startswith('(') and part.endswith(')'):
                # Remove parentheses and split the content by commas
                inner_content = part[1:-1]
                inner_parts = inner_content.split(',')
                # Recursively process the parts inside the parentheses
                processed_inner_parts = self.process_parts(inner_parts)
                # Rejoin the processed parts and re-enclose them in parentheses
                processed_parts.append(f"({', '.join(processed_inner_parts)})")
                continue
    
            # If the part contains ':', handle it based on the content after ':'
            if ':' in part:
                # Match the content before and after ':'
                match = re.match(r'^(.*?):([-+]?\d*\.?\d+)$', part)
                if match:
                    prefix, number = match.groups()
                    try:
                        # Try to convert the number to a float
                        number = float(number)
                        # If the number is an integer, convert it to an integer
                        if number.is_integer():
                            number = int(number)
                        # If the absolute value of the number is greater than 10, remove ':'
                        if abs(number) > 10:
                            processed_parts.append(f"{prefix} {number}")
                        else:
                            # If the absolute value is less than or equal to 10, keep ':'
                            processed_parts.append(part)
                    except ValueError:
                        # If conversion fails, replace ':' with a space
                        processed_parts.append(part.replace(':', ' '))
                else:
                    # If the content after ':' does not match the pattern, replace ':' with a space
                    processed_parts.append(part.replace(':', ' '))
            else:
                # If the part does not contain ':', add it directly
                processed_parts.append(part)
        print(f"Processed parts: {processed_parts}")
        return processed_parts

    def update_suggestions_js(self, text):
        """
        Update suggestions based on the current input and update global variables.
        """
        # If data is not loaded, return an empty dataset
        if not self.data_loaded:
            print(f"[{CAT}] No data loaded. Returning empty dataset.")
            return gr.Dataset(samples=[])
    
        # If apply_suggestion was just executed, return an empty dataset
        if self.just_applied_suggestion:
            # Reset the flag
            self.just_applied_suggestion = False
            return gr.Dataset(samples=[])
    
        matches = []
        items = []
    
        # Split the text by commas
        current_parts = text.split(',') if text else []
        previous_parts = self.previous_custom_prompt.split(',') if self.previous_custom_prompt else []
    
        # Locate the position of the word modified by the user
        modified_index = -1
        for i, (current, previous) in enumerate(zip(current_parts, previous_parts)):
            if current.strip() != previous.strip():
                modified_index = i
                break
    
        # If no modified word is found and the current input is longer than the previous input, set the modified index to the last index
        if modified_index == -1 and len(current_parts) > len(previous_parts):
            modified_index = len(current_parts) - 1
    
        # If a modified word is found, get suggestions
        target_word = None
        if 0 <= modified_index < len(current_parts):
            target_word = current_parts[modified_index].strip()
            matches = self.get_suggestions(target_word)
    
        # Create a list of suggestions
        if matches:
            for _, m in enumerate(matches):
                key = f"{m['prompt']} ({m['heat']})"
                items.append([key])
    
        # Update global variables to save the current input
        self.previous_custom_prompt = self.last_custom_prompt
        self.last_custom_prompt = text
    
        # Debugging
        """
        print(f"CURRENT_CUSTOM_PROMPT: {text}")
        print(f"PREVIOUS_CUSTOM_PROMPT: {self.previous_custom_prompt}")
        print(f"LAST_CUSTOM_PROMPT: {self.last_custom_prompt}")
        print(f"Modified index: {modified_index}")
        if target_word is not None:
            print(f"Suggestions for '{target_word}': {items}")
        """
        return items
    
    def apply_suggestion(self, evt: gr.SelectData, text, custom_prompt):
        """
        Apply the suggestion selected by the user to the prompt and clear the prompt box.
        """
        # If data is not loaded, return the original prompt and an empty dataset
        if not self.data_loaded:
            print(f"[{CAT}] No data loaded. Cannot apply suggestion.")
            return custom_prompt, gr.Dataset(samples=[])
    
        # Check the type of evt.value
        if isinstance(evt.value, list):
            suggestion = evt.value[0]
        elif isinstance(evt.value, str):
            suggestion = evt.value
        else:
            # Should not reach here
            raise ValueError(f"Unexpected value type: {type(evt.value)}. Expected a string or list.")
    
        # Get the suggestion content
        suggestion = suggestion.split(' ')[0]
        if not suggestion:
            return custom_prompt, gr.Dataset(samples=[])
    
        # Split custom_prompt by commas
        parts = custom_prompt.split(',') if custom_prompt else []
        previous_parts = self.previous_custom_prompt.split(',') if self.previous_custom_prompt else []
    
        # Locate the position of the word modified by the user
        modified_index = -1
        for i, (current, previous) in enumerate(zip(parts, previous_parts)):
            if current.strip() != previous.strip():
                modified_index = i
                break
    
        # If no modified word is found and the current input is longer than the previous input, set the modified index to the last index
        if modified_index == -1 and len(parts) > len(previous_parts):
            modified_index = len(parts) - 1
    
        # If the modified word is not found, set the modified index to the last index
        if modified_index < 0 or modified_index >= len(parts):
            modified_index = len(parts) - 1
    
        # Replace the modified word with the suggestion
        parts[modified_index] = suggestion
    
        # Update the global variables
        self.previous_custom_prompt = self.last_custom_prompt
        self.last_custom_prompt = ', '.join(self.process_parts(parts)).replace('_', ' ')
    
        # Set just_applied_suggestion to True
        self.just_applied_suggestion = True
    
        # Return the updated prompt and an empty dataset
        return self.last_custom_prompt, gr.Dataset(samples=[])
    