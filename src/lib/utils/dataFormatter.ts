
export const formatDate = (timestamp: number | string | Date): string => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = (timestamp: number | string | Date): string => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const maskEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
