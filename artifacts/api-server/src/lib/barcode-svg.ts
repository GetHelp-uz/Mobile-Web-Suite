const CODE128_PATTERNS: number[][] = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
  [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
  [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
  [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
  [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
  [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
  [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
  [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
  [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
  [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
  [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
  [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
  [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
  [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
  [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
  [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
  [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
  [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
  [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
  [2,1,1,2,3,2],[2,3,3,1,1,1,2],
];

const START_B = 104;
const STOP = 106;

export function generateCode128SVG(value: string, opts: { height?: number; moduleWidth?: number; showText?: boolean } = {}): string {
  const { height = 60, moduleWidth = 2, showText = true } = opts;
  const chars = value.split("").map(c => {
    const code = c.charCodeAt(0) - 32;
    if (code < 0 || code > 94) return -1;
    return code;
  }).filter(c => c >= 0);

  const codes = [START_B, ...chars];
  const checksum = codes.reduce((sum, v, i) => sum + (i === 0 ? v : v * i), 0) % 103;
  codes.push(checksum, STOP);

  const modules: boolean[] = [];
  for (let i = 0; i < codes.length; i++) {
    const pat = CODE128_PATTERNS[codes[i]];
    if (!pat) continue;
    const len = pat.length;
    for (let j = 0; j < len; j++) {
      const w = pat[j];
      const isBar = j % 2 === 0;
      for (let k = 0; k < w; k++) modules.push(isBar);
    }
  }

  const totalModules = modules.length;
  const totalWidth = totalModules * moduleWidth + 20;
  const barHeight = showText ? height - 16 : height;
  const paddingX = 10;

  const rects: string[] = [];
  let x = paddingX;
  for (const filled of modules) {
    if (filled) {
      rects.push(`<rect x="${x}" y="4" width="${moduleWidth}" height="${barHeight}" fill="#000"/>`);
    }
    x += moduleWidth;
  }

  const textEl = showText
    ? `<text x="${totalWidth / 2}" y="${barHeight + 14}" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">${value}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height + 4}" viewBox="0 0 ${totalWidth} ${height + 4}">
  <rect width="${totalWidth}" height="${height + 4}" fill="white"/>
  ${rects.join("\n  ")}
  ${textEl}
</svg>`;
}
