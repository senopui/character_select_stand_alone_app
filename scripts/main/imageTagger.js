/*
  Supports both WD14 tagger and CL tagger models in ONNX format.
  https://huggingface.co/cella110n/cl_tagger 
  https://huggingface.co/SmilingWolf

  Download models and place in "models/tagger" folder:
  - cl_tagger_v2.onnx + cl_tagger_v2_tag_mapping.json
  - wd-eva02-large-tagger-v3.onnx + wd-eva02-large-tagger-v3_selected_tags.csv
  - wd-v1-4-convnext-tagger.onnx + wd-v1-4-convnext-tagger_selected_tags.csv
*/

const { fork } = require('child_process');
const path = require("path");
const { app, ipcMain } = require("electron");

const CAT = '[imageTaggerMain]';
let taggerSubprocess = null;  // Global reference to subprocess

function getOrCreateSubprocess() {
  if (!taggerSubprocess) {
    const subprocessPath = path.join(__dirname, 'imageTaggerFork.js');

    taggerSubprocess = fork(subprocessPath, [], { silent: false });  // false to see subprocess debug output

    taggerSubprocess.on('message', (msg) => {
      //console.log(CAT, 'Message from subprocess:', msg);
    });

    taggerSubprocess.on('error', (err) => {
      console.error(CAT, 'Subprocess error:', err);
      taggerSubprocess = null; 
    });

    taggerSubprocess.on('close', (code) => {
      console.log(`${CAT} Subprocess closed with code ${code}`);
      taggerSubprocess = null;
    });
  }
  return taggerSubprocess;
}

async function runModelInSubprocess(args) {
  return new Promise((resolve, reject) => {
    const subprocess = getOrCreateSubprocess();
    if (!subprocess) {
      reject(new Error(CAT, 'Failed to create subprocess'));
      return;
    }

    const messageId = Date.now();
    const handler = (msg) => {
      if (msg.type === 'result') {
        subprocess.removeListener('message', handler);
        resolve(msg.data);
      } else if (msg.type === 'error') {
        subprocess.removeListener('message', handler);
        reject(new Error(msg.data));
      }
    };
    subprocess.addListener('message', handler);

    // Send args to subprocess
    subprocess.send({ ...args, id: messageId });

    const timeout = setTimeout(() => {
      subprocess.removeListener('message', handler);
      subprocess.kill();
      reject(new Error(CAT, 'Subprocess timeout'));
    }, 10000);

    const originalResolve = resolve;
    resolve = (value) => {
      clearTimeout(timeout);
      originalResolve(value);
    };
  });
}

async function runImageTagger(args) {
  await new Promise(resolve => setImmediate(resolve));
  try {
    return await runModelInSubprocess(args);
  } catch (err) {
    console.error(CAT, 'IPC error:', err);
    throw err;
  }
}


function setupTagger() {
  ipcMain.handle("run-image-tagger", async (event, args) => {
    return await runImageTagger(args);
  });

  app.on('before-quit', () => {
    if (taggerSubprocess) {
      taggerSubprocess.kill('SIGTERM');
    }
  });
}

module.exports = { 
  setupTagger,
  runImageTagger  
};
