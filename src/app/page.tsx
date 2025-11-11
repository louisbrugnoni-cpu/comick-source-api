"use client";

import { useEffect, useState } from "react";

interface Source {
  id: string;
  name: string;
  baseUrl: string;
  description?: string;
  clientOnly?: boolean;
}

interface SourceHealth {
  status: "healthy" | "cloudflare" | "timeout" | "error";
  message: string;
  responseTime?: number;
  lastChecked: string;
}

interface EndpointProps {
  method: string;
  path: string;
  description: string;
  request?: string;
  response: string;
}

const endpoints: EndpointProps[] = [
  {
    method: "GET",
    path: "/api/sources",
    description: "Retrieve list of available sources",
    response: `{
  "sources": [
    {
      "id": "mangapark",
      "name": "MangaPark",
      "baseUrl": "https://mangapark.io",
      "description": "MangaPark - https://mangapark.io"
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/search",
    description: "Search for manga across one or all sources",
    request: `{
  "query": "solo leveling",
  "source": "mangapark"  // or "all" for all sources
}`,
    response: `{
  "results": [
    {
      "id": "343921",
      "title": "Solo Leveling",
      "url": "https://mangapark.io/title/75577-en-solo-leveling",
      "coverImage": "https://...",
      "latestChapter": 179,
      "lastUpdated": "2 days ago"
    }
  ],
  "source": "MangaPark"
}`,
  },
  {
    method: "POST",
    path: "/api/chapters",
    description: "Get chapter list for a manga",
    request: `{
  "url": "https://mangapark.io/title/75577-en-solo-leveling",
  "source": "mangapark"  // optional
}`,
    response: `{
  "chapters": [
    {
      "id": "1",
      "number": 1,
      "title": "Chapter 1",
      "url": "https://..."
    }
  ],
  "source": "MangaPark",
  "totalChapters": 179
}`,
  },
  {
    method: "GET",
    path: "/api/health",
    description: "Check health status of all sources (cached for 5 minutes)",
    response: `{
  "sources": {
    "mangapark": {
      "status": "healthy",
      "message": "Source is operational",
      "responseTime": 1234,
      "lastChecked": "2025-01-08T..."
    }
  }
}`,
  },
];

function MethodBadge({ method }: { method: string }) {
  const styles = {
    GET: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
    POST: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
  };

  return (
    <span
      className={`px-2.5 py-1 text-xs font-medium rounded-md ${
        styles[method as keyof typeof styles] || styles.GET
      }`}
    >
      {method}
    </span>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointProps }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 md:p-6 bg-white dark:bg-zinc-900/30">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <MethodBadge method={endpoint.method} />
        <code className="text-base md:text-lg font-mono text-zinc-900 dark:text-zinc-100 break-all">
          {endpoint.path}
        </code>
      </div>

      <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm md:text-base">
        {endpoint.description}
      </p>

      {endpoint.request && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-500 mb-2">
            REQUEST BODY
          </h4>
          <div className="bg-zinc-900 dark:bg-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs sm:text-sm">
              <code className="text-zinc-100">{endpoint.request}</code>
            </pre>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-500 mb-2">
          RESPONSE
        </h4>
        <div className="bg-zinc-900 dark:bg-zinc-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs sm:text-sm">
            <code className="text-zinc-100">{endpoint.response}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [sources, setSources] = useState<Source[]>([]);
  const [health, setHealth] = useState<Record<string, SourceHealth>>({});
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    // Fetch sources
    fetch("/api/sources")
      .then((res) => res.json())
      .then((data) => {
        setSources(data.sources || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load sources:", err);
        setLoading(false);
      });

    // Fetch health status
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHealth(data.sources || {});
        setHealthLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load health:", err);
        setHealthLoading(false);
      });
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "healthy":
        return "bg-emerald-500";
      case "cloudflare":
        return "bg-yellow-500";
      case "timeout":
        return "bg-orange-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-zinc-600";
    }
  };

  const getStatusTextColor = (status?: string) => {
    switch (status) {
      case "healthy":
        return "text-emerald-400";
      case "cloudflare":
        return "text-yellow-400";
      case "timeout":
        return "text-orange-400";
      case "error":
        return "text-red-400";
      default:
        return "text-zinc-500";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "healthy":
        return "Operational";
      case "cloudflare":
        return "Cloudflare Protected";
      case "timeout":
        return "Slow/Timeout";
      case "error":
        return "Error";
      default:
        return "Checking...";
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <header className="mb-12 md:mb-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 md:mb-6 tracking-tight">
            Comick Source API
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            RESTful API for manga and comic metadata. Search across multiple
            sources, retrieve chapter listings, and monitor source health.
          </p>
        </header>

        <section className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 md:mb-8">
            Endpoints
          </h2>
          <div className="space-y-4 md:space-y-6">
            {endpoints.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </div>
        </section>

        <section className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 md:mb-8">
            Available Sources
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sources.map((source) => {
                const sourceHealth = health[source.id];
                const statusColor = getStatusColor(sourceHealth?.status);
                const statusLabel = getStatusLabel(sourceHealth?.status);

                return (
                  <div
                    key={source.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 md:p-6 bg-white dark:bg-zinc-900/30"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {source.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {healthLoading ? (
                          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 dark:bg-zinc-600"></div>
                        ) : (
                          <div
                            className={`h-2 w-2 rounded-full ${statusColor}`}
                            title={sourceHealth?.message || "Unknown"}
                          ></div>
                        )}
                      </div>
                    </div>

                    <a
                      href={source.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400 transition-colors break-all mb-3"
                    >
                      {source.baseUrl}
                    </a>

                    {sourceHealth && (
                      <div className="flex items-center justify-between text-xs border-t border-zinc-200 dark:border-zinc-800 pt-3">
                        <span
                          className={getStatusTextColor(sourceHealth.status)}
                        >
                          {statusLabel}
                        </span>
                        {sourceHealth.responseTime && (
                          <span className="text-zinc-500 dark:text-zinc-500">
                            {sourceHealth.responseTime}ms
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
