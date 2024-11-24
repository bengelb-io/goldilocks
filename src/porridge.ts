import { HTTPMethod, Methods } from "./types.ts";
import * as method from "https://deno.land/std@0.196.0/http/method.ts";

export class Porridge {
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
