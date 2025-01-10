import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
   
    {
      text: 'About',
      href: getPermalink('/about'),
    },
    {
      text: 'Blog',
      href: getBlogPermalink(),
    },
    { text: 'Handbook', href: getPermalink('/handbook') },
    {
      text: 'Contact',
      href: getPermalink('/contact'),
    },
    {
      text: 'Car Setup',
      href: getPermalink('/setup'),
    },
    {
      text: 'Search',
      href: getPermalink('/search'),
    },
  ],
};

export const footerData = {
  links: [
    {
      title: 'AutocrossBlog',
      links: [
        { text: 'About', href: '/about' },
        { text: 'Blog', href: '/blog' },
        { text: 'AutocrossRank.com', href: "https://www.autocrossrank.com/" },
        { text: 'Handbook', href: "/handbook" },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: 'https://x.com/AutocrossBlog' },
    { ariaLabel: 'BlueSky', icon: 'tabler:brand-bluesky', href: 'https://autocross.bsky.social/' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://instagram.com/AutocrossBlog' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://facebook.com/AutocrossBlog' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
  ],
  footNote: `
    Made by <a class="text-blue-600 underline dark:text-muted" href="https://www.chrishammond.com/"> Chris Hammond</a> · All rights reserved.
  `,
};
