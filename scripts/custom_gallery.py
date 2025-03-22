import base64
import gzip
from PIL import Image
from io import BytesIO
import os

CAT = "Custom Gallery"

DEFAULT_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
LOADING_WAIT_BASE64 = DEFAULT_BASE64
LOADING_FAILED_BASE64 = DEFAULT_BASE64

JS_SHOWLOADING = """
function(images_data) {
    // Show loading overlay
    window.cgCustomGallery.showLoading();

    // Update the thumbnail gallery
    const newThumbImages = images_data.data;
    window.updateThumbGallery(newThumbImages);
}
"""
JS_HANDLERESPONSE = "function(data) { window.cgCustomGallery.handleResponse(data); }",

JS_SHOWTHUMB = """
function(images_data) {
    // Update the thumbnail gallery
    const newThumbImages = images_data.data;
    window.updateThumbGallery(newThumbImages);
}
"""

JS_GALLERY_INIT = """
function(loading_wait, loading_failed) {
    if (window.LOADING_WAIT_BASE64 && window.LOADING_FAILED_BASE64) {
        console.log('Loading images already initialized.');
        return;
    }

    window.LOADING_WAIT_BASE64 = loading_wait;
    window.LOADING_FAILED_BASE64 = loading_failed;

    console.log('Loading images initialized:', {
        loading_wait: window.LOADING_WAIT_BASE64,
        loading_failed: window.LOADING_FAILED_BASE64
    });
}
"""

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
def custom_thumb_default():
    return """
    <div id="cg-custom-thumb" class="cg-thumb-container">
        <div class="cg-thumb-loading"> </div>
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


def set_custom_gallery_last_api_images(images, ret):
    if 'success' == ret:
        print(f"[{CAT}] Get {len(images)} images from lib")
    
    return get_images_data(images, ret)

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


def decompress_image_data(base64_data):
    try:
        compressed_data = base64.b64decode(base64_data)
        webp_data = gzip.decompress(compressed_data)
        return webp_data
    except Exception as e:
        print(f"[{CAT}] Error decompressing image data: {e}")
        return None

def set_custom_gallery_thumb_images(images):
    print(f"[{CAT}] Get {len(images)} thumb images from lib")
    
    image_urls = []
    for img in images:
        try:
            webp_data = decompress_image_data(img)
            if webp_data is None:
                continue
            
            img_base64 = base64.b64encode(webp_data).decode("utf-8")
            image_urls.append(f"data:image/webp;base64,{img_base64}")
        except Exception as e:
            print(f"[{CAT}] Error processing thumb image: {e}")
            continue
        
    if len(image_urls) > 0:
        return {"data": image_urls, "error": None}  
    
    return {"data": None, "error": "No valid thumb image"}  

def get_images_dummy(images = None):
    # just a dummy
    return
    