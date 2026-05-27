import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "READMEからnote Draftを作る",
  description: "GitHubリポジトリやプロジェクト説明から、note.com にコピー＆ペーストできる紹介記事の Draft を生成します。",
};

export default function NotePage() {
  redirect("/?tab=note");
}
