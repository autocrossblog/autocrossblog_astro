import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import icon from 'astro-icon';
import compress from 'astro-compress';
import type { AstroIntegration } from 'astro';

import astrowind from './vendor/integration';

import { readingTimeRemarkPlugin, responsiveTablesRehypePlugin, lazyImagesRehypePlugin } from './src/utils/frontmatter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Utility function for conditional integrations
const hasExternalScripts = false;
const whenExternalScripts = (items: (() => AstroIntegration) | (() => AstroIntegration)[] = []) =>
  hasExternalScripts ? (Array.isArray(items) ? items.map((item) => item()) : [items()]) : [];

export default defineConfig({
  output: 'static',

  integrations: [
    tailwind({
      applyBaseStyles: false, // Disable Tailwind's base styles if already managed
    }),
    sitemap(), // Generate a sitemap
    mdx(), // Enable Markdown with MDX support
    icon({
      include: {
        tabler: ['*'], // Include all Tabler icons
        'flat-color-icons': [
          'template',
          'gallery',
          'approval',
          'document',
          'advertising',
          'currency-exchange',
          'voice-presentation',
          'business-contact',
          'database',
        ],
      },
    }),
    ...whenExternalScripts(() =>
      partytown({
        config: { forward: ['dataLayer.push'] }, // Forward Google Analytics events
      })
    ),
    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false, // Keep attribute quotes for compatibility
        },
      },
      Image: true, // Enable image compression for better performance
      JavaScript: true,
      SVG: true,
      Logger: 1, // Enable minimal logging for compress
    }),
    astrowind({
      config: './src/config.yaml', // Configuration for Astrowind
    }),
  ],

  // Configure Astro's image optimization
  image: {
    domains: ['cdn.pixabay.com'], // Whitelist domains for remote image optimization
    service: {
      sharp: true, // Explicitly use `sharp` for image processing (faster and efficient)
    },
  },

  // Markdown configuration
  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin], // Add reading time to Markdown frontmatter
    rehypePlugins: [
      responsiveTablesRehypePlugin, // Enable responsive tables
      lazyImagesRehypePlugin, // Lazily load images in Markdown
    ],
  },

  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'), // Alias for cleaner imports
      },
    },
    optimizeDeps: {
      include: ['astro-icon'], // Pre-bundle Astro Icon for better performance
    },
    server: {
      fs: {
        allow: [
          './src',
          './vendor',
          './node_modules', // Allow serving files from node_modules
          path.resolve(__dirname, 'node_modules'), // Explicitly allow the node_modules directory
        ],
      },
    },
  },
});
