import type { Place } from "./route";

// SPIKE: placeholder copy until a real content source (AI-generated or
// Wikipedia-backed) is wired up — just enough to test the TTS UX.
const TEMPLATES: Record<"food" | "sights", (p: Place) => string> = {
  food: (p) =>
    `${p.name} là một điểm ăn uống đáng ghé qua${p.address ? `, nằm ở ${p.address}` : ""}. Một lựa chọn hay để nạp năng lượng trên hành trình của bạn.`,
  sights: (p) =>
    `${p.name} là một điểm tham quan thú vị${p.address ? `, nằm ở ${p.address}` : ""}. Đáng để dừng chân khám phá trước khi đi tiếp.`,
};

export function mockIntro(place: Place, category: "food" | "sights"): string {
  return TEMPLATES[category](place);
}
