"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/route";
import { mockIntro } from "@/lib/narration";
import { loadHistory, loadPreferences, recordSearch, savePreferences, suggestedDefaults, type Budget } from "@/lib/preferences";
import styles from "./page.module.css";

type Category = "food" | "sights";
type Result = { places: Place[]; mapsUrl: string | null };

const CATS: { value: Category; label: string }[] = [
  { value: "food", label: "🍜 Ăn uống" },
  { value: "sights", label: "🏛️ Tham quan" },
];
const COUNTS = [3, 4, 5];
const BUDGETS: { value: Budget; label: string }[] = [
  { value: "low", label: "💰 Rẻ" },
  { value: "mid", label: "💰 Vừa" },
  { value: "high", label: "💰 Sang" },
];

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
  const [budget, setBudget] = useState<Budget | null>(null);
  const [vegetarian, setVegetarian] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [narratingIndex, setNarratingIndex] = useState<number | null>(null);

  // Load saved preferences and quietly default category/location to what
  // you search for most often — one less thing to set every time.
  useEffect(() => {
    const prefs = loadPreferences();
    setBudget(prefs.budget);
    setVegetarian(prefs.vegetarian);
    const defaults = suggestedDefaults(loadHistory());
    if (defaults.category) setCategory(defaults.category);
    if (defaults.near) setNear(defaults.near);
  }, []);

  function resetResult() {
    setResult(null);
    setError(null);
    setNarratingIndex(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  // SPIKE: narrate each stop's (mock) intro, one after another, as soon as
  // a route comes back — no real-time location tracking, just "tell me
  // about these places before I start driving".
  useEffect(() => {
    if (!result || result.places.length === 0) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setNarratingIndex(0);
    return () => window.speechSynthesis.cancel();
  }, [result]);

  useEffect(() => {
    if (narratingIndex === null || !result) return;
    const place = result.places[narratingIndex];
    if (!place) {
      setNarratingIndex(null);
      return;
    }
    const utter = new SpeechSynthesisUtterance(mockIntro(place, category));
    utter.lang = "vi-VN";
    utter.onend = () => setNarratingIndex((i) => (i === null ? null : i + 1));
    window.speechSynthesis.speak(utter);
    return () => window.speechSynthesis.cancel();
  }, [narratingIndex, result, category]);

  function stopNarration() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setNarratingIndex(null);
  }

  async function findRoute() {
    setLoading(true);
    setError(null);
    setResult(null);

    const place = near.trim();
    const filters = { budget: budget ?? undefined, vegetarian };
    let body: Record<string, unknown>;
    if (place) {
      body = { near: place, category, count, ...filters };
    } else {
      let pos: GeolocationPosition;
      try {
        pos = await getPosition();
      } catch {
        setError("Không lấy được vị trí. Bật định vị cho trình duyệt, hoặc gõ tên tỉnh/thành ở trên rồi thử lại nha.");
        setLoading(false);
        return;
      }
      body = { lat: pos.coords.latitude, lng: pos.coords.longitude, category, count, ...filters };
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
      recordSearch({ category, near: place, at: Date.now() });
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

          <section>
            <p className={styles.label}>Sở thích</p>
            <div className={`${styles.row} ${styles.counts}`}>
              {BUDGETS.map((b) => (
                <button
                  key={b.value}
                  className={styles.opt}
                  aria-pressed={budget === b.value}
                  onClick={() => {
                    const next = budget === b.value ? null : b.value;
                    setBudget(next);
                    savePreferences({ budget: next, vegetarian });
                    resetResult();
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`${styles.opt} ${styles.vegToggle}`}
              aria-pressed={vegetarian}
              onClick={() => {
                const next = !vegetarian;
                setVegetarian(next);
                savePreferences({ budget, vegetarian: next });
                resetResult();
              }}
            >
              🌱 Ăn chay
            </button>
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

          {narratingIndex !== null && result.places[narratingIndex] && (
            <div className={styles.narration}>
              <span>🔊 Đang giới thiệu: {result.places[narratingIndex].name}</span>
              <button type="button" className={styles.stop} onClick={stopNarration}>⏹ Dừng</button>
            </div>
          )}

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
