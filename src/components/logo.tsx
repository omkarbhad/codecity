/**
 * CodeCity mark: a pixel skyline on the lime tile (source: public/brand/logo-mark.svg).
 * Size it with className, e.g. `size-6`.
 */
export const LogoMark = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    role="img"
    aria-label="CodeCity"
    className={`shrink-0 ${className}`}
  >
    <rect width="16" height="16" fill="#c8e64a" />
    <g fill="#131209">
      <rect x="2" y="7" width="3" height="6" />
      <rect x="6" y="5" width="4" height="8" />
      <rect x="7" y="2" width="2" height="3" />
      <rect x="11" y="4" width="3" height="9" />
    </g>
    <g fill="#c8e64a">
      <rect x="3" y="9" width="1" height="1" />
      <rect x="7" y="7" width="1" height="1" />
      <rect x="8" y="10" width="1" height="1" />
      <rect x="12" y="6" width="1" height="1" />
      <rect x="12" y="9" width="1" height="1" />
    </g>
  </svg>
)
