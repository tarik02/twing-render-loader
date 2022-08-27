import * as Path from 'path';
import * as Webpack from 'webpack';
import {
  TwingEnvironment,
  TwingLoaderFilesystem,
  TwingLoaderArray,
  TwingLoaderChain,
  TwingSource,
  TwingError,
  TwingLoaderInterface,
  TwingLoaderRelativeFilesystem
} from 'twing';

class PathSupportingArrayLoader extends TwingLoaderArray {
  getSourceContext(name: string, from: TwingSource): Promise<TwingSource> {
    return super.getSourceContext(name, from).then((source) => {
      return new TwingSource(source.getCode(), source.getName(), name);
    });
  }
}

const resolvePotentialDependencyLocations = function* (request: string, from: TwingSource, loader: TwingLoaderInterface): Generator<string> {
  if (loader instanceof TwingLoaderArray) {
    return;
  }

  if (loader instanceof TwingLoaderChain) {
    for (const subloader of loader.getLoaders()) {
      yield* resolvePotentialDependencyLocations(request, from, subloader);
    }
    return;
  }

  if (loader instanceof TwingLoaderFilesystem) {
    for (const ns of loader.getNamespaces()) {
      const prefix = ns === TwingLoaderFilesystem.MAIN_NAMESPACE ? '' : `@${ns}/`;
      if (!request.startsWith(prefix)) {
        continue;
      }

      for (const nsPath of loader.getPaths(ns)) {
        yield Path.join(nsPath, request.substring(prefix.length));
      }
    }
  }

  if (loader instanceof TwingLoaderRelativeFilesystem) {
    if (Path.isAbsolute(request)) {
      return;
    }
    yield Path.join(Path.dirname(from.getResolvedName()), request);
  }
};

const castError = (error: any): Error => {
  if (error instanceof TwingError) {
    const newError = new Webpack.WebpackError(error.name + ': ' + error.getMessage());

    newError.name = error.name;
    newError.stack = '';
    newError.hideStack = true;

    error = newError;
  }

  return error instanceof Error ? error : new Error(error as any);
};

export type Options = {
  context?: undefined | string;
  output?: undefined | 'html' | 'function';
  environmentModule?: undefined | string;
  environmentParams?: undefined | Record<string, any>;
};

export default async function (this: Webpack.LoaderContext<Options>, source: string) {
  this.cacheable && this.cacheable(true);

  const callback = this.async();

  try {
    const options = this.getOptions({
      type: 'object',
      additionalProperties: false,
      properties: {
        context: {
          type: 'string',
        },
        output: {
          type: 'string',
          enum: [
            'html',
            'function',
          ],
        },
        environmentModule: {
          type: 'string',
        },
        environmentParams: {
          type: 'object',
        },
      },
    });
    const resourcePath = this.resourcePath;
    const context = options.context || Path.dirname(resourcePath);

    this.addDependency(resourcePath);

    let environmentModule;
    if (options.environmentModule) {
      this.addDependency(options.environmentModule);
      environmentModule = (await import(`${options.environmentModule}?${Date.now()}`));
    }

    const env = new TwingEnvironment(new TwingLoaderChain([
      new TwingLoaderFilesystem([context], context),
    ]), environmentModule?.options);

    await environmentModule?.configure?.call(
      this,
      {
        loader: this,
        env,
        params: options.environmentParams ?? {}
      }
    );

    env.setLoader(new TwingLoaderChain([
      new PathSupportingArrayLoader(new Map([
        [resourcePath, source]
      ])),
      env.getLoader(),
    ]));

    env.on('template', async (name: string, from?: TwingSource) => {
      if (!from) {
        return;
      }

      try {
        const sourceContext = await env.getLoader().getSourceContext(name, from);
        this.addDependency(sourceContext.getResolvedName());
      } catch {
        for (const loc of resolvePotentialDependencyLocations(name, from, env.getLoader())) {
          this.addMissingDependency(loc);
        }
      }
    });

    let result = await env.render(resourcePath, {});

    switch (options.output) {
      case undefined:
      case 'html':
        break;

      case 'function':
        result = `module.exports=function(){return ${JSON.stringify(result)};};`;
        break;
    }

    callback(null, result);
  } catch (error) {
    callback(castError(error));
  }
};
