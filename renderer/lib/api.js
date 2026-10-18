export const LOGIN_URL = "https://backend-for-drawing-school.vercel.app";
export const AUTH_LOGIN_API = "https://backend-for-drawing-school.vercel.app/api/auth/login";
export const WHATSAPP_VERIFY_SETUP_API = "https://backend-for-drawing-school.vercel.app/api/whatsapp/embedded-signup/send";

export const setServerIpAddress = (ip) => {
  if (typeof window !== "undefined") {
    window.serverIpAddress = ip;
    localStorage.setItem("serverIpAddress", ip);
  }
};

export const getServerIpAddress = () => {
  if (typeof window !== "undefined") {
    return window.serverIpAddress || localStorage.getItem("serverIpAddress");
  }
  return null;
};

export const getSystemId = () => {
  if (typeof window === "undefined") return null;
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user?.systemUserId || user?.systemId || user?.userId || user?._id || user?.id || null;
  } catch (e) {
    return null;
  }
};

export const fetchApi = async (path, options = {}) => {
  const localhostUrl = `http://localhost:49215/api${path}`;
  console.log(localhostUrl, "path", path);
  
  // Inject multi-tenant system ID
  const systemId = getSystemId();
  if (systemId) {
    options.headers = {
      ...(options.headers || {}),
      'x-system-id': String(systemId).trim()
    };
  }

  try {
    // Attempt to connect to localhost first
    const res = await fetch(localhostUrl, options);
    return res;
  } catch (error) {
    // If localhost fails (e.g. network error, connection refused), fallback to the local IP
    const ip = getServerIpAddress();
    if (ip) {
      console.warn(`Localhost failed. Falling back to IP: ${ip}`);
      return fetch(`http://${ip}${path}`, options);
    }
    console.log(error);
    throw error;
  }
};
