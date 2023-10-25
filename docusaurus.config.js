const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '牛肉拌面的博客',
  favicon: "img/favicon.png",

  url: 'https://hardews.cn',
  baseUrl: '/',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },
  scripts: [
	  {
		  src: 'https://hm.baidu.com/hm.js?d1b90f0beea87f33a50c8f8c785b8fc7',
		  async: true
	  }
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: './docs',
          routeBasePath:"/docs",
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: {
          path: "./blog",
          showReadingTime: true,
          blogSidebarTitle: "最近的文章",
          routeBasePath:"/",
	        sortPosts: "descending",
          postsPerPage: 7,
          archiveBasePath: "/archive",
          feedOptions: {
            type: 'all',
            createFeedItems: async (params) => {
              const {blogPosts, defaultCreateFeedItems, ...rest} = params;
              return defaultCreateFeedItems({
                blogPosts: blogPosts.filter((item, index) => index < 5),
                ...rest,
              });
            },
          },
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: '牛肉拌面的博客',
        logo: {
          alt: '博客 Logo',
          src: 'img/favicon.png',
        },
        items: [
          {
            href: 'https://hardews.cn/docs/introduction',
            label: '文档',
            position: 'right'
          },
          {
            href: 'https://hardews.cn/archive',
            label: 'Archive',
            position: 'right'
          },
	        {
            href: 'https://hardews.cn/about',
            label: 'Introduction',
            position: 'right'
          },
          {
            href: 'https://github.com/hardews',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '备案',
            items: [
              {
                label: '桂ICP备2022010425号-1',
                href: 'https://beian.miit.gov.cn/',
              },
            ],
          },
          {
            title: '友链',
            items: [
              {
                label: '坤坤的博客',
                href: 'https://hexo.cliao.site/',
              },
              {
                label: '诚哥的博客',
                href: 'https://www.madfrey.top/',
              },
            ]
          }
        ]
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
