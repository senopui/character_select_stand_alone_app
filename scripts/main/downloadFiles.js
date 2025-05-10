const { app, ipcMain } = require('electron');
const path = require('node:path');
const https = require('https');
const fs = require('fs');
const { dialog } = require('electron');

const CAT = '[FileDownloader]';
const appPath = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), 'resources', 'app') : app.getAppPath();


function downloadFile(url, filePath, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const maxRedirects = 5; // set max redirections
        console.log(`${CAT}: Downloading... ${url}`);

        const request = https.get(url, (response) => {
            // redirections (301, 302, 307, 308)
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                if (redirectCount >= maxRedirects) {
                    console.error(`${CAT}: Too many redirects for ${url}`);
                    reject(new Error('Too many redirects'));
                    return;
                }

                const redirectUrl = response.headers.location;
                if (!redirectUrl) {
                    console.error(`${CAT}: Redirect response missing location header for ${url}`);
                    reject(new Error('Redirect response missing location header'));
                    return;
                }

                console.log(`${CAT}: Redirecting to ${redirectUrl}`);
                response.resume(); 
                downloadFile(redirectUrl, filePath, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                console.error(`${CAT}: Failed to download file. Status Code: ${response.statusCode}`);
                response.resume();
                reject(new Error(`Failed to download file. Status Code: ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`${CAT}: File downloaded successfully to ${filePath}`);
                resolve();
            });
        });

        request.on('error', (err) => {
            console.error(`${CAT}: Error downloading file: ${err.message}`);
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

async function setupDownloadFiles() {
    const saveDir = path.join(appPath, 'data');
    if (!fs.existsSync(saveDir)) {
        console.log(CAT, 'Creating', saveDir);
        fs.mkdirSync(saveDir, { recursive: true });
    }

    const wai_illustrious_character_select_files = [
        { 'name': 'original_character', 'file_path': path.join(saveDir, 'original_character.json'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/data/original_character.json' },
        { 'name': 'view_tags', 'file_path': path.join(saveDir, 'view_tags.json'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/data/view_tags.json' },
        { 'name': 'wai_characters', 'file_path': path.join(saveDir, 'wai_characters.csv'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/data/wai_characters.csv' },
        { 'name': 'wai_tag_assist', 'file_path': path.join(saveDir, 'wai_tag_assist.json'), 'url': 'https://raw.githubusercontent.com/mirabarukaso/character_select_stand_alone_app/refs/heads/main/data/wai_tag_assist.json' },
        // outside
        { 'name': 'wai_character_thumbs', 'file_path': path.join(saveDir, 'wai_character_thumbs.json'), 'url': 'https://huggingface.co/datasets/flagrantia/character_select_stand_alone_app/resolve/main/wai_character_thumbs.json' },
        { 'name': 'danbooru_tag', 'file_path': path.join(saveDir, 'danbooru.csv'), 'url': 'https://raw.githubusercontent.com/DominikDoom/a1111-sd-webui-tagcomplete/refs/heads/main/tags/danbooru.csv' }
    ];

    try {
        const downloadPromises = wai_illustrious_character_select_files.map(async (wai) => {
            if (!fs.existsSync(wai.file_path)) {
                await downloadFile(wai.url, wai.file_path);
            }
        });

        await Promise.all(downloadPromises);
        console.log(CAT, 'All files downloaded successfully');        
    } catch (error) {
        console.error(CAT, `Error in setupDownloadFiles: ${error.message}`);
        dialog.showErrorBox(CAT, `Error in setupDownloadFiles: ${error.message}`);
        return false;
    }

    ipcMain.handle('download-url', async (event, url, filePath) => {
        try {
            await downloadFile(url, filePath);
            return true;
        } catch (err) {
            console.error(CAT, `Error downloading file via IPC: ${err.message}`);
            return false;
        }
    });

    return true;
}

module.exports = {
    setupDownloadFiles
};