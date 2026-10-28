/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

/** 匿名云同步：UUID 生成、自动上传、拉取恢复 */

const UUID_KEY = "syncUuid";
const STORAGE_KEYS = [
  "wrongStats",
  "questionTimeLast",
  "examSession",
  "practiceSession",
  "examPaperProgress",
];

/** 获取或生成 UUID */
export function getSyncUuid(): string {
  if (typeof window === "undefined") return "";
  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}

/** 收集当前 localStorage 数据 */
function collectData(): Record<string, string> {
  const data: Record<string, string> = {};
  STORAGE_KEYS.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v) data[k] = v;
  });
  return data;
}

/** 上传数据到服务端 */
export async function pushSync(): Promise<{ ok: boolean; saved?: number; error?: string }> {
  if (typeof window === "undefined") return { ok: false, error: "no window" };
  const uuid = getSyncUuid();
  const data = collectData();
  if (Object.keys(data).length === 0) return { ok: true, saved: 0 };
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid, data }),
    });
    const json = await res.json();
    return { ok: json.ok, saved: json.saved };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** 从服务端拉取数据并写入 localStorage */
export async function pullSync(uuid: string): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!uuid || uuid.length < 8) return { ok: false, error: "invalid uuid" };
  try {
    const res = await fetch(`/api/sync?uuid=${encodeURIComponent(uuid)}`);
    const json = await res.json();
    if (!json.ok || !json.data) return { ok: false, error: "no data" };

    let count = 0;
    for (const [key, value] of Object.entries(json.data)) {
      if (STORAGE_KEYS.includes(key) && typeof value === "string") {
        localStorage.setItem(key, value);
        count++;
      }
    }
    // 保存 UUID 以便后续自动同步
    localStorage.setItem(UUID_KEY, uuid);
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** 自动同步（debounce，页面数据变化时调用） */
let syncTimer: ReturnType<typeof setTimeout> | null = null;
export function autoSync(): void {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushSync().catch(() => {});
  }, 5000);
}
