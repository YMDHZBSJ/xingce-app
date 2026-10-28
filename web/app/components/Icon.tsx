"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import type { SVGProps } from "react";

export type IconName =
  | "search"
  | "chart"
  | "graph"
  | "pencil"
  | "clipboard"
  | "timer"
  | "chevron-down"
  | "chevron-right"
  | "check"
  | "alert"
  | "book"
  | "arrow-left"
  | "arrow-right";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

/**
 * 自制图标系统：统一 1.75 描边、round linecap、24 视图框。
 * 不使用 emoji 代替图标。
 */
export default function Icon({ name, size = 18, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V6" />
          <path d="M4 20h16" />
          <rect x="7.5" y="12" width="3" height="5" rx="1" />
          <rect x="12.5" y="8.5" width="3" height="8.5" rx="1" />
          <rect x="17" y="10.5" width="3" height="6.5" rx="1" />
        </svg>
      );
    case "graph":
      return (
        <svg {...common}>
          <circle cx="12" cy="5.5" r="2.2" />
          <circle cx="5.5" cy="17" r="2.2" />
          <circle cx="18.5" cy="17" r="2.2" />
          <path d="M10.4 7.4 6.8 15" />
          <path d="m13.6 7.4 3.6 7.6" />
          <path d="M7.7 17h8.6" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common}>
          <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4 16.5Z" />
          <path d="m13.5 7.5 3 3" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect x="6" y="4.5" width="12" height="16" rx="2" />
          <path d="M9.5 4.5V3.8A1.3 1.3 0 0 1 10.8 2.5h2.4a1.3 1.3 0 0 1 1.3 1.3v.7" />
          <path d="M9 10h6M9 13.5h6M9 17h3.5" />
        </svg>
      );
    case "timer":
      return (
        <svg {...common}>
          <circle cx="12" cy="13.5" r="7.2" />
          <path d="M12 10v4l2.4 1.6" />
          <path d="M9.5 2.8h5" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <path d="m9.5 6 6 6-6 6" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="m8.4 12.2 2.5 2.5 4.7-5" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 4.2 3.4 19h17.2L12 4.2Z" />
          <path d="M12 9.6v3.8" />
          <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.2A1.7 1.7 0 0 1 5.7 3.5H10a2 2 0 0 1 2 2v14a1.6 1.6 0 0 0-1.6-1.6H5.7A1.7 1.7 0 0 1 4 16.2Z" />
          <path d="M20 5.2a1.7 1.7 0 0 0-1.7-1.7H14a2 2 0 0 0-2 2v14a1.6 1.6 0 0 1 1.6-1.6h4.7A1.7 1.7 0 0 0 20 16.2Z" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m10.5 6-6 6 6 6" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13.5 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}
