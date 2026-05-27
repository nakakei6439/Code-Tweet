"use client";

export type GenerateTabKey = "tweet" | "note";

type Props = {
  activeTab: GenerateTabKey;
  onChange: (next: GenerateTabKey) => void;
};

function pillClass(active: boolean) {
  return active
    ? "bg-white text-gray-900 shadow-sm"
    : "text-gray-300 hover:text-white";
}

export default function GenerateTabs({ activeTab, onChange }: Props) {
  return (
    <div className="mb-8 flex justify-center">
      <div
        role="tablist"
        aria-label="生成モード"
        className="inline-flex rounded-full border border-gray-700 bg-gray-900/60 p-1 shadow-inner shadow-black/20"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tweet"}
          onClick={() => onChange("tweet")}
          className={`px-5 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${pillClass(activeTab === "tweet")}`}
        >
          Code Tweet
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "note"}
          onClick={() => onChange("note")}
          className={`px-5 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${pillClass(activeTab === "note")}`}
        >
          note Draft
        </button>
      </div>
    </div>
  );
}
