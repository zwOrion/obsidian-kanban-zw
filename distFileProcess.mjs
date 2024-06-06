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
const zipFilePath = path.join(__dirname, zipFileName);


// Run zip command
console.log('运行zip命令...');
execSync(`zip -q ${zipFilePath} main.js styles.css manifest.json`);

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  console.log('创建dist目录...');
  fs.mkdirSync(distDir);
}
console.log('将文件复制到dist目录...');
// Copy zip file to dist directory
fs.renameSync(zipFilePath, path.join(distDir, zipFileName));
fs.copyFileSync('main.js', path.join(distDir, 'main.js'));
fs.copyFileSync('styles.css', path.join(distDir, 'styles.css'));
fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'));

console.log('构建完成。');

