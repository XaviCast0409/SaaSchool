export const isValidPhone = (phone: string) =>
  /^9\d{8}$/.test(phone.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, ''));

export const utmSource = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('utm_source');
  } catch {
    return null;
  }
};
