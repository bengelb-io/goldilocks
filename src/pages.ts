import { html } from "https://deno.land/x/html@v1.2.0/mod.ts";

export const pageTemplate = (children: string) =>
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
      ${children}
  </body>
  </html>
  `;

export const missingPage = pageTemplate(html`
  <main class="flex flex-col items-center p-24 w-2/3">
    <div class="grid grid-cols-2 gap-8 items-center">
      <div>
        <h1 class="text-4xl font-bold">
          404: Hmm too cold! 
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

export const errorPage = pageTemplate(html`
  <main class="flex flex-col items-center p-24 w-2/3">
    <div class="grid grid-cols-2 gap-8 items-center">
      <div>
        <h1 class="text-4xl font-bold">
          500: Ouch too hot! 
        </h1>
        <p>
          Something burning up in our servers! Wait a little for it to cool down.
        </p>
      </div>
      <div class="rounded-full w-44 h-44 bg-slate-200 overflow-hidden">
        <img class="block w-44 h-44 object-cover" src="/public/goldilocks-at-table.jpg"/>
      </div>
    </div>
  </main>
  `);

export const htmlResponse = (html: string) => {
    return new TextEncoder().encode(html);
};
