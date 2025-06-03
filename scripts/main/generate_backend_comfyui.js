const { ipcMain } = require('electron')
const { BrowserWindow } = require('electron');
const { net } = require('electron');
const WebSocket = require('ws');

const CAT = '[ComfyUI]';
let backendComfyUI = null;

function sendToRendererEx(channel, data) {
    const window = BrowserWindow.getAllWindows();
    if (window[0]) {
        window[0].webContents.send(channel, data);
    } else {
        console.error(CAT, 'No focused window to send IPC message');
    }
}

function sendToRenderer(functionName, ...args) {
    sendToRendererEx('generate-backend', { functionName, args });
}

function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function processImage(imageData) {
    try {
        if (Buffer.isBuffer(imageData)) {
            return imageData.toString('base64');
        } 
        else if (ArrayBuffer.isView(imageData) || Array.isArray(imageData)) {
            const buffer = Buffer.from(imageData);
            return buffer.toString('base64');
        } else {
            console.error(CAT, 'Invalid image data type:', typeof imageData);
            return null;
        }
    } catch (error) {
        console.error(CAT, 'Error converting image data to Base64:', error);
        return null;
    }
}

class ComfyUI {
    constructor(clientID) {
        this.clientID = clientID;
        this.prompt_id = clientID;
        this.addr = '127.0.0.1:8188';
        this.webSocket = null;
        this.preview = 0;
        this.refresh = 0;
        this.timeout = 5000;
        this.urlPrefix = '';
        this.cancel = false;
        this.step = 0;
        this.firstValidPreview = false;
    }

    cancelGenerate() {
        const apiUrl = `http://${this.addr}/interrupt`;
    
            let request = net.request({
                method: 'POST',
                url: apiUrl,
                timeout: this.timeout
            });

            request.on('response', (response) => {
                response.on('end', () => {
                    if (response.statusCode !== 200) {
                        console.error(`${CAT} HTTP error: ${response.statusCode} - ${response.Data}`);
                        resolve(`Error: HTTP error: ${response.statusCode}`);
                    }
                    console.log('Processing interrupted');
                    this.cancel = true;
                })
            })

            request.on('error', (error) => {
                this.cancel = true;
            });

            request.end();
    }

    async openWS(prompt_id){
        return new Promise((resolve, reject) => {
            this.prompt_id = prompt_id;
            this.preview = 0;
            this.cancel = false;
            this.step = 0;
            this.firstValidPreview = false;

            const wsUrl = `ws://${this.addr}/ws?clientId=${this.clientID}`;
            this.webSocket = new WebSocket(wsUrl);            
            this.webSocket.on('message', async (data) => {
                try {
                    if(this.cancel){
                        resolve();
                    }
                    const message = JSON.parse(data.toString('utf8'));
                    if (message.type === 'executing' || message.type === 'status') {
                      const msgData = message.data;
                      if (msgData.node === null && msgData.prompt_id === this.prompt_id) {
                        try {
                            const image = await this.getImage();
                            if (image && Buffer.isBuffer(image)) {
                                const base64Image = processImage(image);
                                if (base64Image) {
                                    resolve(`data:image/png;base64,${base64Image}`);
                                } else {
                                    resolve('Error: Failed to convert image to base64');
                                }
                            } else {
                                resolve('Error: Image not found or invalid');
                            }
                        } catch (err) {
                            console.error(CAT, 'Error getting image:', err);
                            resolve(`Error: ${err.message}`);
                        }
                      } else if(msgData?.status.exec_info.queue_remaining === 0 && this.step === 0) {
                        console.log(CAT, 'Running same promot? message =', message);
                        resolve(null);
                      }
                    } else if(message.type === 'progress'){
                      this.step += 1;
                      const progress = message.data;
                      if(progress?.value && progress?.max){
                        sendToRenderer(`updateProgress`, progress.value, progress.max);
                      }                    
                    }
                } catch {
                    // preview
                    if (this.refresh !== 0) {
                        if (this.preview !== 0 && this.preview % this.refresh === 0) {
                            try {
                                const previewData = data.slice(8);  //skip websocket header
                                if(previewData.byteLength > 256){ // json parse failed 'executing' 110 ~ 120
                                  if(!this.firstValidPreview) { // skip 1st preview, might last image
                                    this.firstValidPreview = true;
                                  } else {
                                    const base64Data = processImage(previewData);
                                    if (base64Data) {
                                        sendToRenderer(`updatePreview`, `data:image/png;base64,${base64Data}`);
                                    }
                                  }
                                }
                            } catch (err) {
                                console.error(CAT, 'Error processing preview image:', err);
                            }
                        }
                        this.preview += 1;  
                    }                                        
                }
            });

            this.webSocket.on('error', (error) => {
                console.error(CAT, 'WebSocket error:', error.message);
                resolve(`Error:${error.message}`);
            });

        });
    }

    closeWS(){
        this.webSocket.close();
        this.webSocke = null;        
    }

    async getImage() {
        try {
            this.urlPrefix = `history/${this.prompt_id}`;
            const historyResponse = await this.getUrl();            
            if (typeof historyResponse === 'string' && historyResponse.startsWith('Error:')) {
                console.error(CAT, historyResponse);
                return null;
            }
            
            const jsonData = JSON.parse(historyResponse);
            if (!jsonData[this.prompt_id]?.outputs['29']?.images) {
                return null;
            }
            
            const imageInfo = jsonData[this.prompt_id].outputs['29'].images[0];            
            this.urlPrefix = `view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder}&type=${imageInfo.type}`;            
            const imageData = await this.getUrl();
            if (typeof imageData === 'string' && imageData.startsWith('Error:')) {
                console.error(CAT, imageData);
                return null;
            }
            
            return imageData;
        } catch (error) {
            console.error(CAT, 'Error in getImage:', error.message);
            return null;
        }
    }

    async getUrl() {
        return new Promise((resolve, reject) => {
            const apiUrl = `http://${this.addr}/${this.urlPrefix}`;
    
            let request = net.request({
                url: apiUrl,
                timeout: this.timeout
            });
    
            const chunks = [];
    
            request.on('response', (response) => {
                response.on('data', (chunk) => {
                    chunks.push(Buffer.from(chunk));
                });
                
                response.on('end', () => {
                    if (response.statusCode !== 200) {
                        console.error(`${CAT} HTTP error: ${response.statusCode}`);
                        resolve(`Error: HTTP error ${response.statusCode}`);
                        return;
                    }
                    
                    const buffer = Buffer.concat(chunks);
                    
                    if (this.urlPrefix.startsWith('history')) {
                        try {
                            resolve(buffer.toString('utf8'));
                        } catch (e) {
                            console.error(`${CAT} Failed to parse JSON:`, e);
                            resolve(`Error: Failed to parse response`);
                        }
                    } else {
                        resolve(buffer);
                    }
                });
            });
            
            request.on('error', (error) => {
                let ret = '';
                if (error.code === 'ECONNABORTED') {
                    console.error(`${CAT} Request timed out after ${this.timeout}ms`);
                    ret = `Error: Request timed out after ${this.timeout}ms`;
                } else {
                    console.error(CAT, 'Request failed:', error.message);
                    ret = `Error: Request failed:, ${error.message}`;
                }
                resolve(ret);
            });
    
            request.on('timeout', () => {
                request.destroy();
                console.error(`${CAT} Request timed out after ${this.timeout}ms`);
                resolve(`Error: Request timed out after ${this.timeout}ms`);
            });
    
            request.end();
        });
    }

    createWorkflow(generateData) {
        const {addr, model, vpred, positive, negative, width, height, cfg, step, seed, sampler, scheduler, refresh, hifix, refiner} = generateData;
        this.addr = addr;
        this.refresh = refresh;

        let workflow = JSON.parse(JSON.stringify(WORKFLOW));
        let refiner_start_step = 1000;

        if (model !== 'Default') {
            // Set model name
            workflow["45"].inputs.ckpt_name = model;            
            workflow["43"].inputs.ckpt_name = model;

            // Set model name to Image Save
            workflow["29"].inputs.modelname = model;
        }

        // vPred
        if((vpred === 0 && model.includes('vPred')) || vpred === 1) {
            workflow["35"].inputs.sampling = "v_prediction";
        }

        if (refiner.enable && model !== refiner.model) {
            // Set refiner model name
            workflow["43"].inputs.ckpt_name = refiner.model;
            if((refiner.vpred === 0 && refiner.model.includes('vPred')) || refiner.vpred === 1) {
                workflow["44"].inputs.sampling = "v_prediction";
            }
            refiner_start_step = Math.floor(step * refiner.ratio);
            //Set refiner seed and steps
            workflow["37"].inputs.noise_seed = seed;
            workflow["37"].inputs.start_at_step = refiner_start_step;
            
            if (refiner.addnoise) {
                // Set refiner add noise
                workflow["37"].inputs.add_noise = "enable";
            }
        } else {
            // Reconnect nodes
            // Ksampler and Model Loader to Vae Decode
            workflow["6"].inputs.samples = ["36", 0];
            workflow["6"].inputs.vae = ["45", 2];
            // Model Loader to Hires fix Vae Decode Tiled 
            workflow["18"].inputs.vae = ["45", 2];
            // Model Loader to Hires fix Vae Encode Tiled
            workflow["19"].inputs.vae = ["45", 2];
        }

        // Set Sampler and Scheduler
        workflow["20"].inputs.sampler_name = sampler;
        workflow["29"].inputs.sampler_name = sampler;
        workflow["36"].inputs.sampler_name = sampler;
        workflow["37"].inputs.sampler_name = sampler;
        
        workflow["20"].inputs.scheduler = scheduler;
        workflow["29"].inputs.scheduler = scheduler;
        workflow["36"].inputs.scheduler = scheduler;
        workflow["37"].inputs.scheduler = scheduler;

        // Set steps and cfg
        workflow["13"].inputs.steps = step;
        workflow["13"].inputs.cfg = cfg;
                    
        // Set Image Saver seed
        workflow["29"].inputs.seed_value = seed;        
        // Set Ksampler seed and steps
        workflow["36"].inputs.noise_seed = seed;
        workflow["36"].inputs.end_at_step = refiner_start_step;       
        
        // Set Positive prompt
        workflow["32"].inputs.text = positive;        
        // Set Negative prompt
        workflow["33"].inputs.text = negative;
        
        // Set width and height
        workflow["17"].inputs.Width = width;
        workflow["17"].inputs.Height = height;

        if (!hifix.enable) {
            // Image Save set to 1st VAE Decode
            workflow["29"].inputs.images = ["6", 0];
        }else {
            // Set Hires fix parameters
            workflow["17"].inputs.HiResMultiplier = hifix.scale;
            // Set Hires fix seed and denoise
            workflow["20"].inputs.seed = hifix.seed;
            workflow["20"].inputs.denoise = hifix.denoise;
            workflow["20"].inputs.steps = hifix.steps;
            // Set Hires fix model name
            workflow["27"].inputs.model_name = `${hifix.model}.pth`;

            if(hifix.colorTransfer === 'None'){
                // Image Save set to 2nd VAE Decode (Tiled)
                workflow["29"].inputs.images = ["18", 0];
            } else {
                // Default to Image Color Transfer
                workflow["28"].inputs.method = hifix.colorTransfer;
            }            
        }

        return workflow;
    }

    createWorkflowRegional(generateData) {      
      const {addr, model, vpred, positive_left, positive_right, negative, width, height, cfg, step, seed, sampler, scheduler, refresh, hifix, refiner, regional} = generateData;
      this.addr = addr;
      this.refresh = refresh;      
      
      let workflow = JSON.parse(JSON.stringify(WORKFLOW_REGIONAL));
      let refiner_start_step = 1000;

      if (model !== 'Default') {
          // Set model name
          workflow["45"].inputs.ckpt_name = model;            
          workflow["43"].inputs.ckpt_name = model;

          // Set model name to Image Save
          workflow["29"].inputs.modelname = model;
      }

      // vPred
      if((vpred === 0 && model.includes('vPred')) || vpred === 1) {
          workflow["35"].inputs.sampling = "v_prediction";
      }

      if (refiner.enable && model !== refiner.model) {
          // Set refiner model name
          workflow["43"].inputs.ckpt_name = refiner.model;
          if((refiner.vpred === 0 && refiner.model.includes('vPred')) || refiner.vpred === 1) {
              workflow["44"].inputs.sampling = "v_prediction";
          }
          refiner_start_step = Math.floor(step * refiner.ratio);
          //Set refiner seed and steps
          workflow["37"].inputs.noise_seed = seed;
          workflow["37"].inputs.start_at_step = refiner_start_step;
          
          if (refiner.addnoise) {
              // Set refiner add noise
              workflow["37"].inputs.add_noise = "enable";
          }
      } else {
          // Reconnect nodes
          // Ksampler and Model Loader to Vae Decode
          workflow["6"].inputs.samples = ["36", 0];
          workflow["6"].inputs.vae = ["45", 2];
          // Model Loader to Hires fix Vae Decode Tiled 
          workflow["18"].inputs.vae = ["45", 2];
          // Model Loader to Hires fix Vae Encode Tiled
          workflow["19"].inputs.vae = ["45", 2];
      }

      // Set Sampler and Scheduler
      workflow["20"].inputs.sampler_name = sampler;
      workflow["29"].inputs.sampler_name = sampler;
      workflow["36"].inputs.sampler_name = sampler;
      workflow["37"].inputs.sampler_name = sampler;
      
      workflow["20"].inputs.scheduler = scheduler;
      workflow["29"].inputs.scheduler = scheduler;
      workflow["36"].inputs.scheduler = scheduler;
      workflow["37"].inputs.scheduler = scheduler;

      // Set steps and cfg
      workflow["13"].inputs.steps = step;
      workflow["13"].inputs.cfg = cfg;
                  
      // Set Image Saver seed
      workflow["29"].inputs.seed_value = seed;        
      // Set Ksampler seed and steps
      workflow["36"].inputs.noise_seed = seed;
      workflow["36"].inputs.end_at_step = refiner_start_step;       
      
      // Set Positive prompt
      workflow["32"].inputs.text = positive_left;
      workflow["46"].inputs.text = positive_right;
      // Combine prompt
      workflow["29"].inputs.positive = `${positive_left}\n${positive_right}`;
      
      // Set Negative prompt
      workflow["33"].inputs.text = negative;
      
      // Set width and height
      workflow["17"].inputs.Width = width;
      workflow["17"].inputs.Height = height;

      // Regional Condition Mask
      // Set Mask Ratio
      workflow["47"].inputs.Layout = regional.ratio;
      // Set Left Mask Strength and Area
      workflow["50"].inputs.strength = regional.str_left;
      workflow["50"].inputs.set_cond_area = regional.option_left;
      workflow["55"].inputs.strength = regional.str_left;
      workflow["55"].inputs.set_cond_area = regional.option_left;
      // Set Right Mask Strength and Area
      workflow["52"].inputs.strength = regional.str_right;
      workflow["52"].inputs.set_cond_area = regional.option_right;
      workflow["56"].inputs.strength = regional.str_right;
      workflow["56"].inputs.set_cond_area = regional.option_right;

      if (!hifix.enable) {
          // Image Save set to 1st VAE Decode
          workflow["29"].inputs.images = ["6", 0];
      }else {
          // Set Hires fix parameters
          workflow["17"].inputs.HiResMultiplier = hifix.scale;
          // Set Hires fix seed and denoise
          workflow["20"].inputs.seed = hifix.seed;
          workflow["20"].inputs.denoise = hifix.denoise;
          workflow["20"].inputs.steps = hifix.steps;
          // Set Hires fix model name
          workflow["27"].inputs.model_name = `${hifix.model}.pth`;

          if(hifix.colorTransfer === 'None'){
              // Image Save set to 2nd VAE Decode (Tiled)
              workflow["29"].inputs.images = ["18", 0];
          } else {
              // Default to Image Color Transfer
              workflow["28"].inputs.method = hifix.colorTransfer;
          }            
      }
      
      return workflow;
    }

    run(workflow) {
        return new Promise((resolve, reject) => {
            const requestBody = {
                prompt: workflow,
                client_id: this.clientID
            };
            const body = JSON.stringify(requestBody);
            const apiUrl = `http://${this.addr}/prompt`;

            let request = net.request({
                method: 'POST',
                url: apiUrl,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout,
            });

            request.on('response', (response) => {
                let responseData = ''            
                response.on('data', (chunk) => {
                    responseData += chunk
                })
                response.on('end', () => {
                    if (response.statusCode !== 200) {
                        console.error(`${CAT} HTTP error: ${response.statusCode} - ${responseData}`);
                        resolve(`Error HTTP ${response.statusCode} - ${responseData}`);
                    }
                    
                    resolve(responseData);
                })
            });
            
            request.on('error', (error) => {
                let ret = '';
                if (error.code === 'ECONNABORTED') {
                    console.error(`${CAT} Request timed out after ${timeout}ms`);
                    ret = `Error: Request timed out after ${timeout}ms`;
                } else {
                    console.error(CAT, 'Request failed:', error.message);
                    ret = `Error: Request failed:, ${error.message}`;
                }
                resolve(ret);
            });

            request.on('timeout', () => {
                req.destroy();
                console.error(`${CAT} Request timed out after ${timeout}ms`);
                resolve(`Error: Request timed out after ${timeout}ms`);
            });

            request.write(body);
            request.end();   
        });
    }   

}

async function setupGenerateBackendComfyUI() {
    backendComfyUI = new ComfyUI(generateGUID());

    ipcMain.handle('generate-backend-comfyui-run', async (event, generateData) => {
        const workflow = backendComfyUI.createWorkflow(generateData)
        const result = await backendComfyUI.run(workflow);        
        return result;
    });

    ipcMain.handle('generate-backend-comfyui-run-regional', async (event, generateData) => {
        const workflow = backendComfyUI.createWorkflowRegional(generateData)
        const result = await backendComfyUI.run(workflow);        
        return result;
    });

    ipcMain.handle('generate-backend-comfyui-open-ws', async (event, prompt_id) => {
        return await backendComfyUI.openWS(prompt_id);
    });

    ipcMain.handle('generate-backend-comfyui-close-ws', async (event) => {
        backendComfyUI.closeWS();
    });

    ipcMain.handle('generate-backend-comfyui-cancel', async (event) => {
        backendComfyUI.cancelGenerate();
    });
}

module.exports = {
  sendToRenderer,
  setupGenerateBackendComfyUI
};

// Do NOT Modify it here
// Modify it in ComfyUI with your generate result
const WORKFLOW = {
  "2": {
    "inputs": {
      "text": [
        "34",
        4
      ],
      "clip": [
        "34",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "3": {
    "inputs": {
      "text": [
        "33",
        0
      ],
      "clip": [
        "34",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "5": {
    "inputs": {
      "width": [
        "17",
        0
      ],
      "height": [
        "17",
        1
      ],
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  "6": {
    "inputs": {
      "samples": [
        "37",
        0
      ],
      "vae": [
        "43",
        2
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "13": {
    "inputs": {
      "steps": 30,
      "cfg": 7
    },
    "class_type": "StepsAndCfg",
    "_meta": {
      "title": "Steps & Cfg"
    }
  },
  "17": {
    "inputs": {
      "Width": 1024,
      "Height": 1360,
      "Batch": 1,
      "Landscape": false,
      "HiResMultiplier": 1.5
    },
    "class_type": "CanvasCreatorAdvanced",
    "_meta": {
      "title": "Create Canvas Advanced"
    }
  },
  "18": {
    "inputs": {
      "tile_size": 512,
      "overlap": 64,
      "temporal_size": 64,
      "temporal_overlap": 8,
      "samples": [
        "20",
        0
      ],
      "vae": [
        "43",
        2
      ]
    },
    "class_type": "VAEDecodeTiled",
    "_meta": {
      "title": "VAE Decode (Tiled)"
    }
  },
  "19": {
    "inputs": {
      "tile_size": 512,
      "overlap": 64,
      "temporal_size": 64,
      "temporal_overlap": 8,
      "pixels": [
        "25",
        0
      ],
      "vae": [
        "43",
        2
      ]
    },
    "class_type": "VAEEncodeTiled",
    "_meta": {
      "title": "VAE Encode (Tiled)"
    }
  },
  "20": {
    "inputs": {
      "seed": 3025955348,
      "steps": 20,
      "cfg": [
        "13",
        1
      ],
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "denoise": 0.4,
      "model": [
        "39",
        2
      ],
      "positive": [
        "41",
        0
      ],
      "negative": [
        "40",
        0
      ],
      "latent_image": [
        "19",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "25": {
    "inputs": {
      "resize_scale": [
        "17",
        5
      ],
      "resize_method": "nearest",
      "upscale_model": [
        "27",
        0
      ],
      "image": [
        "6",
        0
      ]
    },
    "class_type": "UpscaleImageByModelThenResize",
    "_meta": {
      "title": "Upscale Image By Model Then Resize"
    }
  },
  "27": {
    "inputs": {
      "model_name": "RealESRGAN_x4.pth"
    },
    "class_type": "UpscaleModelLoader",
    "_meta": {
      "title": "Load Upscale Model"
    }
  },
  "28": {
    "inputs": {
      "method": "Mean",
      "src_image": [
        "18",
        0
      ],
      "ref_image": [
        "6",
        0
      ]
    },
    "class_type": "ImageColorTransferMira",
    "_meta": {
      "title": "Color Transfer"
    }
  },
  "29": {
    "inputs": {
      "filename": "%time_%seed",
      "path": "%date",
      "extension": "png",
      "steps": [
        "13",
        0
      ],
      "cfg": [
        "13",
        1
      ],
      "modelname": "waiNSFWIllustrious_v120.safetensors",
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "positive": [
        "32",
        0
      ],
      "negative": [
        "33",
        0
      ],
      "seed_value": 3025955348,
      "width": [
        "17",
        0
      ],
      "height": [
        "17",
        1
      ],
      "lossless_webp": true,
      "quality_jpeg_or_webp": 100,
      "optimize_png": false,
      "counter": 0,
      "denoise": 1,
      "clip_skip": -2,
      "time_format": "%Y-%m-%d-%H%M%S",
      "save_workflow_as_json": false,
      "embed_workflow": true,
      "additional_hashes": "",
      "images": [
        "28",
        0
      ]
    },
    "class_type": "ImageSaverMira",
    "_meta": {
      "title": "Image Saver"
    }
  },
  "32": {
    "inputs": {
      "text": "solo, masterpiece, best quality, amazing quality"
    },
    "class_type": "TextBoxMira",
    "_meta": {
      "title": "Text Box"
    }
  },
  "33": {
    "inputs": {
      "text": "bad quality,worst quality,worst detail,sketch"
    },
    "class_type": "TextBoxMira",
    "_meta": {
      "title": "Text Box"
    }
  },
  "34": {
    "inputs": {
      "text": [
        "32",
        0
      ],
      "model": [
        "35",
        0
      ],
      "clip": [
        "45",
        1
      ]
    },
    "class_type": "LoRAfromText",
    "_meta": {
      "title": "LoRA Loader from Text"
    }
  },
  "35": {
    "inputs": {
      "sampling": "eps",
      "zsnr": false,
      "model": [
        "45",
        0
      ]
    },
    "class_type": "ModelSamplingDiscrete",
    "_meta": {
      "title": "ModelSamplingDiscrete"
    }
  },
  "36": {
    "inputs": {
      "add_noise": "enable",
      "noise_seed": 3025955348,
      "steps": [
        "13",
        0
      ],
      "cfg": [
        "13",
        1
      ],
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "start_at_step": 0,
      "end_at_step": 1000,
      "return_with_leftover_noise": "disable",
      "model": [
        "34",
        0
      ],
      "positive": [
        "2",
        0
      ],
      "negative": [
        "3",
        0
      ],
      "latent_image": [
        "5",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "37": {
    "inputs": {
      "add_noise": "disable",
      "noise_seed": 3025955348,
      "steps": [
        "13",
        0
      ],
      "cfg": [
        "13",
        1
      ],
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "start_at_step": 12,
      "end_at_step": 10000,
      "return_with_leftover_noise": "disable",
      "model": [
        "39",
        0
      ],
      "positive": [
        "41",
        0
      ],
      "negative": [
        "40",
        0
      ],
      "latent_image": [
        "36",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "39": {
    "inputs": {
      "text": [
        "32",
        0
      ],
      "model": [
        "44",
        0
      ],
      "clip": [
        "43",
        1
      ]
    },
    "class_type": "LoRAfromText",
    "_meta": {
      "title": "LoRA Loader from Text"
    }
  },
  "40": {
    "inputs": {
      "text": [
        "33",
        0
      ],
      "clip": [
        "39",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "41": {
    "inputs": {
      "text": [
        "39",
        4
      ],
      "clip": [
        "39",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "43": {
    "inputs": {
      "ckpt_name": "waiNSFWIllustrious_v120.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "44": {
    "inputs": {
      "sampling": "eps",
      "zsnr": false,
      "model": [
        "43",
        0
      ]
    },
    "class_type": "ModelSamplingDiscrete",
    "_meta": {
      "title": "ModelSamplingDiscrete"
    }
  },
  "45": {
    "inputs": {
      "ckpt_name": "waiNSFWIllustrious_v120.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  }
};

const WORKFLOW_REGIONAL = {
  "2": {
    "inputs": {
      "text": [
        "34",
        4
      ],
      "clip": [
        "34",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "3": {
    "inputs": {
      "text": [
        "33",
        0
      ],
      "clip": [
        "34",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "5": {
    "inputs": {
      "width": [
        "17",
        0
      ],
      "height": [
        "17",
        1
      ],
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  "6": {
    "inputs": {
      "samples": [
        "37",
        0
      ],
      "vae": [
        "43",
        2
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "13": {
    "inputs": {
      "steps": 30,
      "cfg": 7.000000000000002
    },
    "class_type": "StepsAndCfg",
    "_meta": {
      "title": "Steps & Cfg"
    }
  },
  "17": {
    "inputs": {
      "Width": 1024,
      "Height": 1360,
      "Batch": 1,
      "Landscape": false,
      "HiResMultiplier": 1.5
    },
    "class_type": "CanvasCreatorAdvanced",
    "_meta": {
      "title": "Create Canvas Advanced"
    }
  },
  "18": {
    "inputs": {
      "tile_size": 512,
      "overlap": 64,
      "temporal_size": 64,
      "temporal_overlap": 8,
      "samples": [
        "20",
        0
      ],
      "vae": [
        "43",
        2
      ]
    },
    "class_type": "VAEDecodeTiled",
    "_meta": {
      "title": "VAE Decode (Tiled)"
    }
  },
  "19": {
    "inputs": {
      "tile_size": 512,
      "overlap": 64,
      "temporal_size": 64,
      "temporal_overlap": 8,
      "pixels": [
        "25",
        0
      ],
      "vae": [
        "43",
        2
      ]
    },
    "class_type": "VAEEncodeTiled",
    "_meta": {
      "title": "VAE Encode (Tiled)"
    }
  },
  "20": {
    "inputs": {
      "seed": 715010500915488,
      "steps": 20,
      "cfg": [
        "13",
        1
      ],
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "denoise": 0.4000000000000001,
      "model": [
        "39",
        2
      ],
      "positive": [
        "57",
        0
      ],
      "negative": [
        "40",
        0
      ],
      "latent_image": [
        "19",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "25": {
    "inputs": {
      "resize_scale": [
        "17",
        5
      ],
      "resize_method": "nearest",
      "upscale_model": [
        "27",
        0
      ],
      "image": [
        "6",
        0
      ]
    },
    "class_type": "UpscaleImageByModelThenResize",
    "_meta": {
      "title": "Upscale Image By Model Then Resize"
    }
  },
  "27": {
    "inputs": {
      "model_name": "4x-UltraSharp.pth"
    },
    "class_type": "UpscaleModelLoader",
    "_meta": {
      "title": "Load Upscale Model"
    }
  },
  "28": {
    "inputs": {
      "method": "Mean",
      "src_image": [
        "18",
        0
      ],
      "ref_image": [
        "6",
        0
      ]
    },
    "class_type": "ImageColorTransferMira",
    "_meta": {
      "title": "Color Transfer"
    }
  },
  "29": {
    "inputs": {
      "filename": "%time_%seed",
      "path": "%date",
      "extension": "png",
      "steps": [
        "13",
        0
      ],
      "cfg": [
        "13",
        1
      ],
      "modelname": "waiNSFWIllustrious_v130.safetensors",
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "positive": [
        "32",
        0
      ],
      "negative": [
        "33",
        0
      ],
      "seed_value": 1775747588,
      "width": [
        "17",
        0
      ],
      "height": [
        "17",
        1
      ],
      "lossless_webp": true,
      "quality_jpeg_or_webp": 100,
      "optimize_png": false,
      "counter": 0,
      "denoise": 1,
      "clip_skip": -2,
      "time_format": "%Y-%m-%d-%H%M%S",
      "save_workflow_as_json": false,
      "embed_workflow": true,
      "additional_hashes": "",
      "images": [
        "28",
        0
      ]
    },
    "class_type": "ImageSaverMira",
    "_meta": {
      "title": "Image Saver"
    }
  },
  "32": {
    "inputs": {
      "text": "2girls"
    },
    "class_type": "TextBoxMira",
    "_meta": {
      "title": "Text Box"
    }
  },
  "33": {
    "inputs": {
      "text": "bad quality, worst quality, worst detail, sketch"
    },
    "class_type": "TextBoxMira",
    "_meta": {
      "title": "Text Box"
    }
  },
  "34": {
    "inputs": {
      "text": [
        "32",
        0
      ],
      "model": [
        "35",
        0
      ],
      "clip": [
        "45",
        1
      ]
    },
    "class_type": "LoRAfromText",
    "_meta": {
      "title": "LoRA Loader from Text"
    }
  },
  "35": {
    "inputs": {
      "sampling": "eps",
      "zsnr": false,
      "model": [
        "45",
        0
      ]
    },
    "class_type": "ModelSamplingDiscrete",
    "_meta": {
      "title": "ModelSamplingDiscrete"
    }
  },
  "36": {
    "inputs": {
      "add_noise": "enable",
      "noise_seed": 1094643513798864,
      "steps": [
        "13",
        0
      ],
      "cfg": [
        "13",
        1
      ],
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "start_at_step": 0,
      "end_at_step": 1000,
      "return_with_leftover_noise": "disable",
      "model": [
        "34",
        0
      ],
      "positive": [
        "53",
        0
      ],
      "negative": [
        "3",
        0
      ],
      "latent_image": [
        "5",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "37": {
    "inputs": {
      "add_noise": "disable",
      "noise_seed": 790295579866824,
      "steps": [
        "13",
        0
      ],
      "cfg": [
        "13",
        1
      ],
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "start_at_step": 12,
      "end_at_step": 10000,
      "return_with_leftover_noise": "disable",
      "model": [
        "39",
        0
      ],
      "positive": [
        "57",
        0
      ],
      "negative": [
        "40",
        0
      ],
      "latent_image": [
        "36",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "39": {
    "inputs": {
      "text": [
        "32",
        0
      ],
      "model": [
        "44",
        0
      ],
      "clip": [
        "43",
        1
      ]
    },
    "class_type": "LoRAfromText",
    "_meta": {
      "title": "LoRA Loader from Text"
    }
  },
  "40": {
    "inputs": {
      "text": [
        "33",
        0
      ],
      "clip": [
        "39",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "41": {
    "inputs": {
      "text": [
        "39",
        4
      ],
      "clip": [
        "39",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "43": {
    "inputs": {
      "ckpt_name": "waiNSFWIllustrious_v120.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "44": {
    "inputs": {
      "sampling": "eps",
      "zsnr": false,
      "model": [
        "43",
        0
      ]
    },
    "class_type": "ModelSamplingDiscrete",
    "_meta": {
      "title": "ModelSamplingDiscrete"
    }
  },
  "45": {
    "inputs": {
      "ckpt_name": "miaomiaoHarem_v16G.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "46": {
    "inputs": {
      "text": "2girls"
    },
    "class_type": "TextBoxMira",
    "_meta": {
      "title": "Text Box"
    }
  },
  "47": {
    "inputs": {
      "Width": [
        "17",
        0
      ],
      "Height": [
        "17",
        1
      ],
      "Colum_first": true,
      "Rows": 1,
      "Colums": 1,
      "Layout": "1,0.2,1"
    },
    "class_type": "CreateTillingPNGMask",
    "_meta": {
      "title": "Create Tilling PNG Mask"
    }
  },
  "48": {
    "inputs": {
      "Intenisity": 1,
      "Blur": 0,
      "Start_At_Index": 0,
      "Overlap": "Next",
      "Overlap_Count": 1,
      "PngRectangles": [
        "47",
        2
      ]
    },
    "class_type": "PngRectanglesToMask",
    "_meta": {
      "title": "PngRectangles to Mask"
    }
  },
  "49": {
    "inputs": {
      "Intenisity": 1,
      "Blur": 0,
      "Start_At_Index": 2,
      "Overlap": "Previous",
      "Overlap_Count": 1,
      "PngRectangles": [
        "47",
        2
      ]
    },
    "class_type": "PngRectanglesToMask",
    "_meta": {
      "title": "PngRectangles to Mask"
    }
  },
  "50": {
    "inputs": {
      "strength": 1,
      "set_cond_area": "default",
      "conditioning": [
        "2",
        0
      ],
      "mask": [
        "48",
        0
      ]
    },
    "class_type": "ConditioningSetMask",
    "_meta": {
      "title": "Conditioning (Set Mask)"
    }
  },
  "51": {
    "inputs": {
      "text": [
        "46",
        0
      ],
      "clip": [
        "34",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "52": {
    "inputs": {
      "strength": 1,
      "set_cond_area": "default",
      "conditioning": [
        "51",
        0
      ],
      "mask": [
        "49",
        0
      ]
    },
    "class_type": "ConditioningSetMask",
    "_meta": {
      "title": "Conditioning (Set Mask)"
    }
  },
  "53": {
    "inputs": {
      "conditioning_1": [
        "50",
        0
      ],
      "conditioning_2": [
        "52",
        0
      ]
    },
    "class_type": "ConditioningCombine",
    "_meta": {
      "title": "Conditioning (Combine)"
    }
  },
  "54": {
    "inputs": {
      "text": [
        "46",
        0
      ],
      "clip": [
        "39",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "55": {
    "inputs": {
      "strength": 1,
      "set_cond_area": "default",
      "conditioning": [
        "41",
        0
      ],
      "mask": [
        "48",
        0
      ]
    },
    "class_type": "ConditioningSetMask",
    "_meta": {
      "title": "Conditioning (Set Mask)"
    }
  },
  "56": {
    "inputs": {
      "strength": 1,
      "set_cond_area": "default",
      "conditioning": [
        "54",
        0
      ],
      "mask": [
        "49",
        0
      ]
    },
    "class_type": "ConditioningSetMask",
    "_meta": {
      "title": "Conditioning (Set Mask)"
    }
  },
  "57": {
    "inputs": {
      "conditioning_1": [
        "55",
        0
      ],
      "conditioning_2": [
        "56",
        0
      ]
    },
    "class_type": "ConditioningCombine",
    "_meta": {
      "title": "Conditioning (Combine)"
    }
  }
};
