import * as fs from "fs";
import {execSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = path.join(__dirname, 'dist');
// 读取manifest.json文件以获取id（文件名）
console.log('读取manifest.json文件...');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const zipFileName = `${manifest.id}.zip`;
const zipFilePath = path.join(distDir, zipFileName);

// Check if the zip file exists and delete it if it does
if (fs.existsSync(zipFilePath)) {
  console.log('删除现有的zip文件...');
  fs.unlinkSync(zipFilePath);
}
console.log('运行zip命令...');
execSync(`cd ${distDir} && zip -q ${zipFilePath} main.js styles.css manifest.json`);


