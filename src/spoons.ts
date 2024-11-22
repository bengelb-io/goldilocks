import { errorPage, htmlResponse, missingPage } from "./pages.ts";
import { IGoldilocks } from "./types.ts";
interface Spoon {
  apply: (g: IGoldilocks) => void;
  onError: (
    request: Request,
    info: Deno.ServeHandlerInfo<Deno.Addr>,
    error: unknown,
  ) => Response | Promise<Response>;
  doesNotExist: Deno.ServeHandler<Deno.NetAddr>;
}

export class TextSpoon implements Spoon {
  apply = (_g: IGoldilocks) => {};
  onError = (
    _req: Request,
    _info: Deno.ServeHandlerInfo<Deno.Addr>,
    error: unknown,
  ) => {
    console.error(error);
    return new Response("Porridge too hot! Something went wrong\n", {
      status: 500,
    });
  };

  doesNotExist: Deno.ServeHandler<Deno.NetAddr> = (_req, _info) => {
    return new Response("Route does not exist\n", { status: 404 });
  };
}

export class HTMLSpoon implements Spoon {
  apply = (_g: IGoldilocks) => {};
  onError = (
    _req: Request,
    _info: Deno.ServeHandlerInfo<Deno.Addr>,
    error: unknown,
  ) => {
    console.error(error);
    return new Response(htmlResponse(errorPage), { status: 500 });
  };

  doesNotExist: Deno.ServeHandler<Deno.NetAddr> = (_req, _info) => {
    return new Response(htmlResponse(missingPage), { status: 404 });
  };
}
