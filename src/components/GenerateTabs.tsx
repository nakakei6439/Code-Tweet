"use client";

export type GenerateTabKey = "tweet" | "note";

type Props = {
  activeTab: GenerateTabKey;
  onChange: (next: GenerateTabKey) => void;
};

function tabClass(active: boolean) {
  return active
    ? "text-white border-cyan-500"
    : "text-gray-400 border-transparent hover:text-gray-200";
}

export default function GenerateTabs({ activeTab, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="生成モード"
      className="mb-6 flex items-center justify-center gap-2 border-b border-gray-800"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "tweet"}
        onClick={() => onChange("tweet")}
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tabClass(activeTab === "tweet")}`}
      >
        Code Tweet
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "note"}
        onClick={() => onChange("note")}
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tabClass(activeTab === "note")}`}
      >
        note Draft
      </button>
    </div>
  );
}
