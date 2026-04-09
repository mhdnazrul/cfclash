export const GITHUB_PROFILE_URL =
  (import.meta.env.VITE_GITHUB_PROFILE_URL as string | undefined) || "https://github.com/mhdnazrul";

export const GITHUB_ISSUES_URL =
  (import.meta.env.VITE_GITHUB_ISSUES_URL as string | undefined) ||
  `${GITHUB_PROFILE_URL.replace(/\/$/, "")}/issues`;

export const SITE_AUTHOR = "Nazrul Islam";
