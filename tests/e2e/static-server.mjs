// AC-15 用的最小静态文件服务器：把构建产物挂在子路径下，行为照 Nginx 的常见配置
// （`try_files $uri $uri/index.html =404` + `error_page 404 <base>404.html`）。
// 子路径以外的请求一律 404，漏加 withBase() 的链接会直接请求失败。
//
// 用法：node tests/e2e/static-server.mjs <目录> <base> <端口>，例如 dist-sub /sub/ 4322。
// 由 playwright.config.ts 的 webServer 启动，不对外使用。
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const [dir, base, port] = process.argv.slice(2);
if (!dir || !base?.startsWith('/') || !base.endsWith('/') || !port) {
  console.error('用法：node tests/e2e/static-server.mjs <目录> <以 / 开头和结尾的 base> <端口>');
  process.exit(1);
}
const root = resolve(dir);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

function fileAt(path) {
  try {
    return statSync(path);
  } catch {
    return undefined;
  }
}

function send(res, status, path) {
  res.writeHead(status, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  // 读文件出错（例如 dist-sub/ 正在重建）只断开这一个请求，不让整个服务器退出
  createReadStream(path).on('error', () => res.destroy()).pipe(res);
}

function notFound(res) {
  const page = join(root, '404.html');
  if (fileAt(page)?.isFile()) return send(res, 404, page);
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
}

// 和 astro preview 一样只听本机（见文件末尾的 listen）
createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return res.writeHead(400).end();
  }
  // 根路径不带斜杠时补上，和 Nginx 对目录的处理一样
  if (`${pathname}/` === base) return res.writeHead(301, { location: base + url.search }).end();
  if (!pathname.startsWith(base)) return res.writeHead(404, { 'content-type': 'text/plain' }).end('outside base');

  const target = resolve(root, `.${pathname.slice(base.length - 1)}`);
  if (target !== root && !target.startsWith(root + sep)) return res.writeHead(403).end();

  const stat = fileAt(target);
  if (stat?.isFile()) return send(res, 200, target);
  if (stat?.isDirectory()) {
    if (!pathname.endsWith('/')) return res.writeHead(301, { location: `${url.pathname}/${url.search}` }).end();
    const index = join(target, 'index.html');
    if (fileAt(index)?.isFile()) return send(res, 200, index);
  }
  notFound(res);
}).listen(Number(port), 'localhost', () => console.log(`static-server: ${root} → http://localhost:${port}${base}`));
