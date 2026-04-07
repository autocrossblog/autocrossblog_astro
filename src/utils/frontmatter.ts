import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import type { RehypePlugin, RemarkPlugin } from '@astrojs/markdown-remark';

export const readingTimeRemarkPlugin: RemarkPlugin = () => {
  return function (tree, file) {
    const textOnPage = toString(tree);
    const readingTime = Math.ceil(getReadingTime(textOnPage).minutes);

    if (typeof file?.data?.astro?.frontmatter !== 'undefined') {
      file.data.astro.frontmatter.readingTime = readingTime;
    }
  };
};

export const responsiveTablesRehypePlugin: RehypePlugin = () => {
  return function (tree) {
    if (!tree.children) return;

    for (let i = 0; i < tree.children.length; i++) {
      const child = tree.children[i];

      if (child.type === 'element' && child.tagName === 'table') {
        tree.children[i] = {
          type: 'element',
          tagName: 'div',
          properties: {
            style: 'overflow:auto',
          },
          children: [child],
        };

        i++;
      }
    }
  };
};

export const lazyImagesRehypePlugin: RehypePlugin = () => {
  return function (tree) {
    if (!tree.children) return;

    visit(tree, 'element', function (node) {
      if (node.tagName === 'img') {
        node.properties.loading = 'lazy';
      }
    });
  };
};

/**
 * Prevents Astro from trying to optimize external/remote images found in
 * markdown body content. This must run BEFORE Astro's built-in rehypeImages
 * plugin (user rehype plugins always run before it).
 *
 * Without this, Astro calls `inferRemoteSize` (a live network fetch) for every
 * remote image URL — Flickr CDN and others redirect, causing a
 * "Failed to parse image reference" error at runtime. External images are
 * already served by their own CDN and don't need Astro's image pipeline.
 */
export const preventRemoteImageOptimizationPlugin: RehypePlugin = () => {
  return function (_tree, file) {
    if (file.data.astro) {
      file.data.astro.remoteImagePaths = [];
    }
  };
};
