import * as core from '@actions/core';
import {execSync} from "node:child_process";

const fs = require('fs');
const path = require('path');
const axios = require('axios');


function isJqInstalled() {
    try {
        execSync("jq --version", {stdio: "ignore"}); // suppress output
        return true; // no error means jq exists
    } catch {
        return false; // error means jq is not installed
    }
}

function getAvailablePlatforms() {
    return ['linux', 'macos', 'windows']
}

function getAvailableArchitectures() {
    return ['amd64', 'arm64', 'i386']
}

function getDownloadUrl(platform, architecture, version) {
    return `https://github.com/jqlang/jq/releases/download/jq-${version}/jq-${platform}-${architecture}`
}

async function downloadAndRename(fileUrl, downloadDir = './downloads') {
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, {recursive: true});
    }

    const tempPath = path.join(downloadDir, 'temp_download');
    const finalPath = path.join(downloadDir, "jq");

    // Download file
    const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);

    // Wait for download to finish
    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    // Rename file
    await fs.promises.rename(tempPath, finalPath);

    return finalPath;
}


function main() {
    if (isJqInstalled()) {
        core.info("jq is already installed. Skipping download.");
        return;
    }

    let jqVersion = core.getInput('jq-version')
    let platform = core.getInput('platform')
    let architecture = core.getInput('architecture')

    if (!getAvailablePlatforms().includes(platform)) {
        core.error(`Invalid platform: ${platform}. Available platforms: ${getAvailablePlatforms().join(', ')}`);
        throw new Error(`Invalid platform: ${platform}. Available platforms: ${getAvailablePlatforms().join(', ')}`);
    }

    if (!getAvailableArchitectures().includes(architecture)) {
        core.error(`Invalid architecture: ${architecture}. Available architectures: ${getAvailableArchitectures().join(', ')}`);
        throw new Error(`Invalid architecture: ${architecture}. Available architectures: ${getAvailableArchitectures().join(', ')}`);
    }

    const downloadUrl = getDownloadUrl(platform, architecture, jqVersion);
    core.info(`Downloading jq from: ${downloadUrl}`);

    (async () => {
        try {
            const filePath = await downloadAndRename('https://example.com/file.pdf');
            core.info(`File downloaded and renamed to: ${filePath}`)
            console.log('File downloaded to:', filePath);

            const dirPath = path.dirname(filePath);

            // Add the folder to PATH for subsequent steps
            core.addPath(dirPath);

            console.log('Downloaded executable path:', filePath);
            console.log('Added to PATH:', dirPath);
        } catch (err) {
            console.error('Download failed:', err);
        }
    })();
}

main()