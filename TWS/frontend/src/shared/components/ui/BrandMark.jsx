import React from 'react';

/**
 * HouseBase mark: two columns and a footing wider than what stands on it —
 * an H, not a house. Renders in `currentColor`; set `color` on an ancestor
 * (or pass `className`) to theme it. Dimension line is dropped below 24px
 * via the `simple` prop, per the brand kit's minimum-size rule.
 */
const BrandMark = ({ size = 24, simple = false, className = '', title }) => {
  const objectWidth = simple ? 9 : 8;
  const footingWidth = simple ? 12 : 10;
  const footingX1 = simple ? 22 : 24;
  const footingX2 = simple ? 98 : 96;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <line x1="38" y1="18" x2="38" y2="90" stroke="currentColor" strokeWidth={objectWidth} strokeLinecap="round" />
      <line x1="82" y1="18" x2="82" y2="90" stroke="currentColor" strokeWidth={objectWidth} strokeLinecap="round" />
      <line x1={footingX1} y1="66" x2={footingX2} y2="66" stroke="currentColor" strokeWidth={footingWidth} strokeLinecap="round" />
      {!simple && (
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" opacity="0.55">
          <line x1="24" y1="102" x2="96" y2="102" />
          <line x1="24" y1="97" x2="24" y2="107" />
          <line x1="96" y1="97" x2="96" y2="107" />
          <line x1="60" y1="99" x2="60" y2="105" />
        </g>
      )}
    </svg>
  );
};

export default BrandMark;
