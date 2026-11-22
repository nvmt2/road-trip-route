"use client";

import { useState } from "react";
import type { Place } from "@/lib/route";
import styles from "./page.module.css";

type Category = "food" | "sights";
type Result = { places: Place[]; mapsUrl: string | null };

const CATS: { value: Category; label: string }[] = [
  { value: "food", label: "🍜 Ăn uống" },
  { value: "sights", label: "🏛️ Tham quan" },
];
const COUNTS = [3, 4, 5];

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("no-geo"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });
}

export default function Home() {
  const [category, setCategory] = useState<Category>("food");
  const [count, setCount] = useState(4);
  const [near, setNear] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function resetResult() {
    setResult(null);
    setError(null);
  }

  async function findRoute() {
    setLoading(true);
    setError(null);
    setResult(null);

    const place = near.trim();
    let body: Record<string, unknown>;
    if (place) {
      body = { near: place, category, count };
    } else {
      let pos: GeolocationPosition;
      try {
        pos = await getPosition();
      } catch {
        setError("Không lấy được vị trí. Bật định vị cho trình duyệt, hoặc gõ tên tỉnh/thành ở trên rồi thử lại nha.");
        setLoading(false);
        return;
      }
      body = { lat: pos.coords.latitude, lng: pos.coords.longitude, category, count };
    }

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header>
        <h1 className={styles.title}>Road Trip Route 🚗</h1>
        <p className={styles.sub}>Chọn kiểu đi chơi, bấm một phát là có tuyến.</p>
      </header>

      <button
        type="button"
        className={styles.optionsToggle}
        aria-expanded={showOptions}
        onClick={() => setShowOptions((v) => !v)}
      >
        <span>⚙️ {CATS.find((c) => c.value === category)?.label} · {count} điểm · {near.trim() || "Vị trí hiện tại"}</span>
        <span>{showOptions ? "▲" : "▼"}</span>
      </button>

      {showOptions && (
        <div className={styles.options}>
          <section>
            <p className={styles.label}>Tỉnh/thành (để trống dùng vị trí hiện tại)</p>
            <input
              className={styles.input}
              type="text"
              placeholder="VD: Đà Nẵng, Hội An…"
              value={near}
              onChange={(e) => { setNear(e.target.value); resetResult(); }}
            />
            <p className={styles.hint}>Gõ tên tỉnh/thành nếu muốn lên kế hoạch ở nơi khác, không cần đang đứng ở đó.</p>
          </section>

          <section>
            <p className={styles.label}>Đi đâu?</p>
            <div className={`${styles.row} ${styles.cats}`}>
              {CATS.map((c) => (
                <button key={c.value} className={styles.opt} aria-pressed={category === c.value} onClick={() => { setCategory(c.value); resetResult(); }}>
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className={styles.label}>Mấy điểm?</p>
            <div className={`${styles.row} ${styles.counts}`}>
              {COUNTS.map((n) => (
                <button key={n} className={styles.opt} aria-pressed={count === n} onClick={() => { setCount(n); resetResult(); }}>
                  {n}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      {result && result.places.length === 0 && (
        <p className={styles.empty}>Không tìm thấy chỗ nào đang mở quanh đây. Thử chủ đề khác xem sao.</p>
      )}

      {result && result.mapsUrl && (
        <>
          <button type="button" className={styles.retry} onClick={findRoute} disabled={loading}>
            {loading ? "Đang tìm…" : "↻ Tìm tuyến khác"}
          </button>
          <ol className={styles.list}>
            {result.places.map((p, i) => (
              <li key={p.id} className={styles.item}>
                <span className={styles.num}>{i + 1}</span>
                <div>
                  <p className={styles.name}>{p.name}</p>
                  {p.rating > 0 && (
                    <p className={styles.meta}>★ {p.rating.toFixed(1)} · {p.ratingCount.toLocaleString("vi-VN")} đánh giá</p>
                  )}
                  {p.address && <p className={styles.meta}>{p.address}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className={styles.ctaBar}>
        {result?.mapsUrl ? (
          <a className={styles.primary} href={result.mapsUrl} target="_blank" rel="noopener noreferrer">
            Mở Google Maps 🚗
          </a>
        ) : (
          <button className={styles.primary} onClick={findRoute} disabled={loading}>
            {loading ? "Đang tìm…" : "Tìm tuyến"}
          </button>
        )}
      </div>
    </main>
  );
}
