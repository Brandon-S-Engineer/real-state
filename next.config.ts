import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB trae un binario nativo (.node). Sin esto, Webpack intenta parsearlo
  // como si fuera JavaScript y el build revienta con "Module parse failed:
  // Unexpected character". Declararlo externo hace que se cargue con el require
  // de Node en tiempo de ejecución, que es como debe cargarse.
  // Solo lo usa la sección /trading, que por diseño corre en localhost.
  serverExternalPackages: ["@duckdb/node-api"],
};

export default nextConfig;
