#!/usr/bin/env python3
# 开发脚本（design v2.2 D6）：按参考图 docs/assets/mascot-reference.png 逐格取样，生成 src/assets/mascot/mascot.svg。
#
# 用法：python3 scripts/trace-mascot.py [参考图] [输出]（需要 Pillow）
#
# 参考图是截屏缩放过的：小形象的一个“像素”约 1.45 个图像像素，边缘有抗锯齿。先按身体左右缘的亚像素位置
# 定出格宽，再取每格中心的颜色，归到橙（身体）、黑（眼睛）、底色或灰（旁边那根灰线，不属于形象）。
# 生成物不手改；改了参考图就重跑。
import sys
from PIL import Image
ref = sys.argv[1] if len(sys.argv) > 1 else 'docs/assets/mascot-reference.png'
out = sys.argv[2] if len(sys.argv) > 2 else 'src/assets/mascot/mascot.svg'
im = Image.open(ref).convert('RGB')
# 参考图里小形象的边界（按抗锯齿的覆盖率算到亚像素）：身体左缘 189.5、右缘 212.77 → 8 个大格 16 个小格
U = (212.77 - 189.5) / 16          # 每个小格约 1.454 屏幕像素（大格 2.91px，即“每格 3px”的缩放）
X0 = 189.5 - 4 * U                  # 左臂左缘
Y0 = 157.75                         # 头顶
COLS, ROWS = 24, 16                 # 腿底停在输入框上沿 y≈181（被输入框的边框盖住）
ORANGE, BLACK = (216, 118, 86), (0, 0, 0)
def dist(a, b): return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5
grid = []
for r in range(ROWS):
    row = []
    for c in range(COLS):
        p = im.getpixel((int(X0 + (c + 0.5) * U), int(Y0 + (r + 0.5) * U)))
        d = {'#': dist(p, ORANGE), 'K': dist(p, BLACK), '.': dist(p, (252, 252, 251)), 'g': dist(p, (p[0], p[0], p[0])) if max(p) - min(p) < 12 and 40 < p[0] < 230 else 999}
        row.append(min(d, key=d.get))
    grid.append(row)
for row in grid: print(''.join(row))
body = [(c, r) for r in range(ROWS) for c in range(COLS) if grid[r][c] == '#']
eyes = [(c, r) for r in range(ROWS) for c in range(COLS) if grid[r][c] == 'K']
used = body + eyes
assert min(c for c, _ in used) == 0 and max(c for c, _ in used) == COLS - 1
assert min(r for _, r in used) == 0 and max(r for _, r in used) == ROWS - 1
rect = lambda c, r: f'    <rect x="{c}" y="{r}" width="1" height="1"/>'
svg = f'''<!--
  Claude Code 的官方像素小形象（design v2.2 D6、D7），由 scripts/trace-mascot.py 按 docs/assets/mascot-reference.png 逐格取样生成，不手改。
  参考图里小形象的一个“像素”约 1.45 个图像像素（身体 23.3 图像像素宽 = 16 格），整只 {COLS}×{ROWS} 格，
  每格一个 <rect>，viewBox 正好包住整只（左臂到右臂、头顶到脚底）；旁边那根灰线不属于形象。
  标准姿态，不改画、不放大、不配台词。身体只用 --mascot（官方橙），眼睛用 --mascot-eye（参考图里是黑色）。
  由 src/components/Mascot.astro 引用，是唯一引用这个文件的地方。纯装饰，对读屏隐藏。
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {COLS} {ROWS}" shape-rendering="crispEdges">
  <g class="mascot-body" fill="var(--mascot, #d87656)">
{chr(10).join(rect(c, r) for c, r in body)}
  </g>
  <g class="mascot-eyes" fill="var(--mascot-eye, #000000)">
{chr(10).join(rect(c, r) for c, r in eyes)}
  </g>
</svg>
'''
open(out, 'w').write(svg)
print(len(body), 'body cells,', len(eyes), 'eye cells')
