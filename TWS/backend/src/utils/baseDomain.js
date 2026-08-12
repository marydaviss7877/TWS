/**
 * Returns process.env.BASE_DOMAIN stripped of protocol, trailing slashes, and
 * whitespace (Railway env vars can have trailing \n or a full URL pasted in
 * instead of a bare domain — see the same sanitization in cookieSecurity.js).
 */
function getSanitizedBaseDomain() {
  const raw = process.env.BASE_DOMAIN || 'housesbase.com';
  return raw.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
}

module.exports = { getSanitizedBaseDomain };
