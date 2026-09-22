import type { ReactNode } from "react";

export function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#17424c] bg-[#062630] p-5 transition duration-200 hover:border-[#24606b]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#7ea5af]">{title}</p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs text-[#68858e]">{detail}</p>
    </div>
  );
}

export function ChannelRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#17424c]/70 bg-[#031c26]/60 px-4 py-3">
      <span className="text-sm text-[#9db9c0]">{name}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

/** Esqueleto gris mientras llegan los datos. */
export function SkeletonCard({ className = "h-[118px]" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-[#17424c] bg-[#062630] ${className}`}
    />
  );
}
