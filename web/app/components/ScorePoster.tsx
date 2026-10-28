"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 成绩海报：本地 canvas 生成图片，可长按保存 / 下载
 */
import { useState } from "react";
import FixedLayer from "./FixedLayer";

export default function ScorePoster({
  data, onClose,
}: {
  data: {
    title: string;        // 例如「每日一练」「2025 国考副省级」
    accuracy: number;     // 正确率
    total: number;
    correct: number;
    seconds: number;
    date?: string;
  };
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const QUOTES = ["道阻且长，行则将至。", "星光不负赶路人。", "今日之努力，皆为上岸之阶梯。", "每一道错题，都是提分点。"];
  const [text, setText] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const draw = () => {
    const W = 750, H = 1000;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // 背景渐变
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#F4701E");
    g.addColorStop(0.55, "#E94560");
    g.addColorStop(1, "#B31E4B");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 光斑
    ctx.fillStyle = "rgba(255,255,255,.14)";
    ctx.beginPath(); ctx.arc(W - 80, 120, 200, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(60, H - 120, 160, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "600 30px 'PingFang SC', sans-serif";
    ctx.fillText("行 测 题 库", W / 2, 110);

    ctx.fillStyle = "#fff";
    ctx.font = "800 120px 'PingFang SC', sans-serif";
    ctx.fillText(`${data.accuracy}%`, W / 2, 330);

    ctx.font = "600 30px 'PingFang SC', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText("本次正确率", W / 2, 380);

    // 数据条
    const stats = [
      { l: "题量", v: String(data.total) },
      { l: "答对", v: String(data.correct) },
      { l: "用时", v: `${Math.floor(data.seconds / 60)}分${data.seconds % 60}秒` },
    ];
    ctx.font = "700 34px 'PingFang SC', sans-serif";
    stats.forEach((st, i) => {
      const x = W / 2 + (i - 1) * 210;
      ctx.fillStyle = "rgba(255,255,255,.16)";
      ctx.beginPath();
      const r = 20, w = 180, h = 130, y = 470;
      ctx.roundRect(x - w / 2, y, w, h, r);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(st.v, x, y + 62);
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.font = "500 22px 'PingFang SC', sans-serif";
      ctx.fillText(st.l, x, y + 100);
      ctx.font = "700 34px 'PingFang SC', sans-serif";
    });

    // 标题：自动换行，最多 2 行
    ctx.fillStyle = "#fff";
    ctx.font = "800 34px 'PingFang SC', sans-serif";
    {
      const maxW = W - 110;
      const words: string[] = [];
      let cur = "";
      for (const ch of data.title) {
        if (ctx.measureText(cur + ch).width > maxW) { words.push(cur); cur = ch; } else { cur += ch; }
      }
      if (cur) words.push(cur);
      let lines = words.slice(0, 2);
      if (words.length > 2) lines[1] = lines[1].slice(0, -1) + "…";
      lines.forEach((l, i) => ctx.fillText(l, W / 2, lines.length > 1 ? 676 + i * 44 : 700));
    }

    // 用户自定义文案（自动换行，最多 3 行）
    const line = (text || "").trim();
    if (line) {
      ctx.font = "500 28px 'PingFang SC', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,.92)";
      const maxWidth = W - 120;
      const lines: string[] = [];
      let cur = "";
      for (const ch of line) {
        if (ctx.measureText(cur + ch).width > maxWidth) {
          lines.push(cur);
          cur = ch;
          if (lines.length === 3) break;
        } else {
          cur += ch;
        }
      }
      if (cur && lines.length < 3) lines.push(cur);
      lines.forEach((l, i) => ctx.fillText(l, W / 2, 760 + i * 42));
    }

    // 底部
    ctx.font = "500 22px 'PingFang SC', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.fillText(data.date || new Date().toLocaleDateString(), W / 2, H - 70);

    setUrl(c.toDataURL("image/png"));
  };

  return (
    <FixedLayer>
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-5" style={{ background: "rgba(12,8,6,.82)" }}>
        <div className="w-full max-w-[330px]">
          {!url ? (
            <div className="rounded-2xl bg-[var(--surface)] p-5 text-center">
              <p className="text-[15px] font-extrabold">生成成绩海报</p>
              <p className="mt-1 text-[11.5px] text-[var(--fg-muted)]">写一句话，会一起印在海报上</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 60))}
                rows={2}
                maxLength={60}
                placeholder="例如：今天也要上岸！"
                className="mt-3 w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              />
              <div className="mt-1 text-right text-[10.5px] text-[var(--fg-muted)]">{text.length}/60</div>
              <div className="mt-3 flex gap-2">
                <button onClick={onClose} className="xc-btn-ghost flex-1">取消</button>
                <button onClick={draw} className="xc-btn flex-1">生成</button>
              </div>
            </div>
          ) : (
            <div>
              <img src={url} alt="成绩海报" style={{ width: "100%", borderRadius: 16 }} />
              <div className="mt-3 flex gap-2">
                <button onClick={onClose} className="xc-btn-ghost flex-1">关闭</button>
                <a href={url} download={`行测成绩-${Date.now()}.png`} className="xc-btn flex-1">保存图片</a>
              </div>
              <p className="mt-2 text-center text-[11px] text-white/60">长按图片也可保存</p>
            </div>
          )}
        </div>
      </div>
    </FixedLayer>
  );
}
