/** Client API léger (côté navigateur). Déballe l'enveloppe { data } / { error }. */
async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: { code: string; message: string } }
    | null;
  if (!res.ok || !json || "error" in json) {
    const message = json && "error" in json ? json.error.message : "Une erreur est survenue.";
    throw new Error(message);
  }
  return json.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  return unwrap<T>(await fetch(path, { headers: { accept: "application/json" } }));
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
