import base64
import gzip
from io import BytesIO
import os

CAT = "Custom Components"

DEFAULT_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
LOADING_WAIT_BASE64 = DEFAULT_BASE64
LOADING_FAILED_BASE64 = DEFAULT_BASE64

JS_SHOWLOADING_WITHTHUMB = """
function(images_data) {
    window.cgCustomGallery.showLoading();

    const newThumbImages = images_data.data;
    window.updateThumbGallery(newThumbImages);
}
"""

JS_SHOWLOADING = """
function(images_data) {
    window.cgCustomGallery.showLoading();
}
"""

JS_HANDLERESPONSE = "function(image_data, image_seeds, image_tags) { window.cgCustomGallery.handleResponse(image_data, image_seeds, image_tags); }"

JS_SHOWTHUMB = """
function(images_data) {
    const newThumbImages = images_data.data;
    window.updateThumbGallery(newThumbImages);
}
"""

JS_SHOWTHUMB_OVERLAY = """
function(character, images_data) {
    const newThumbImages = images_data.data;
    window.updateThumbOverlay(character, newThumbImages);
}
"""

JS_INIT = """
function(loading_wait, loading_failed, show_loading_text, keys, values, oc, chara_text, character1, character2, character3, view_data, view_text, ws_port) {
    sl_title = show_loading_text.split(',')[0];
    sl_te = show_loading_text.split(',')[1];
    sl_sec = show_loading_text.split(',')[2];
    
    window.LOADING_MESSAGE = sl_title;
    window.ELAPSED_TIME_PREFIX = sl_te;
    window.ELAPSED_TIME_SUFFIX = sl_sec;
    window.WS_PORT = parseInt(ws_port);
    
    if (window.LOADING_WAIT_BASE64 && window.LOADING_FAILED_BASE64) {
        console.log('Loading images already initialized.');
    } else {
        window.LOADING_WAIT_BASE64 = loading_wait;
        window.LOADING_FAILED_BASE64 = loading_failed;

        console.log('Loading images initialized:', {
            loading_wait: window.LOADING_WAIT_BASE64,
            loading_failed: window.LOADING_FAILED_BASE64
        });
    }
    
    if (typeof window.setMyCharacterOptions === 'function') {
        window.setMyCharacterOptions([keys, values], oc, chara_text, character1, character2, character3, 'none', true);
    } else {
        console.error('window.setMyCharacterOptions is not defined yet');
    }

    if (typeof window.setMyViewsOptions === 'function') {
        window.setMyViewsOptions(view_data, view_text, view_data.angle[1], view_data.camera[1], view_data.background[1], view_data.style[1], false);
    } else {
        console.error('window.setMyViewsOptions is not defined yet');
    }
}
"""

JS_SHOWCUSTOM_ERRORMESSAGE = """
function(errorMessage) {
    if (errorMessage !== "none") {
        window.customOverlay.createErrorOverlay(errorMessage);
    }
}
"""

JS_SHOWCUSTOM_MESSAGE = """
function(image, message) {
    window.customOverlay.createCustomOverlay(image, message);
}
"""

JS_CUSTOM_CHARACTERS_DROPDOWN = """
<div id="mydropdown-container"></div>
<script>
    document.addEventListener('mydropdown-container-change', (e) => {
        gradioApp().dispatch('mydropdown_change', e.detail.value);
    });
</script>
"""

JS_CUSTOM_VIEW_DROPDOWN = """
<div id="myviews-container"></div>
<script>
    document.addEventListener('myviews-container-change', (e) => {
        gradioApp().dispatch('myviews_change', e.detail.value);
    });
</script>    
"""

JS_CUSTOM_DROPDOWN_UPDATE = """
function(character1, character2, character3, view1, view2, view3, view4) {
    window.updateMyCharacterDefaults(character1, character2, character3, 'none');
    window.updateMyViewsDefaults(view1, view2, view3, view4);
}
"""

keep_images = []
keep_seed = []
keep_tags = []

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
        #print(f"[{CAT}]: Image {img_path} loaded, Base64 length: {len(base64_str)}")
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
    
def init_custom_com():
    global LOADING_WAIT_BASE64
    global LOADING_FAILED_BASE64
    
    LOADING_WAIT_BASE64 = get_image_base64("loading_wait.jpg")
    LOADING_FAILED_BASE64 = get_image_base64("loading_failed.jpg")
    
    return LOADING_WAIT_BASE64, LOADING_FAILED_BASE64

def get_13(wait, failed, show_loading_text, keys, values, oc, chara_text, character1, character2, character3, view_data, dummy_textbox2, ws_port):
    return

def get_7(character1, character2, character3, view1, view2, view3, view4):
    return

def get_2(character, images):
    return

def get_1(images = None):
    return

def set_custom_gallery_last_api_images(keep_gallery, images, seeds, tags, ret):
    global keep_images
    global keep_seed
    global keep_tags

    if not images:
        if 'success' != ret:
            print(f"[{CAT}] Got error from backend: {ret}")
            return {"data": None, "error": f"{ret}"}, '', ''
        if len(keep_images) > 0:
            return {"data": None, "error": ret}, keep_seed, keep_tags

        return {"data": None, "error": ret}, '', ''
    
    if not keep_gallery:
        keep_images = []
        keep_tags = ""
        keep_seed = ""
        
    queue = 0        
    js_error = ''
    for img in images:
        try:
            buffered = BytesIO()
            img.save(buffered, format="PNG")  
            img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8") 
            keep_images.insert(queue, f"data:image/png;base64,{img_base64}")  
            queue += 1
        except Exception as e:
            print(f"[{CAT}] Error in processing image: {e}")
            js_error += f"[{CAT}] Error in processing image: {e}\n"
            continue
        
    if len(keep_images) > 0:
        keep_seed = f'{",".join(seeds)},{keep_seed}'
        keep_tags = f'{"|".join(tags)}|{keep_tags}'
        return {"data": keep_images, "error": None}, keep_seed, keep_tags
    else:
        return {"data": None, "error": js_error}, '', ''


def decompress_image_data(base64_data):
    try:
        compressed_data = base64.b64decode(base64_data)
        webp_data = gzip.decompress(compressed_data)
        return webp_data
    except Exception as e:
        print(f"[{CAT}] Error decompressing image data: {e}")
        return None

def set_custom_gallery_thumb_images(images):
    #print(f"[{CAT}] Get {len(images)} thumb images from lib")
    
    image_urls = []
    for img in images:
        try:
            if img:
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
    
    return {"data": None, "error": "No valid thumb image(Not root cause)\nCheck logs for more detail"}

