declare global {
  type RouteContext<Path extends string> = {
    params: Promise<Path extends `${string}[token]${string}` ? { token: string } : { id: string }>;
  };
}
export {};
