export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isStandalone = (): boolean => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any)?.standalone === true
  );
};

export const isInstallable = (): boolean => {
  return !isStandalone() && !isIOS();
};

export const getInstallPromptDismissedTime = (): number | null => {
  const dismissedTimestamp = localStorage.getItem("pwa-install-dismissed");
  return dismissedTimestamp ? parseInt(dismissedTimestamp) : null;
};

export const shouldShowInstallPrompt = (): boolean => {
  const dismissedTime = getInstallPromptDismissedTime();
  if (!dismissedTime) return true;

  const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
  return hoursSinceDismissed >= 24; // Show again after 24 hours
};
