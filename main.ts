import * as urllib from "https://deno.land/x/urllib@v0.1.2/common/mod.ts";
import { html } from "https://deno.land/x/html/mod.ts";
import * as mod from "https://deno.land/std@0.224.0/path/mod.ts";
import { assert } from "@std/assert/assert";

export function add(a: number, b: number): number {
  return a + b;
}

type Paths = { [key: string]: Deno.ServeHandler<Deno.NetAddr> };
type Middleware = (
  request: Request,
  info: Deno.ServeHandlerInfo<Deno.Addr>,
) => void | Response | Promise<Response>;
/**
 * Types of routes
 * Direct path: "/mypath"
 * Wildcard path: "/mypath/*"
 * Path with search params: /mypath?query=
 */

class Routes {
  paths: Paths;
  wildcards: Paths;
  middleware: Middleware[];
  constructor() {
    this.paths = {};
    this.wildcards = {};
    this.middleware = [];
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
    return this.paths[path] = handler;
  }
  _resolvePath(path: string): string | null {
    if (Object.hasOwn(this.paths, path)) {
      return path;
    }
    const truncPath = this._truncateWildcard(path);
    if (Object.hasOwn(this.wildcards, truncPath)) {
      return truncPath;
    }
    return null;
  }

  _resolveHandler(path: string) {
    if (Object.hasOwn(this.paths, path)) {
      return this.paths[path];
    }
    const truncPath = this._truncateWildcard(path);
    if (Object.hasOwn(this.wildcards, truncPath)) {
      return this.wildcards[truncPath];
    }
    return null;
  }

  _endPath(path: string) {
    const segment = path.split("/");
    return segment[segment.length - 1];
  }

  _staticDir(
    directory: string,
    DNEHandler: Deno.ServeHandler<Deno.NetAddr> = this.doesNotExist,
  ): Deno.ServeHandler<Deno.NetAddr> {
    return async (req, info) => {
      const url = new URL(req.url);
      const endPath = this._endPath(url.pathname);
      const filepath = mod.join(directory, endPath);
      const fileinfo = await Deno.lstat(filepath);
      if (!fileinfo) {
        return DNEHandler(req, info);
      }
      const file = await Deno.open(filepath);
      const buffer = new Uint8Array(fileinfo.size)
      file.read(buffer)
      return new Response(buffer);
    };
  }

  doesNotExist(_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) {
    return new Response(htmlResponse(missingPage), {
      status: 404,
    });
  }

  add(path: string, handler: Deno.ServeHandler<Deno.NetAddr>) {
    if (this._resolvePath(path)) {
      throw Error("Route already exists at path: " + path);
    }
    console.log(path)
    this._setPath(path, handler);
  }

  resolve(path: string) {
    return this._resolveHandler(path);
  }

  use(middleware: Middleware) {
    this.middleware.push(middleware);
  }

  static(path: string, dirPath: string) {
    const fileInfo = Deno.lstatSync(dirPath);
    assert(fileInfo.isDirectory);
    this.add(`${path}/*`, this._staticDir(dirPath))
  }
}

// function matchPath(url: URL, routes: Routes) {
//   if (Object.hasOwn(routes, url.pathname)) {
//     return routes[url.pathname];
//   }
//   return null;
// }

const pageTemplate = (children: string) =>
  html`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Goldilocks</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <nav>

  </nav>
    ${children}
</body>
</html>
`;

const missingPage = pageTemplate(html`
<main class="flex flex-col items-center p-24 w-2/3">
  <div class="grid grid-cols-2 gap-8 items-center">
    <div>
      <h1 class="text-4xl font-bold">
        404: Ouch too hot! 
      </h1>
      <p>
        Try a different bowl of porridge...
      </p>
    </div>
    <div class="rounded-full w-44 h-44 bg-slate-200 overflow-hidden">
      <img class="block w-44 h-44 object-cover" src="/public/goldilocks-at-table.jpg"/>
    </div>
  </div>
</main>
`);

const htmlResponse = (html: string) => {
  return new TextEncoder().encode(html);
};

function startServer(routes: Routes, options: { port: number }) {
  Deno.serve({
    options,
  }, (req: Request, info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
    try {
      const url = urllib.buildURL(req.url);
      const route = routes.resolve(url.pathname);
      if (!route) {
        return routes.doesNotExist(req, info);
      }
      for (const middleware of routes.middleware) {
        const res = middleware(req, info);
        if (res) {
          return res;
        }
      }
      return route(req, info);
    } catch (error) {
      console.error(error)
    }

  });
}

const routes = new Routes();

routes.static("/public", "./public")

routes.use((req) => {
  console.log(
    `(${new Date(Date.now()).toLocaleTimeString()}) [${req.method}] ${req.url}`,
  );
});

routes.add("/echo/*", (req) => {
  const segments = req.url.split("/");
  const wildcard = segments[segments.length - 1];
  return new Response(wildcard);
});

startServer(routes, { port: 3000 });
