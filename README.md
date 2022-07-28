# twing-render-loader

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
 * @this {import('webpack').LoaderContext<{}>}
 * @param {import('twing').TwingEnvironment} env
 */
export async function configure(env, params) {
    env.addGlobal('mode', this.mode);
};
```
