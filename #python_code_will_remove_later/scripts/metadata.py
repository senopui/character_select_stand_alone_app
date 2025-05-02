import json
from safetensors.torch import safe_open
from typing import Dict, Any

class SafetensorsMetadataReader:
    def __init__(self, file_path: str):
        self.file_path = file_path
        with open(file_path, "rb"):
            pass

    def read_metadata(self) -> Dict[str, Any]:
        try:
            with safe_open(self.file_path, framework="pt", device="cpu") as f:
                metadata = f.metadata() or {}
            return self._convert_to_json_compatible(metadata)
        except Exception as e:
            raise ValueError(f"Reading {self.file_path} metadata failed: {str(e)}")

    def _convert_to_json_compatible(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        json_compatible_metadata = {}
        for key, value in metadata.items():
            if isinstance(value, (str, int, float, bool, type(None))):
                json_compatible_metadata[key] = value
            elif isinstance(value, bytes):
                json_compatible_metadata[key] = value.decode("utf-8", errors="ignore")
            else:
                json_compatible_metadata[key] = str(value)
        return json_compatible_metadata

    def to_json(self, pretty_print: bool = False) -> str:
        metadata = self.read_metadata()
        if pretty_print:
            return json.dumps(metadata, indent=2, ensure_ascii=False)
        return json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))

    def to_compact_string(self) -> str:
        metadata = self.read_metadata()
        formatted_json = json.dumps(metadata, indent=2, ensure_ascii=False, sort_keys=True)
        lines = formatted_json.splitlines()
        compacted = "\n".join(line.rstrip() for line in lines if line.strip())
        return compacted
    
    def extract_and_format(self, key_map: Dict[str, str]) -> str:
        metadata = self.read_metadata()
        formatted_lines = []
        for key, display_name in key_map.items():
            if key in metadata:
                formatted_lines.append(f"{display_name}: {metadata[key]}")
        return "\n".join(formatted_lines)
    
    def extract_top_tags(self, dataset_key: str = None, top_n: int = 5) -> str:
        metadata = self.read_metadata()
        if "ss_tag_frequency" not in metadata:
            return ""

        try:
            tag_frequency = json.loads(metadata["ss_tag_frequency"])
        except json.JSONDecodeError:
            return ""

        if not tag_frequency:
            return ""
        
        selected_key = dataset_key or next(iter(tag_frequency), None)
        if not selected_key or selected_key not in tag_frequency:
            return ""

        tags = tag_frequency[selected_key]
        if not isinstance(tags, dict):
            return ""

        sorted_tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)        
        top_tags = sorted_tags[:top_n]
        
        return ", ".join(f"{tag}" for tag, freq in top_tags)

