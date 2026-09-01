"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { freshnessOf } from "@/lib/freshness";
import Link from "next/link";

export const Search = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState<string>();

  useEffect(() => {
    let ignore = false;

    if (!query) {
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
            `/api/products/search?q=${encodeURIComponent(query)}`,
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
  }, [query]);

  const onProductSearch = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(target.value);
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
          {products.map((product) => {
            const clear = product.cg_approved === "true";
            const confirmed = freshnessOf(product.verified_at) === "fresh";

            // Hue always carries the verdict — green for Clear, red for Skip.
            // Freshness changes weight only: a confirmed verdict is solid, an
            // unverified one is the same colour tinted back, so the two never
            // collapse into the same grey.
            const chip = clear
              ? confirmed
                ? "bg-ok text-bg"
                : "bg-ok-bg text-ok"
              : confirmed
                ? "bg-bad text-bg"
                : "bg-bad-bg text-bad";

            return (
              <li
                key={product.id}
                className="rounded-2xl border border-line bg-surface p-3.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <p className="font-display text-base font-semibold tracking-tight">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {product.brand} · {product.type}
                    </p>
                  </div>

                  {product.cg_approved && (
                    <span
                      className={`shrink-0 rounded-lg px-3 py-1.5 font-display text-sm font-semibold tracking-tight ${chip}`}
                    >
                      {clear ? "Clear" : "Skip"}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2.5 border-t border-line pt-2">
                  <FreshnessBadge verifiedAt={product.verified_at} />

                  <Link
                    href={`/?rescan=${product.id}&name=${encodeURIComponent(
                      product.name,
                    )}`}
                    className="shrink-0 text-[13px] font-bold text-brand"
                  >
                    Scan this
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
