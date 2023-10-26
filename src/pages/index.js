import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';

import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <Box sx={{ display: 'flex' }}>
          <Box m='auto'>
            <Avatar
              alt="Hardews"
              src={useBaseUrl('img/wechat.jpg')}
              sx={{ width: 225, height: 225, m: 0 }}
            />
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          </Box>
        </Box>
        
        <div className='to blog'>
          <Link
            className="button button--secondary button--lg"
            to="/blog">
            Enter My Blog
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
