const fs = require('fs');
const path = require('node:path');
const { app, ipcMain } = require('electron');

const CAT = '[FileHandlers]';
const appPath = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), 'resources', 'app') : app.getAppPath();

function loadCSVFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(CAT, `File not found: ${filePath}`);
    return null;
  }

  try {
    console.log(CAT, 'Loading CSV file:', filePath);
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 1) {
      throw new Error('CSV file is empty or invalid');
    }

    const csvResult = {};
    lines.forEach((line, index) => {
      const parts = line.split(',').map(item => item.trim());
      if (parts.length !== 2) {
        console.warn(CAT, `Invalid CSV format at line ${index + 1}: ${line}`);
        return;
      }
      const [key, value] = parts;
      csvResult[key] = value || '';
    });

    if (Object.keys(csvResult).length === 0) {
      throw new Error('No valid data found in CSV file');
    }

    return csvResult;
  } catch (error) {
    console.error(CAT, 'Error loading CSV file:', error);
    throw new Error(`Failed to load CSV file: ${filePath} - ${error.message}`);
  }
}

function loadJSONFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(CAT, `File not found: ${filePath}`);
    return null;
  }

  try {
    console.log(CAT, 'Loading JSON file:', filePath);
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error(CAT, 'Error loading JSON file:', error);
    throw new Error(`Failed to load JSON file: ${error.message}`);
  }
}

function loadAsBase64(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(CAT, `File not found: ${filePath}`);
    return null;
  }

  try {
    console.log(CAT, 'Loading file as Base64:', filePath);
    const binaryContent = fs.readFileSync(filePath);
    return binaryContent.toString('base64');
  } catch (error) {
    console.error(CAT, 'Error loading file as Base64:', error);
    throw new Error(`Failed to load file as Base64: ${filePath} - ${error.message}`);
  }
}

function loadFile(relativePath, prefix='', filePath='') {
  try {
    let fullPath = path.join(appPath, relativePath);
    if(filePath !==''){
      fullPath = path.join(path.dirname(relativePath), prefix, filePath);
    }

    const ext = path.extname(fullPath).toLowerCase();

    if (!fs.existsSync(fullPath)) {
      console.error(CAT, `File not found: ${fullPath}`);
      return null;
    }

    if (ext === '.csv') {
      return loadCSVFile(fullPath);
    } else if (ext === '.json') {
      return loadJSONFile(fullPath);
    } else {
      return loadAsBase64(fullPath);
    }
  } catch (error) {
    console.error(CAT, 'Error handling file request:', error);
    return { error: error.message };
  }
}

function processMetadata(buffer, offset, length) {
  let metadataFound = '';
  const chunkData = buffer.slice(offset, length);
        
  const nullPos = chunkData.indexOf(0);
  if (nullPos !== -1) {
    const keyword = chunkData.toString('ascii', 0, nullPos);
    const textData = chunkData.toString('ascii', nullPos + 1);
    console.log(CAT, `Keyword: ${keyword}, Length: ${textData.length}`);
    
    if (keyword === 'parameters' || keyword === 'prompt' || 
        keyword === 'Comment' || keyword === 'Description' || 
        keyword === 'Software' || keyword === 'AI-metadata') {
      
      try {
        metadataFound = JSON.parse(textData);
      } catch {
        metadataFound = textData;
      }
              
      return metadataFound;
    }
    
    if (!metadataFound) {
      if (!metadataFound) metadataFound = {};
      metadataFound[keyword] = textData;
    }
  }
  
  return null;
}

function extractPngMetadata(buffer) {
  try {
    let offset = 8;
    let metadataFound = null;
    
    while (offset < buffer.length - 12) { 
      const length = buffer.readUInt32BE(offset);
      offset += 4;
      
      if (offset + length + 4 > buffer.length) {
        console.warn(CAT, 'Incomplete PNG chunk detected');
        break;
      }
      
      const type = buffer.toString('ascii', offset, offset + 4);
      offset += 4;
      
      if (type === 'tEXt') {
        console.log(CAT, `Found tEXt chunk of length ${length}`);
        metadataFound = processMetadata(buffer, offset, offset + length);
        if(metadataFound){
          break;
        }
        
      }
      // For simplicity, we're only focusing on tEXt chunks now      
      // Skip chunk data and CRC
      offset += length + 4;
    }
    
    return metadataFound;
  } catch (error) {
    console.error(CAT, 'Error in PNG metadata extraction:', error);
    return null;
  }
}

function setupFileHandlers() {
  ipcMain.handle('read-file', async (event, relativePath, prefix, filePath) => {
    return loadFile(relativePath, prefix, filePath);
  });

  ipcMain.handle('read-safetensors', async (event, modelPath, prefix, filePath) => {
    try {
      const fullPath = path.join(path.dirname(modelPath), prefix, filePath);
      const buffer = fs.readFileSync(fullPath);
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

      let jsonLength = 0;
      for (let i = 0; i < 8; i++) {
        jsonLength |= view.getUint8(i) << (i * 8);
      }

      if (jsonLength <= 0 || jsonLength > buffer.length - 8) {
        return 'None';
      }

      const jsonBytes = buffer.subarray(8, 8 + jsonLength);
      const jsonString = jsonBytes.toString('utf8');
      const metadata = JSON.parse(jsonString);

      if (metadata.__metadata__) {
        return metadata.__metadata__;
      } else {
        return 'None';
      }
    } catch (error) {
      console.error(CAT, `Reading metadata failed: ${error.message}`);
      return `Error: Reading metadata failed: ${error.message}`;
    }
  });

  ipcMain.handle('read-image-metadata', async (event, buffer, fileName, fileType) => {
    try {
      const imageBuffer = Buffer.from(buffer);
      const metadata = {
        fileName: fileName,
        fileType: fileType,
        metadata: null
      };
      
      if (fileType.includes('png')) {         
        const pngMetadata = extractPngMetadata(imageBuffer);
        if (pngMetadata) {
          metadata.metadata = pngMetadata;
        }
      } else {
        console.warn(CAT, `Not a PNG file: ${fileType}`);
        throw new Error(`Only PNG format is supported, received: ${fileType}`);
      }
      
      if (!metadata.metadata) {
        console.log(CAT, `No special metadata found for: ${fileName}`);
        metadata.metadata = {
          dimensions: `${metadata.width}x${metadata.height}`,
          format: 'png',
          note: 'No AI generation metadata found'
        };
      }
      
      console.log(CAT, `Successfully processed image: ${fileName} (${metadata.metadata})`);
      return metadata;
      
    } catch (processingError) {
      console.error(CAT, `Image processing error: ${processingError.message}`);
      return {
        fileName: fileName,
        fileType: fileType,
        error: `Image processing failed: ${processingError.message}`,
        metadata: { note: 'Processing error occurred' }
      };
    }
  });

}

module.exports = {
  loadJSONFile,
  loadCSVFile,
  loadFile,
  setupFileHandlers,
};