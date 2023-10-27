const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Hardews\'s blog',
  tagline: '心无增减，得失随缘',
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

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'algorithm',
        // 算法
        path: './algorithm',
        routeBasePath:"/algorithm",
        sidebarPath: require.resolve('./sidebars.js'),
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'interview',
        // 面试题
        path: './interview',
        routeBasePath:"/interview",
        sidebarPath: require.resolve('./sidebars.js'),
      },
    ],
  ],

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: './docs',
          routeBasePath:"/note",
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: {
          path: "./blog",
          showReadingTime: true,
          blogSidebarTitle: "最近的文章",
          routeBasePath:"/blog",
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
      image: 'img/background.jpg',
      navbar: {
        title: 'Homepage',
        logo: {
          style: {
            borderRadius: '50%',
          },
          alt: '头像',
          src: 'img/wechat.jpg',
        },
        items: [
          {
            href: '/blog',
            label: '博客',
            position: 'left'
          },
          {
            type: 'dropdown',
            label: '更多',
            position: 'left',
            items: [
              {
                label: '算法',
                href: '/algorithm/intro'
              },
              {
                label: '面试题',
                href: '/interview/intro'
              },
              {
                label: '学习笔记',
                href: '/note/intro'
              },
              {
                label: '博客归档',
                href: '/blog/archive'
              },
            ]
          },
          {
            type: 'dropdown',
            label: '友链',
            position: 'left',
            items: [
              {
                label: '坤坤',
                href: 'https://hexo.cliao.site/'
              },
              {
                label: '诚哥',
                href: 'https://www.madfrey.top/'
              },
            ]
          },
          
          {
            href: 'https://github.com/hardews/blog',
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
        ]
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
