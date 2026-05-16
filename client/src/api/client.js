const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("atomquest_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}

export function reportUrl(format = "csv", params = {}) {
  const search = new URLSearchParams(params);
  return `${API_URL}/reports/achievements.${format}?${search.toString()}`;
}
