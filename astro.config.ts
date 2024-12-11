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
      applyBaseStyles: false,
    }),
    sitemap(),
    mdx({
      extendDefaultComponents: {
        WindImage: '~/components/common/WindImage.astro',
      },
    }),
    icon({
      include: {
        tabler: ['*'],
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
        config: { forward: ['dataLayer.push'] },
      })
    ),
    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: true,
      Logger: 1, // Minimal logging for compress
     // hooks: {
     //   onCompressionStart: (file) => console.log(`Compressing: ${file}`),
     //   onCompressionEnd: (file) => console.log(`Finished: ${file}`),
     // },
    }),
    astrowind({
      config: './src/config.yaml',
    }),
  ],

  image: {
    domains: ['cdn.pixabay.com'],
    service: {
      sharp: true,
    },
  },

  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin],
    rehypePlugins: [
      responsiveTablesRehypePlugin,
      lazyImagesRehypePlugin,
    ],
  },

  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['astro-icon'],
    },
    server: {
      fs: {
        allow: [
          './src',
          './vendor',
          './node_modules',
          path.resolve(__dirname, 'node_modules'),
        ],
      },
    },
    build: {
      rollupOptions: {
        plugins: [
          {
            name: 'log-build',
            buildStart() {
              console.log('Build started...');
            },
            generateBundle(_, bundle) {
              console.log('Generating bundle...');
              for (const [fileName, output] of Object.entries(bundle)) {
                console.log(`Processing file: ${fileName}, type: ${output.type}`);
              }
            },
          },
          {
            name: 'track-image-processing',
            load(id) {
              if (/\.(png|jpe?g|webp|svg|gif)$/i.test(id)) {
                console.time(`Processing ${id}`);
              }
            },
            transform(code, id) {
              if (/\.(png|jpe?g|webp|svg|gif)$/i.test(id)) {
                console.timeEnd(`Processing ${id}`);
              }
              return null;
            },
          },
        ],
      },
    },
  },
  
});
