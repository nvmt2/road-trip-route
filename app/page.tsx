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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function findRoute() {
    setLoading(true);
    setError(null);
    setResult(null);
    let pos: GeolocationPosition;
    try {
      pos = await getPosition();
    } catch {
      setError("Không lấy được vị trí. Bật định vị cho trình duyệt rồi thử lại nha.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, category, count }),
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

      <section>
        <p className={styles.label}>Đi đâu?</p>
        <div className={`${styles.row} ${styles.cats}`}>
          {CATS.map((c) => (
            <button key={c.value} className={styles.opt} aria-pressed={category === c.value} onClick={() => setCategory(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className={styles.label}>Mấy điểm?</p>
        <div className={`${styles.row} ${styles.counts}`}>
          {COUNTS.map((n) => (
            <button key={n} className={styles.opt} aria-pressed={count === n} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <button className={styles.primary} onClick={findRoute} disabled={loading}>
        {loading ? "Đang tìm…" : "Tìm tuyến"}
      </button>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {result && result.places.length === 0 && (
        <p className={styles.empty}>Không tìm thấy chỗ nào đang mở quanh đây. Thử chủ đề khác xem sao.</p>
      )}

      {result && result.mapsUrl && (
        <>
          <a className={styles.go} href={result.mapsUrl} target="_blank" rel="noopener noreferrer">
            Mở Google Maps 🚗
          </a>
          <ol className={styles.list}>
            {result.places.map((p, i) => (
              <li key={p.id} className={styles.item}>
                <span className={styles.num}>{i + 1}</span>
                <div>
                  <p className={styles.name}>{p.name}</p>
                  <p className={styles.meta}>★ {p.rating.toFixed(1)} · {p.ratingCount.toLocaleString("vi-VN")} đánh giá</p>
                  {p.address && <p className={styles.meta}>{p.address}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
