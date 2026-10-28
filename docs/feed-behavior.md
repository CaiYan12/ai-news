# Feed behavior and verification

The built-in source is `juya-daily` at `https://daily.juya.uk/rss.xml`. A failed live request falls back to the bundled `/ai-news/snapshot/juya.xml` and identifies it as an offline snapshot. The snapshot is part of the deployed application, not a promise that a first visit works without a network: the application and its assets must still load, and snapshot images may be remote.

The pre-extraction application left the refresh button disabled after a successful live fetch. This migration resets the refresh state on success so a reader can refresh again; the fetch and fallback strategy is otherwise unchanged.

Run `pnpm build` followed by `pnpm test:feed` to exercise the production build with controlled RSS responses in an isolated Chromium context. The test records browser errors and network requests, including the deliberately induced 503 and 404 responses.
