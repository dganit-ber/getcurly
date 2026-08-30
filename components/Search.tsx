"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";

export default function Search() {
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
          const res = await fetch(`/api/products/search?q=${encodeURIComponent(product)}`);
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
    <div className="flex w-full flex-col items-center justify-center font-sans text-[30px]">
      <h1>Search Products</h1>
      <input
        className="mt-7.5 w-[70%] self-center rounded-[7px] border-2 border-blue bg-white px-2 font-sans text-[1.2rem] leading-[5] text-black"
        onChange={onProductSearch}
        type="text"
        placeholder="Search a Product"
      />
      <div className="w-full px-2.5 pt-5">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex w-full flex-row justify-around pt-2.5 font-sans text-[30px]"
          >
            <div>{p.name}</div>
            <div>{p.type}</div>
            <div>{p.brand}</div>
            <div>{p.cg_approved}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
