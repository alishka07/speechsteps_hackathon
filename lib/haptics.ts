const pulse = (duration: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(duration);
};
/** Лёгкая тактильная отдача в браузерах, где поддерживается Vibration API. */
export const haptics = { success: () => pulse([25, 35, 25]), warning: () => pulse(45), tap: () => pulse(12), select: () => pulse(10) };
