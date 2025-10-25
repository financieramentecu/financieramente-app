export const timeout = 5000;

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};
