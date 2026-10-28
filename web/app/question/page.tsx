"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuestionCard, { type Question } from "../components/QuestionCard";
import Icon from "../components/Icon";

export default function QuestionDetailPage() {
  return (
    <Suspense fallback={<div className="text-[var(--fg-muted)]">加载中...</div>}>
      <QuestionDetailContent />
    </Suspense>
  );
}

function QuestionDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestion() {
      const id = searchParams?.get("id");
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/question/${id}`);
        if (!res.ok) throw new Error("题目加载失败");
        const data = await res.json();
        setQuestion(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "题目加载失败");
      } finally {
        setLoading(false);
      }
    }
    fetchQuestion();
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {loading && (
        <div className="card p-4 animate-pulse">
          <div className="h-4 bg-[var(--chip)] rounded w-1/4 mb-3" />
          <div className="h-4 bg-[var(--chip)] rounded w-full mb-2" />
          <div className="h-4 bg-[var(--chip)] rounded w-3/4" />
        </div>
      )}

      {error && (
        <div className="card p-4 border-[var(--accent)]">
          <p className="text-sm text-[var(--accent-text)]">{error}</p>
        </div>
      )}

      {!loading && !error && question && (
        <QuestionCard question={question} />
      )}
    </div>
  );
}