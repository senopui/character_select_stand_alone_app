from PIL import Image
import re
from lib import settings_json

def read_image_metadata(image):
    if not isinstance(image, Image.Image):
        return ""

    try:
        if not (hasattr(image, 'info') and image.info):
            return ""

        metadata_str = ["Generation Parameters"]

        for key, value in image.info.items():
            if key.lower() == "parameters":
                if isinstance(value, str):
                    lines = value.split("\n")
                    prompt_section = []
                    negative_prompt_section = []
                    params = []
                    parsing_negative = False

                    for line in lines:
                        line = line.strip()
                        if line.startswith("Negative prompt:"):
                            parsing_negative = True
                            negative_prompt_section.append(line.replace("Negative prompt:", "").strip())
                        elif parsing_negative:
                            negative_prompt_section.append(line.strip())
                        elif line.startswith("Steps:"):
                            param_str = line
                            param_pairs = re.findall(r"(\w+[^:]*):\s*([^,]+)(?:,|$)", param_str)
                            for k, v in param_pairs:
                                params.append((k.strip(), v.strip()))
                        else:
                            prompt_section.append(line.strip())

                    if prompt_section:
                        metadata_str.append("Positive Prompt:")
                        prompt_text = "\n".join(line for line in prompt_section if line)
                        metadata_str.append(f"{prompt_text}")

                    if negative_prompt_section:
                        metadata_str.append("Negative Prompt:")
                        negative_prompt_text = "\n".join(line for line in negative_prompt_section if line)
                        metadata_str.append(f"{negative_prompt_text}")

                    for k, v in params:
                        metadata_str.append(f"{k}: {v}")
            else:
                continue

        return "\n".join(metadata_str).strip()

    except Exception:
        return ""
    
def send_image_metadata(metadata, image_data):
    if not isinstance(metadata, str) or "" == metadata:
        return "", settings_json["api_neg_prompt"], settings_json["api_prompt"], -1, image_data if isinstance(image_data, str) else "7.0,30,1024,1360,1"
        
    try:
        positive_prompt = ""
        negative_prompt = ""
        empty_string = ""
        seed = -1
        combined_params = ""

        lines = metadata.split("\n")
        current_section = None
        prompt_lines = []
        negative_prompt_lines = []
        params = {}

        for line in lines:
            line = line.strip()
            if line == "Generation Parameters":
                continue
            elif line == "Positive Prompt:":
                current_section = "positive"
                continue
            elif line == "Negative Prompt:":
                current_section = "negative"
                continue
            elif ": " in line and current_section in ["positive", "negative", None]:
                current_section = "params"
                param_pairs = line.split(", ")
                for pair in param_pairs:
                    if ": " in pair:
                        key, value = pair.split(": ", 1)
                        params[key.strip()] = value.strip()
            elif current_section == "positive":
                prompt_lines.append(line)
            elif current_section == "negative":
                negative_prompt_lines.append(line)

        positive_prompt = "\n".join(prompt_lines).strip()
        negative_prompt = "\n".join(negative_prompt_lines).strip()

        if "Seed" in params:
            try:
                seed = int(params["Seed"])
            except ValueError:
                seed = -1

        cfg_scale = params.get("CFG scale", "7.0")
        steps = params.get("Steps", "30")
        size = params.get("Size", "1024x1360")
        try:
            width, height = map(str, size.split("x"))
        except ValueError:
            width, height = "1024", "1360"

        last_value = "1"
        if image_data and isinstance(image_data, str):
            try:
                parts = image_data.split(",")
                if len(parts) >= 5:
                    last_value = parts[-1].strip()
            except Exception:
                last_value = "1"

        combined_params = f"{cfg_scale},{steps},{width},{height},{last_value}"
        return positive_prompt, negative_prompt, empty_string, seed, combined_params

    except Exception:
        return "", settings_json["api_neg_prompt"], settings_json["api_prompt"], -1, image_data if isinstance(image_data, str) else "7.0,30,1024,1360,1"