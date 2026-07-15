import type { GuessRow, GameMode, CellStatus, Player } from '../types/database';
import { computeRating, CARD_CLIP_POLYGON } from '../components/PlayerCard';

const CELL_COLOR: Record<CellStatus, string> = {
  exact: '#3ba55d',
  close: '#d8a13a',
  none: '#2a2f38',
};

const CELL_EMOJI: Record<CellStatus, string> = {
  exact: '🟩',
  close: '🟨',
  none: '⬛',
};

const MODE_LABEL: Record<GameMode, string> = {
  daily: 'Daily',
  training: 'Training',
  unlimited: 'Unlimited',
};

interface ShareOptions {
  mode: GameMode;
  guesses: GuessRow[];
  maxGuesses: number | null;
  won: boolean;
  player: Player;
}

function shieldPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  CARD_CLIP_POLYGON.forEach(([px, py], i) => {
    const cx = x + px * w;
    const cy = y + py * h;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Loads the mystery player's actual photo (the one being guessed), for use
 * as a heavily blurred backdrop in the share card — same photo the player
 * saw in-game, not a generic placeholder. Returns null if it can't be
 * loaded/drawn (network failure, or the host doesn't send CORS headers,
 * which would taint the canvas and block export) so the caller can fall
 * back to a flat dark backdrop instead.
 */
function loadPlayerImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Renders a share card that mirrors the real in-game card's shield shape and
 * layout exactly — rating, position, flag/club badges, age/shirt, name
 * banner — but in the same locked state the player saw mid-round: every
 * stat as "?"/"???", name as "???", and the mystery player's actual photo
 * (never a generic placeholder) heavily blurred so the answer stays hidden.
 * Below the card, a Wordle-style grid shows the per-column result of each
 * guess.
 */
export async function generateShareImage({ mode, guesses, maxGuesses, won, player }: ShareOptions): Promise<Blob> {
  const width = 640;
  const cardW = 300;
  const cardH = cardW * (4 / 3);
  const cardX = width / 2 - cardW / 2;
  const cardY = 110;

  const squareSize = 34;
  const squareGap = 8;
  const gridCols = 7;
  const gridWidth = gridCols * squareSize + (gridCols - 1) * squareGap;
  const gridStartX = (width - gridWidth) / 2;
  const gridTopY = cardY + cardH + 50;
  const rowHeight = squareSize + squareGap;
  const height = gridTopY + guesses.length * rowHeight + 70;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0a0e14');
  bgGrad.addColorStop(1, '#12161d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8b458';
  ctx.font = '36px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#d8b458';
  ctx.fillText('FUTIQ', width / 2, 52);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 15px Arial, sans-serif';
  const resultText = won
    ? `${MODE_LABEL[mode]} — Solved in ${guesses.length}${maxGuesses ? `/${maxGuesses}` : ''}`
    : `${MODE_LABEL[mode]} — Not solved${maxGuesses ? ` (${maxGuesses}/${maxGuesses})` : ''}`;
  ctx.fillText(resultText, width / 2, 78);

  // ---- Card (shield-clipped, matching the live PlayerCard shape) ----
  ctx.save();
  shieldPath(ctx, cardX, cardY, cardW, cardH);
  ctx.clip();

  // Base gradient (same tones as the gold tier gradient in-game)
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, '#1a1a1a');
  cardGrad.addColorStop(0.5, '#2a2210');
  cardGrad.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = cardGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Real mystery-player photo, heavily blurred — falls back to a flat dark
  // backdrop if it can't be loaded/drawn (network failure or missing CORS
  // headers on the image host, which would taint the canvas export).
  let drewPhoto = false;
  if (player.image_url) {
    const img = await loadPlayerImage(player.image_url);
    if (img) {
      try {
        ctx.save();
        ctx.filter = 'blur(26px)';
        drawCoverImage(ctx, img, cardX - 25, cardY - 25, cardW + 50, cardH + 50);
        ctx.filter = 'none';
        ctx.restore();
        ctx.getImageData(Math.round(cardX + cardW / 2), Math.round(cardY + cardH / 2), 1, 1);
        drewPhoto = true;
      } catch {
        drewPhoto = false;
      }
    }
  }

  // Dark gradient overlay for text readability (matches the live card)
  const overlayGrad = ctx.createLinearGradient(cardX, cardY + cardH, cardX, cardY);
  overlayGrad.addColorStop(0, 'rgba(10,14,20,0.92)');
  overlayGrad.addColorStop(0.4, 'rgba(10,14,20,0.35)');
  overlayGrad.addColorStop(0.6, 'rgba(10,14,20,0)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  if (!drewPhoto) {
    ctx.fillStyle = 'rgba(10,14,20,0.25)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
  }

  // Rating (always visible in-game too — cosmetic, not identifying)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 46px Arial, sans-serif';
  ctx.fillText(String(computeRating(player)), cardX + 22, cardY + 55);

  // Position — locked
  ctx.fillStyle = '#d8b458';
  ctx.font = '700 26px Arial, sans-serif';
  ctx.fillText('?', cardX + 22, cardY + 88);

  // Nation flag placeholder box
  const badgeW = 42, badgeH = 30;
  const badgeX = cardX + 22;
  let badgeY = cardY + 104;
  ctx.fillStyle = '#0a0e14';
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 1;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8b93a3';
  ctx.font = '600 10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('???', badgeX + badgeW / 2, badgeY + badgeH / 2 + 4);

  // Club crest placeholder box
  badgeY += badgeH + 8;
  ctx.fillStyle = '#333333';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 3);
  ctx.fill();
  ctx.strokeStyle = '#3a3f4a';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 10px Arial, sans-serif';
  ctx.fillText('???', badgeX + badgeW / 2, badgeY + badgeH / 2 + 4);

  // Age / Shirt mini-stats
  ctx.textAlign = 'left';
  let statY = cardY + cardH - 60;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px Arial, sans-serif';
  ctx.fillText('AGE', badgeX, statY);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 18px Arial, sans-serif';
  ctx.fillText('?', badgeX + 34, statY + 1);

  statY += 26;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px Arial, sans-serif';
  ctx.fillText('SHIRT', badgeX, statY);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 18px Arial, sans-serif';
  ctx.fillText('?', badgeX + 44, statY + 1);

  // Name banner — locked
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5a6272';
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('???', cardX + cardW / 2, cardY + cardH - 24);

  ctx.restore();

  // Card border (matches the gold tier border in-game)
  shieldPath(ctx, cardX, cardY, cardW, cardH);
  ctx.strokeStyle = '#d8b458';
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ---- Result grid (Wordle-style), one row per guess, one square per column ----
  ctx.textAlign = 'center';
  const columns: (keyof GuessRow['cells'])[] = ['name', 'nation', 'league', 'club', 'position', 'age', 'shirt'];
  guesses.forEach((row, rowIdx) => {
    columns.forEach((col, colIdx) => {
      const x = gridStartX + colIdx * (squareSize + squareGap);
      const y = gridTopY + rowIdx * rowHeight;
      ctx.fillStyle = CELL_COLOR[row.cells[col].status];
      roundRect(ctx, x, y, squareSize, squareSize, 6);
      ctx.fill();
    });
  });

  ctx.fillStyle = '#5a6272';
  ctx.font = '20px "Inter", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Guess the footballer - futiq', width / 2, height - 22);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image'));
      }, 'image/png');
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to generate image'));
    }
  });
}

/** Wordle-style emoji grid + result summary, safe to paste into any text field. */
export function buildShareText({ mode, guesses, maxGuesses, won }: Omit<ShareOptions, 'player'>): string {
  const text = won
    ? `FUTIQ - ${MODE_LABEL[mode]}\nSolved in ${guesses.length}${maxGuesses ? `/${maxGuesses}` : ''} 🎯`
    : `FUTIQ - ${MODE_LABEL[mode]}\nNot solved${maxGuesses ? ` (${maxGuesses}/${maxGuesses})` : ''} ❌`;

  const columns: (keyof GuessRow['cells'])[] = ['name', 'nation', 'league', 'club', 'position', 'age', 'shirt'];
  const grid = guesses
    .map((row) => columns.map((col) => CELL_EMOJI[row.cells[col].status]).join(''))
    .join('\n');

  return `${text}\n\n${grid}`;
}

async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (!ClipboardItemCtor || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

function downloadImage(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'futiq-result.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type SharePlatform = 'x' | 'facebook' | 'instagram';
export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'error';

/**
 * Shares the result to a specific platform.
 *
 * Platform constraints (none of these can be worked around client-side,
 * without a backend to host the image at a public URL):
 * - X and Facebook's web share intents only accept text/links, not attached
 *   images — so those open a pre-filled post with the emoji result grid,
 *   and the generated image is copied to the clipboard (or downloaded) so
 *   it can be pasted/attached manually.
 * - Instagram has no web share intent at all. On mobile this goes through
 *   the OS share sheet (Web Share API), where Instagram appears as an
 *   option with the image attached directly. On desktop, the image
 *   downloads and the person attaches it manually in the Instagram app.
 */
export async function shareResult(platform: SharePlatform, options: ShareOptions): Promise<ShareOutcome> {
  const blob = await generateShareImage(options);
  const text = buildShareText(options);

  if (platform === 'instagram') {
    const file = new File([blob], 'futiq-result.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'FutIQ', text });
        return 'shared';
      } catch {
        // fall through to download
      }
    }
    downloadImage(blob);
    return 'downloaded';
  }

  const copied = await copyImageToClipboard(blob);
  if (!copied) downloadImage(blob);

  if (platform === 'x') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  } else {
    const shareUrl = window.location.origin;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return copied ? 'copied' : 'downloaded';
}
