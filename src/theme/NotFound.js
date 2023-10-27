import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './NotFound.module.css';
import clsx from 'clsx';

export default function PageNotFound() {
  return (
    <div className={clsx('background', styles.background)}>
      <Layout title="404 Page Not Found" description="">
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '62vh',
              fontSize: '20px',
            }}>
              <img src={useBaseUrl("img/404.png")} width='350px'></img>
              
          </div>
          <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '9vh',
            fontSize: '20px',
          }}>
              <button className={clsx('toHomepage', styles.toHomepage)}><a href='/'>返回主页</a></button>
          </div>
      </Layout>
    </div>
  );
}