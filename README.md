# twing-render-loader

![Check](https://github.com/Tarik02/twing-render-loader/actions/workflows/check.yml/badge.svg)
![Publish to NPM](https://github.com/Tarik02/twing-render-loader/actions/workflows/publish-to-npm.yml/badge.svg)
[![npm version](https://badge.fury.io/js/twing-render-loader.svg)](https://badge.fury.io/js/twing-render-loader)

## Installation

```bash
yarn add --dev twing-render-loader
# or
npm install --save-dev twing-render-loader
```

## Usage

Add this to your webpack config:
```js
module: {
  rules: [
    // ...

    {
      test: /\.twig$/i,
      loader: 'twing-render-loader',
      options: {
        environmentModule: new URL('twing.env.mjs', import.meta.url).pathname,
        // environmentModule: require.resolve('./twing.env.mjs', import.meta.url),
      },
    },

    // ...
  ],

  // ...

  plugins: [
    new WebpackHtmlPlugin({
      template: './src/index.twig',
    }),
  ],
},
```

Create file named 'twing.env.mjs':
```js
/** @type {import('twing').TwingEnvironmentOptions} */
export const options = {
    debug: true,
};

/**
 * @param {import('webpack').LoaderContext<{}>} loader
 * @param {import('twing').TwingEnvironment} env
 */
export async function configure({ loader, env }) {
    env.addGlobal('mode', loader.mode);
};
```
