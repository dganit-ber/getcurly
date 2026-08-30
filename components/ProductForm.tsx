"use client";

import { useState } from "react";

export default function ProductForm() {
  const [values, setValues] = useState<{
    productName?: string;
    brandname?: string;
    producttype?: string;
    fitsSystem?: string;
  }>({});
  const [error, setError] = useState(false);
  const [thanks, setThanks] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleChangeButtons(e: React.ChangeEvent<HTMLInputElement>) {
    setValues((prev) => ({ ...prev, fitsSystem: e.target.value }));
  }

  async function submit() {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: values.productName,
        brandname: values.brandname,
        producttype: values.producttype,
        fitsSystem: values.fitsSystem,
      }),
    });
    const { success } = (await res.json()) as { success?: boolean };

    if (success) {
      setThanks(true);
      setError(false);
      setValues({});
    } else {
      setError(true);
    }
  }

  const field =
    "registerfield mt-[30px] w-[70%] self-center rounded-[7px] border-2 border-blue bg-white px-2 font-sans text-[1.2rem] leading-[5] text-black";

  return (
    <div className="flex w-full flex-col">
      {error && (
        <div className="font-bold text-red-600">something went wrong, please try again.</div>
      )}

      <input
        className={`${field} productName`}
        name="productName"
        placeholder="Product name"
        value={values.productName ?? ""}
        onChange={handleChange}
      />
      {values.productName === undefined && error && (
        <div className="font-bold text-red-600">Please fill in product&apos;s name!</div>
      )}

      <input
        className={`${field} BrandName`}
        name="brandname"
        placeholder="Brand name"
        value={values.brandname ?? ""}
        onChange={handleChange}
      />
      {values.brandname === undefined && error && (
        <div className="font-bold text-red-600">Please fill in the brand name!</div>
      )}

      <input
        className={`${field} productType`}
        name="producttype"
        placeholder="Product Type"
        value={values.producttype ?? ""}
        onChange={handleChange}
      />
      {values.producttype === undefined && error && (
        <div className="font-bold text-red-600">Please fill in the product type!</div>
      )}

      <div className="flex flex-col items-center justify-center font-sans text-[30px]">
        <p>Does this product fits the CG system?</p>
        <input
          id="radiotrue"
          type="radio"
          name="fitsSystem"
          value="true"
          checked={values.fitsSystem === "true"}
          onChange={handleChangeButtons}
        />
        <label htmlFor="radiotrue">Yes</label>
        <input
          id="radiofalse"
          type="radio"
          name="fitsSystem"
          value="false"
          checked={values.fitsSystem === "false"}
          onChange={handleChangeButtons}
        />
        <label htmlFor="radiofalse">No</label>
      </div>

      <button
        type="button"
        onClick={submit}
        className="curly-rainbow-hover mt-7.5 h-[7vh] self-center rounded-[10px] border-2 border-black bg-mint font-sans text-[40px] text-black"
      >
        Submit now!
      </button>

      {thanks && <p>Thank you! This product has been logged in our database</p>}
    </div>
  );
}
