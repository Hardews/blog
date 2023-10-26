import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Contact',
    Svg: require('@site/static/img/home1.svg').default,
    description: (
      <>
        🙌: <a href='https://github.com/Hardews'>Github</a>
        <br></br>
        📫: hardews@qq.com
        <br></br>
        And my Leetcode page: <a href='https://leetcode.cn/u/niu-rou-ban-mian-t/'>click</a>
      </>
    ),
  },
  {
    title: 'Currently',
    Svg: require('@site/static/img/home2.svg').default,
    description: (
      <>
        <code>Golang</code> base knowledge review.
        <br></br>
        <code>LeetCode</code> daily.
      </>
    ),
  },
  {
    title: 'Share',
    Svg: require('@site/static/img/home3.svg').default,
    description: (
      <>
        More about back-end and interesting knowledge.
        Also share something about life.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
