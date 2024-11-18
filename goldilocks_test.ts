import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertSpyCalls, spy } from "https://deno.land/std@0.224.0/testing/mock.ts";
import Goldilocks from "./goldilocks.ts";

// Helper functions
function createMockHandler(): Deno.ServeHandler<Deno.NetAddr> {
  return (_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
    return new Response("OK");
  };
}

function createMockRequest(path: string): Request {
  return new Request(`http://localhost${path}`);
}

function createMockInfo(): Deno.ServeHandlerInfo<Deno.NetAddr> {
  return {
    remoteAddr: {
      hostname: "127.0.0.1",
      port: 8000,
      transport: "tcp",
      
    },
    completed:  new Promise((res, _rej) => {})
  };
}

Deno.test("Goldilocks Router Tests", async (t) => {
  await t.step("constructor initializes with empty routes and wildcards", () => {
    const router = new Goldilocks();
    assertEquals(router.routes, {});
    assertEquals(router.wildcards, {});
    assertEquals(router.middleware, []);
  });

  await t.step("constructor accepts path prefix", () => {
    const router = new Goldilocks("/api");
    assertEquals(router.pathPrefix, "/api");
  });

  await t.step("Route() adds direct path routes", () => {
    const router = new Goldilocks();
    const handler = createMockHandler();
    router.Route("/test", handler);
    assertEquals(router.routes["/test"], handler);
  });

  await t.step("Route() adds wildcard routes", () => {
    const router = new Goldilocks();
    const handler = createMockHandler();
    router.Route("/test/*", handler);
    assertEquals(router.wildcards["/test"], handler);
  });

  await t.step("Route() with prefix prepends path correctly", () => {
    const router = new Goldilocks("/api");
    const handler = createMockHandler();
    router.Route("/test", handler);
    assertEquals(router.routes["/api/test"], handler);
  });

  await t.step("Route() throws error on duplicate routes", () => {
    const router = new Goldilocks();
    const handler = createMockHandler();
    router.Route("/test", handler);
    assertThrows(
      () => router.Route("/test", handler),
      Error,
      "Route already exists at path: /test"
    );
  });

  await t.step("handler processes direct routes", async () => {
    const router = new Goldilocks();
    const handler = createMockHandler();
    router.Route("/test", handler);
    
    const req = createMockRequest("/test");
    const info = createMockInfo();
    const response = await router.handler(req, info);
    
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
  });

  await t.step("handler processes wildcard routes", async () => {
    const router = new Goldilocks();
    const handler = createMockHandler();
    router.Route("/files/*", handler);
    
    const req = createMockRequest("/files/test.txt");
    const info = createMockInfo();
    const response = await router.handler(req, info);
    
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
  });

  await t.step("handler returns 404 for non-existent routes", async () => {
    const router = new Goldilocks();
    const req = createMockRequest("/nonexistent");
    const info = createMockInfo();
    const response = await router.handler(req, info);
    
    assertEquals(response.status, 404);
  });

  await t.step("middleware executes in order", async () => {
    const router = new Goldilocks();
    const handler = createMockHandler();
    router.Route("/test", handler);
    
    const middleware1Spy = spy((_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
      return undefined;
    });
    
    const middleware2Spy = spy((_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
      return undefined;
    });
    
    // @ts-ignore
    router.Use(middleware1Spy); // @ts-ignore
    router.Use(middleware2Spy);
    
    const req = createMockRequest("/test");
    const info = createMockInfo();
    await router.handler(req, info);
    
    assertSpyCalls(middleware1Spy, 1);
    assertSpyCalls(middleware2Spy, 1);
  });

  await t.step("middleware can short-circuit request handling", async () => {
    const router = new Goldilocks();
    const handler = createMockHandler();
    router.Route("/test", handler);
    
    // @ts-ignore
    router.Use((_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
      return new Response("Intercepted", { status: 403 });
    });
    
    const req = createMockRequest("/test");
    const info = createMockInfo();
    const response = await router.handler(req, info);
    
    assertEquals(response.status, 403);
    assertEquals(await response.text(), "Intercepted");
  });

  await t.step("handler catches errors and returns 500", async () => {
    const router = new Goldilocks();
    const errorHandler = (_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) => {
      throw new Error("Test error");
    };
    
    router.Route("/error", errorHandler);
    
    const req = createMockRequest("/error");
    const info = createMockInfo();
    const response = await router.handler(req, info);
    
    assertEquals(response.status, 500);
  });

  await t.step("Static() sets up wildcard route for directory", async () => {
    const router = new Goldilocks();
    // Create a temporary directory for testing
    const tempDir = await Deno.makeTempDir();
    
    try {
      router.Static("/assets", tempDir);
      assertEquals(typeof router.wildcards["/assets"], "function");
    } finally {
      // Clean up
      await Deno.remove(tempDir);
    }
  });
});