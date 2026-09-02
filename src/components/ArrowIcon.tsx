import { cx } from "@/components/uiStyles";

const arrowPaths = {
  right: "M2 8h12M9 3l5 5-5 5",
  left: "M14 8H2m5-5L2 8l5 5",
  up: "M4 14V2M1 5l3-3 3 3",
  down: "M4 2v12m-3-3 3 3 3-3"
} as const;

export function ArrowIcon({
  className,
  direction = "right"
}: {
  className?: string;
  direction?: keyof typeof arrowPaths;
}) {
  const vertical = direction === "up" || direction === "down";

  return (
    <svg
      aria-hidden="true"
      className={cx("inline-block align-[-0.125em]", className)}
      fill="none"
      focusable="false"
      height="1em"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth={2}
      viewBox={vertical ? "0 0 8 16" : "0 0 16 16"}
      width={vertical ? "0.5em" : "1em"}
    >
      <path d={arrowPaths[direction]} />
    </svg>
  );
}
