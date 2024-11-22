import * as method from "https://deno.land/std@0.196.0/http/method.ts";

type HTTPMethod = typeof method.HTTP_METHODS[number];

type Routes = { [key: string]: Deno.ServeHandler<Deno.NetAddr> };
type Routers = { [key: string]: IGoldilocks };
type Methods = Partial<
  {
    [key in HTTPMethod]: Deno.ServeHandler<Deno.NetAddr>;
  }
>;
type Middleware = (
  request: Request,
  info: Deno.ServeHandlerInfo<Deno.Addr>,
) => void | Response | Promise<Response>;

interface IGoldilocks {
  pathPrefix: string | null;
  routes: Routes;
  wildcards: Routes;
  middleware: Middleware[];
  routers: Routers;
  spoon: ISpoon;

  // Path manipulation methods
  _prependPath(path: string): string;
  _truncateWildcard(path: string): string;
  _setPath(
    path: string,
    handler: Deno.ServeHandler<Deno.NetAddr>,
  ): Deno.ServeHandler<Deno.NetAddr>;
  _resolvePath(path: string): string | null;
  _resolveRouter(path: string): IGoldilocks | null;
  _resolveHandler(path: string): Deno.ServeHandler<Deno.NetAddr> | null;
  _dirPath(path: string): string;

  // Static file handling
  _staticDir(
    directory: string,
    DNEHandler?: Deno.ServeHandler<Deno.NetAddr>,
  ): Deno.ServeHandler<Deno.NetAddr>;

  // Request handling
  Handler: Deno.ServeHandler<Deno.NetAddr>;
  resolve(path: string): Deno.ServeHandler<Deno.NetAddr> | null;

  // Routing methods
  Route(path: string, handler: Deno.ServeHandler<Deno.NetAddr>): void;
  Porridge(path: string, fallback: Deno.ServeHandler<Deno.NetAddr>): IPorridge;
  Router(path: string): IGoldilocks;

  // Middleware and configuration
  Use(middleware: Middleware): void;
  Static(path: string, dirPath: string): void;
  Listen(port: number): void;
}

interface IPorridge {
  // Properties
  methods: Methods;
  fallback: Deno.ServeHandler<Deno.NetAddr>;

  // Method for adding HTTP method handlers
  Method(
    httpMethod: HTTPMethod,
    handler: Deno.ServeHandler<Deno.NetAddr>,
  ): IPorridge;

  // Main request handler
  Handler: Deno.ServeHandler<Deno.NetAddr>;
}

interface ISpoon {
  apply: (g: IGoldilocks) => void;
  onError: (
    request: Request,
    info: Deno.ServeHandlerInfo<Deno.Addr>,
    error: unknown,
  ) => Response | Promise<Response>;
  doesNotExist: Deno.ServeHandler<Deno.NetAddr>;
}

export type {
  HTTPMethod,
  IGoldilocks,
  IPorridge,
  ISpoon,
  Methods,
  Middleware,
  Routers,
  Routes,
};
