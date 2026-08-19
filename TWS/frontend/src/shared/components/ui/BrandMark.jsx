import React from 'react';

/**
 * Website logo mark based on the supplied SVG brand asset.
 * The original brand icon uses explicit fill colors, so this component stays
 * as a direct SVG rather than inheriting currentColor from the parent theme.
 */
const BrandMark = ({ size = 24, className = '', title, simple = false }) => {
  return (
   <svg
     width={size}
     height={size}
     viewBox="0 0 1448 1086"
     className={className}
     role={title ? 'img' : undefined}
     aria-hidden={title ? undefined : true}
     aria-label={title}
     preserveAspectRatio="xMidYMid meet"
   >
     {title ? <title>{title}</title> : null}
     {/* Transparent background so logo adapts to light/dark surfaces */}
     {/* Main mark uses CSS variables so it follows theme tokens */}
     <path
       d="
         M273 64
         H1176
         V1027
         L976 921
         V260
         H821
         V401
         L626 503
         V260
         H473
         V921
         L273 1027
         Z
       "
       fill="var(--wolfstack-primary, #103D67)"
     />
     <path
       d="
         M626 566
         L820 462
         L820 953
         L626 873
         Z
       "
       fill="var(--wolfstack-accent, #F04E25)"
     />
   </svg>
  );
};

export default BrandMark;
