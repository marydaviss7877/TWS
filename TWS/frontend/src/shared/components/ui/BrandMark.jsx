import React from 'react';

const VIEW_WIDTH = 1448;
const VIEW_HEIGHT = 1086;
const ASPECT_RATIO = VIEW_WIDTH / VIEW_HEIGHT;

/**
 * Official HousesBase mark — navy gateway with a terracotta-orange center
 * pane. Fills use the brand CSS variables (falling back to the official
 * navy/orange) so it follows theme tokens; `size` sets the rendered height,
 * width follows the mark's native 4:3 aspect ratio so it never stretches or
 * letterboxes.
 */
const BrandMark = ({ size = 24, className = '', title }) => {
  const width = Math.round(size * ASPECT_RATIO);

  return (
    <svg
      width={width}
      height={size}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M273 64 H1176 V1027 L976 921 V260 H821 V401 L626 503 V260 H473 V921 L273 1027 Z"
        fill="var(--wolfstack-primary, #103D67)"
      />
      <path d="M626 566 L820 462 L820 953 L626 873 Z" fill="var(--wolfstack-accent, #F04E25)" />
    </svg>
  );
};

export default BrandMark;
