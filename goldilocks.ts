import * as urllib from "https://deno.land/x/urllib@v0.1.2/common/mod.ts";
import * as mod from "https://deno.land/std@0.224.0/path/mod.ts";
import * as method from "https://deno.land/std@0.196.0/http/method.ts";
import { assert } from "@std/assert/assert";
import { errorPage, htmlResponse, missingPage } from "./html.ts";

type HTTPMethod = typeof method.HTTP_METHODS[number];
export type Routes = { [key: string]: Deno.ServeHandler<Deno.NetAddr> };
export type Routers = { [key: string]: Goldilocks };
export type Methods = Partial<
  {
    [key in HTTPMethod]: Deno.ServeHandler<Deno.NetAddr>;
  }
>;
export type Middleware = (
  request: Request,
  info: Deno.ServeHandlerInfo<Deno.Addr>,
) => void | Response | Promise<Response>;
/**
 * Types of routes
 * Direct path: "/mypath"
 * Wildcard path: "/mypath/*"
 * Path with search params: /mypath?query=
 */

class Porridge {
  methods: Methods;
  fallback: Deno.ServeHandler<Deno.NetAddr>;
  constructor(fallback: Deno.ServeHandler<Deno.NetAddr>) {
    this.methods = {};
    this.fallback = fallback;
  }

  Method(httpMethod: HTTPMethod, handler: Deno.ServeHandler<Deno.NetAddr>) {
    if (!method.isHttpMethod(httpMethod)) {
      throw Error("Provided method is not a valid http method");
    }
    this.methods[httpMethod] = handler;
    return this;
  }
  Handler: Deno.ServeHandler<Deno.NetAddr> = (req, info) => {
    if (!method.isHttpMethod(req.method)) {
      throw Error("Invalid method");
    }
    const methodHandler = this.methods[req.method];
    if (!methodHandler) {
      return this.fallback(req, info);
    }
    return methodHandler(req, info);
  };
}

export default class Goldilocks {
  pathPrefix: string | null;
  routes: Routes;
  wildcards: Routes;
  middleware: Middleware[];
  routers: Routers = {};
  spoon: Spoon = new TextSpoon();
  constructor(prefix: string | null = null) {
    this.pathPrefix = prefix;
    this.routes = {};
    this.wildcards = {};
    this.routers = {};
    this.middleware = [];
  }

  _prependPath(path: string) {
    if (this.pathPrefix) {
      return mod.join(this.pathPrefix, path);
    }
    return path;
  }

  _truncateWildcard(path: string) {
    const sections = path.split("/");
    if (sections.length === 1) {
      return "/";
    }
    return sections.slice(0, sections.length - 1).join("/");
  }

  _setPath(path: string, handler: Deno.ServeHandler<Deno.NetAddr>) {
    const sections = path.split("/");
    if (sections[sections.length - 1] === "*") {
      return this.wildcards[this._truncateWildcard(path)] = handler;
    }
    return this.routes[path] = handler;
  }

  _resolvePath(path: string): string | null {
    if (Object.hasOwn(this.routes, path)) {
      return path;
    }
    const truncPath = this._truncateWildcard(path);
    if (Object.hasOwn(this.wildcards, truncPath)) {
      return truncPath;
    }
    return null;
  }

  _resolveRouter(path: string) {
    const segments = path.split("/");
    for (let i = 1; i <= segments.length; i++) {
      const subPath = mod.join(...segments.slice(0, i));
      if (Object.hasOwn(this.routers, subPath)) {
        return this.routers[subPath];
      }
    }
    return null;
  }

  _resolveHandler(path: string) {
    if (Object.hasOwn(this.routes, path)) {
      return this.routes[path];
    }
    const truncPath = this._truncateWildcard(path);
    if (Object.hasOwn(this.wildcards, truncPath)) {
      return this.wildcards[truncPath];
    }
    return null;
  }

  _dirPath(path: string) {
    const segment = path.split("/");
    return segment[segment.length - 1];
  }

  _staticDir(
    directory: string,
    DNEHandler: Deno.ServeHandler<Deno.NetAddr> = this.doesNotExist,
  ): Deno.ServeHandler<Deno.NetAddr> {
    return async (req, info) => {
      const url = new URL(req.url);
      const endPath = this._dirPath(url.pathname);
      const filepath = mod.join(directory, endPath);
      const fileinfo = await Deno.lstat(filepath);
      if (!fileinfo) {
        return DNEHandler(req, info);
      }
      const file = await Deno.open(filepath);
      const buffer = new Uint8Array(fileinfo.size);
      file.read(buffer);
      return new Response(buffer);
    };
  }

  doesNotExist(_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) {
    return new Response(htmlResponse(missingPage), {
      status: 404,
    });
  }

  onError(
    _req: Request,
    _info: Deno.ServeHandlerInfo<Deno.NetAddr>,
    _error: unknown,
  ) {
    return new Response(htmlResponse(errorPage), {
      status: 500,
    });
  }

  Handler: Deno.ServeHandler<Deno.NetAddr> = (req, info) => {
    const spoon = this.spoon
    try {
      const url = urllib.buildURL(req.url);
      const router = this._resolveRouter(url.pathname);
      if (router) {
        return router.Handler(req, info);
      }
      const route = this.resolve(url.pathname);
      if (!route) {
        return spoon.doesNotExist(req, info);
      }
      for (const middleware of this.middleware) {
        const res = middleware(req, info);
        if (res) {
          return res;
        }
      }
      return route(req, info);
    } catch (error) {
      console.error(error);
      return spoon.error(req, info, error);
    }
  };

  resolve(path: string) {
    return this._resolveHandler(path);
  }

  Route(path: string, handler: Deno.ServeHandler<Deno.NetAddr>) {
    path = this._prependPath(path);
    if (this._resolvePath(path)) {
      throw Error("Route already exists at path: " + path);
    }
    this._setPath(path, handler);
  }

  Porridge(path: string, fallback: Deno.ServeHandler<Deno.NetAddr>): Porridge {
    const porridge = new Porridge(fallback);
    this.Route(path, porridge.Handler);
    return porridge;
  }

  Router(path: string) {
    path = this._prependPath(path);
    if (this._resolvePath(path)) {
      throw Error("Route already exists at path: " + path);
    }
    const router = new Goldilocks(path);
    this.routers[path] = router;
    return router;
  }

  Use(middleware: Middleware) {
    this.middleware.push(middleware);
  }

  Static(path: string, dirPath: string) {
    const fileInfo = Deno.lstatSync(dirPath);
    assert(fileInfo.isDirectory);
    this.Route(`${path}/*`, this._staticDir(dirPath));
  }

  Listen(port: number) {
    Deno.serve({
      port,
    }, this.Handler);
  }
}

interface Spoon {
  apply: (g: Goldilocks) => void;
  error: (
    request: Request,
    info: Deno.ServeHandlerInfo<Deno.Addr>,
    error: unknown,
  ) => Response | Promise<Response>;
  doesNotExist: Deno.ServeHandler<Deno.NetAddr>;
}

class TextSpoon implements Spoon {
  apply = (_g: Goldilocks) => {};
  error = (
    _req: Request,
    _info: Deno.ServeHandlerInfo<Deno.Addr>,
    error: unknown,
  ) => {
    console.error(error);
    return new Response("Something went wrong", { status: 500 });
  };

  doesNotExist: Deno.ServeHandler<Deno.NetAddr> = (_req, _info) => {
    return new Response("Resource does not exist", { status: 404 });
  };
}

// class HTMLRouter implements RouterType {

// }

export const jsonRequest: Middleware = (req, _info) => {
  const contentType = req.headers.get("Content-Type");
  if (contentType !== "application/json") {
    return jsonify({
      error: "Unsupported Content-Type Header. Expected application/json",
    }, {
      status: 415,
      statusText: "Unsupported Media Type",
    });
  }
};

// deno-lint-ignore no-explicit-any
export function jsonify(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  new Response(JSON.stringify(data), {
    headers,
    status: 200,
    statusText: "OK",
    ...init,
  });
}
