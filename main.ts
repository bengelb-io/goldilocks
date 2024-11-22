import Goldilocks from "./src/mod.ts";

const g = new Goldilocks();

g.Static("/public", "./public");

g.Use((req) => {
  console.log(
    `(${
      new Date(Date.now()).toLocaleTimeString()
    }) [${req.method}] ${req.url} | ${req.referrer} | ${
      req.headers.get("Date")
    } | ${req.headers.get("X-Forwarded-For")}`,
  );
});

// g.Route("/echo/*", (req) => {
//   const segments = req.url.split("/");
//   const wildcard = segments[segments.length - 1];
//   return new Response(wildcard);
// });

const api = g.Router("/api");

const wrongMethod = (req: Request) => {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({
      message:
        `The method -- ${req.method}, isn't supported on this route -- ${req.url}`,
    }),
    {
      headers,
      status: 404,
    },
  );
};

const echo = g.Porridge("/echo/*", (req: Request) => {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({
      message:
        `The method -- ${req.method}, isn't supported on this route -- ${req.url}`,
    }),
    {
      headers,
      status: 404,
    },
  );
})
echo
  .Method("GET", (req, _info) => {
    const segments = req.url.split("/");
    const wildcard = segments[segments.length - 1];
    return new Response(`${wildcard}\n`);
  })

g.Listen(3000);
