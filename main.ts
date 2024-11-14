import Goldilocks from "./goldilocks.ts";

export function add(a: number, b: number): number {
  return a + b;
}


const g = new Goldilocks();

g.Static("/public", "./public");

g.Use((req) => {
  console.log(
    `(${new Date(Date.now()).toLocaleTimeString()}) [${req.method}] ${req.url}`,
  );
});

g.Add("/echo/*", (req) => {
  const segments = req.url.split("/");
  const wildcard = segments[segments.length - 1];
  return new Response(wildcard);
});

g.Listen(3000)

