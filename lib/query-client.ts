import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { DEFAULT_API_HOST } from "@/constants/config";

let warnedAboutFallback = false;

/**
 * Gets the base URL for the Express API server (e.g., "https://example.com/").
 *
 * Never throws: a missing `EXPO_PUBLIC_DOMAIN` falls back to `DEFAULT_API_HOST`
 * rather than surfacing an internal variable name to the user, which is what
 * v1.0.5 did in the login modal.
 */
export function getApiUrl(): string {
  const host = process.env.EXPO_PUBLIC_DOMAIN || DEFAULT_API_HOST;

  if (!process.env.EXPO_PUBLIC_DOMAIN && !warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      `EXPO_PUBLIC_DOMAIN is not set in this build; falling back to ${DEFAULT_API_HOST}. ` +
        "Set it in the EAS environment for this build profile.",
    );
  }

  return new URL(`https://${host}`).href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
