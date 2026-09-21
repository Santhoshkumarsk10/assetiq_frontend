/**
 * Email validation and sanitization utility
 * Rules:
 * - Only ONE '@' symbol allowed in the entire string.
 * - Only ONE or standard dot sequence in domain part (e.g., name@gmail.com, name@company.co.in).
 * - No special characters allowed anywhere in the email except '@' and '.' (blocks &, %, $, #, !, ^, *, etc.).
 * - Must follow standard email pattern: localpart@domain.extension (e.g., name@gmail.com, name@company.co.in).
 * - Maximum length 100 characters.
 */

export const sanitizeEmailInput = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-zA-Z0-9@.]/g, '');
};

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;

  // 1. No special characters allowed anywhere in the email except '@' and '.'
  if (/[^a-zA-Z0-9@.]/.test(trimmed)) return false;

  // 2. Only ONE '@' symbol allowed in the entire string
  const atParts = trimmed.split('@');
  if (atParts.length !== 2) return false;
  const [localPart, domainPart] = atParts;

  // 3. Local part check: non-empty, alphanumeric and optional single dots (no start/end dot, no consecutive dots)
  if (!localPart || !/^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$/.test(localPart)) return false;

  // 4. Domain part check: non-empty, must follow standard pattern domain.extension (e.g. name@gmail.com, name@company.co.in)
  // Must have at least one dot in domain part, domain labels alphanumeric, TLD letters of length >= 2
  if (!domainPart || !/^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/.test(domainPart)) return false;

  return true;
};
