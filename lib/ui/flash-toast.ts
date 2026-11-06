const FLASH_TOAST_KEY = "rememberme:flash-toast";

/** Stash a one-shot message to show after navigation (e.g. home after save). */
export function setFlashToast(message: string) {
  try {
    sessionStorage.setItem(FLASH_TOAST_KEY, message);
  } catch {
    // private mode / unavailable
  }
}

/** Read and clear any pending flash toast. */
export function consumeFlashToast(): string | null {
  try {
    const message = sessionStorage.getItem(FLASH_TOAST_KEY);
    if (message) sessionStorage.removeItem(FLASH_TOAST_KEY);
    return message;
  } catch {
    return null;
  }
}
