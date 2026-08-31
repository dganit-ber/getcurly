"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";

export const Search = () => {
  const [products, setProducts] = useState<Product[]>([]); // array for db return
  const [product, setProduct] = useState<string>(); // state for user input

  useEffect(() => {
    let ignore = false;

    if (!product) {
      (async () => {
        try {
          const res = await fetch("/api/products");
          const data = (await res.json()) as Product[];
          if (!ignore) setProducts(data);
        } catch (e) {
          console.error(e);
        }
      })();
    } else {
      (async () => {
        try {
          const res = await fetch(
            `/api/products/search?q=${encodeURIComponent(product)}`,
          );
          const data = (await res.json()) as Product[];
          if (!ignore) setProducts(data);
        } catch (e) {
          console.error(e);
        }
      })();
    }

    return () => {
      ignore = true;
    };
  }, [product]);

  const onProductSearch = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setProduct(target.value);
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Search products
      </h1>

      <input
        onChange={onProductSearch}
        type="text"
        placeholder="Search a product"
        className="mt-5 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
      />

      {products.length === 0 ? (
        <p className="mt-6 text-[13px] text-muted">Nothing found.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {products.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-line bg-surface p-3.5"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <p className="font-display text-base font-semibold tracking-tight">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {p.brand} · {p.type}
                  </p>
                </div>

                {p.cg_approved && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      p.cg_approved === "true"
                        ? "bg-ok-bg text-ok"
                        : "bg-bad-bg text-bad"
                    }`}
                  >
                    {p.cg_approved === "true" ? "Clear" : "Skip"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
