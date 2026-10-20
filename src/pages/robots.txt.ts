import type { APIRoute } from 'astro';
import { joinBase } from '../lib/with-base';

// 允许全部抓取；有 site（部署时的 SITE_URL）时写上 @astrojs/sitemap 生成的 sitemap 地址。
export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', 'Allow: /'];
  if (site) lines.push(`Sitemap: ${new URL(joinBase(import.meta.env.BASE_URL, 'sitemap-index.xml'), site).href}`);
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
