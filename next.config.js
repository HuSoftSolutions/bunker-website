/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config, { dev, webpack }) {
    if (dev) {
      // pdfjs-dist ships a bundle that declares `var __webpack_exports__`.
      // With webpack's eval-based devtools, those vars get hoisted inside the eval and can
      // shadow webpack's injected ESM prolog, causing `__webpack_require__.r(__webpack_exports__)`
      // to run with a non-object exports target at runtime.
      //
      // Next can still inject EvalSourceMapDevToolPlugin even if `config.devtool` is changed,
      // so remove it explicitly and use external source maps instead.
      config.devtool = false;
      config.plugins = (config.plugins || []).filter(
        (plugin) => plugin?.constructor?.name !== "EvalSourceMapDevToolPlugin",
      );
      config.plugins.push(
        new webpack.SourceMapDevToolPlugin({
          filename: "[file].map",
          // Keep sources stable for better debugging without eval wrappers.
          moduleFilenameTemplate: "[resource-path]",
        }),
      );
    }
    return config;
  },
};

module.exports = nextConfig;
