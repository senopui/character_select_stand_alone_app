import base64
from io import BytesIO
import os

CAT = "Custom Gallery"

DEFAULT_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
LOADING_WAIT_BASE64 = DEFAULT_BASE64
LOADING_FAILED_BASE64 = DEFAULT_BASE64


def set_custom_gallery_last_api_images(images, ret):
    if 'success' == ret:
        print(f"[{CAT}] Get {len(images)} images from lib")
    
    return get_images_data(images, ret)

def get_image_base64(file_name):
    base_dir = os.path.dirname(__file__)
    img_path = os.path.join(base_dir, "imgs", file_name)
    print(f"[{CAT}]: Loading status image: {img_path}")
    if not os.path.exists(img_path):
        print(f"[{CAT}]: Image {img_path} not found, use DEFAULT_BASE64")
        return DEFAULT_BASE64
    try:
        with open(img_path, "rb") as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode("utf-8")
        base64_str = f"data:image/jpeg;base64,{img_base64}" 
        print(f"[{CAT}]: Image {img_path} loaded, Base64 length: {len(base64_str)}")
        return base64_str
    except Exception as e:
        print(f"[{CAT}]: Image {img_path} not found, use DEFAULT_BASE64, error: {e}")
        return DEFAULT_BASE64

def custom_gallery_default():
    return """
    <div id="cg-custom-gallery" class="cg-gallery-container">
        <div class="cg-loading"> </div>
    </div>
    """
    
def init_custom_gallery():
    global LOADING_WAIT_BASE64
    global LOADING_FAILED_BASE64
    
    LOADING_WAIT_BASE64 = get_image_base64("loading_wait.jpg")
    LOADING_FAILED_BASE64 = get_image_base64("loading_failed.jpg")
    
    return LOADING_WAIT_BASE64, LOADING_FAILED_BASE64

def get_loading_status_images(wait, failed):
    return {"loading_wait": wait},{"loading_failed": failed}

def get_images_data(images, ret):
    if not images:
        print(f"[{CAT}] Got error from backend: {ret}")
        return {"data": None, "error": f"{ret}"}
    
    image_urls = []
    js_error = ''
    for img in images:
        try:
            buffered = BytesIO()
            img.save(buffered, format="PNG")  
            img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8") 
            image_urls.append(f"data:image/png;base64,{img_base64}")  
        except Exception as e:
            print(f"[{CAT}] Error in processing image: {e}")
            js_error += f"[{CAT}] Error in processing image: {e}\n"
            continue
        
    if len(image_urls) > 0:
        return {"data": image_urls, "error": None}  
    else:
        return {"data": None, "error": js_error}  

def get_images_dummy():
    # just a dummy
    return
    