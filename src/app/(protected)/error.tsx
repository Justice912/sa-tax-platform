"use client";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-7 shadow-lg text-center">
        <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-600">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
