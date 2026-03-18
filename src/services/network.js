const DEFAULT_CONNECTIVITY_URL =
  import.meta.env.VITE_CONNECTIVITY_CHECK_URL || 'https://www.gstatic.com/generate_204';

const withTimeout = (timeoutMs = 4000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
};

const checkInternetConnection = async ({ timeoutMs = 4000 } = {}) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const { signal, clear } = withTimeout(timeoutMs);

  try {
    await fetch(DEFAULT_CONNECTIVITY_URL, {
      method: 'GET',
      cache: 'no-store',
      mode: 'no-cors',
      signal,
    });

    return true;
  } catch {
    return false;
  } finally {
    clear();
  }
};

export { checkInternetConnection };
