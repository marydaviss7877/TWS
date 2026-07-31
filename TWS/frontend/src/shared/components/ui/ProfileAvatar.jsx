import React, { useEffect, useState } from 'react';

export const resolveProfilePictureUrl = (rawUrl, tenantSlug) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  if (/^(https?:|data:|blob:)/i.test(rawUrl)) return rawUrl;
  const uploadMatch = rawUrl.match(/\/uploads\/profile-pictures\/[^/?#]+/);
  if (uploadMatch) return uploadMatch[0];
  if (rawUrl.startsWith('/api/tenant/')) return rawUrl;
  if (rawUrl.startsWith('uploads/profile-pictures/')) return `/${rawUrl}`;
  return tenantSlug
    ? `/api/tenant/${tenantSlug}/organization/uploads/profile-pictures/${rawUrl.replace(/^\/+/, '')}`
    : null;
};

const getName = (person) =>
  person?.fullName || person?.name || person?.email ||
  person?.userId?.fullName || person?.userId?.name || person?.userId?.email ||
  'User';

const getPicture = (person) =>
  person?.profilePicUrl || person?.avatarUrl || person?.avatar ||
  person?.userId?.profilePicUrl || person?.userId?.avatarUrl || person?.userId?.avatar;

const getInitials = (name) => String(name || 'U')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part.charAt(0))
  .join('')
  .toUpperCase() || 'U';

const ProfileAvatar = ({
  person,
  tenantSlug,
  className = 'h-10 w-10 rounded-full',
  imageClassName = '',
  fallbackClassName = 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  alt,
}) => {
  const [failed, setFailed] = useState(false);
  const name = getName(person);
  const src = resolveProfilePictureUrl(getPicture(person), tenantSlug);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt || `${name} profile`}
        className={`${className} object-cover ${imageClassName}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={`${className} ${fallbackClassName} inline-flex shrink-0 items-center justify-center font-semibold`}>
      {getInitials(name)}
    </span>
  );
};

export default ProfileAvatar;
