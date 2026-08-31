"use client";

import { useState } from "react";
import { TextField } from "@/components/TextField";
import { BrandField } from "@/components/BrandField";

export const ProductForm = () => {
  const [values, setValues] = useState<{
    productName?: string;
    brandName?: string;
    productType?: string;
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
        brandname: values.brandName,
        productType: values.productType,
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

  const choice =
    "flex-1 cursor-pointer rounded-full border py-2.5 text-center text-sm font-medium transition-colors";

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Add a product
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Help the database grow. Anything you add shows up in search.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-bad-bg px-3.5 py-3 text-[13px] text-bad">
          Something went wrong, please try again.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <TextField
          name="productName"
          label="Product name"
          value={values.productName ?? ""}
          onChange={handleChange}
          error={
            values.productName === undefined && error
              ? "Please fill in the product's name."
              : undefined
          }
        />

        <BrandField
          value={values.brandName ?? ""}
          onChange={(brandname) =>
            setValues((prev) => ({ ...prev, brandName: brandname }))
          }
          error={
            values.brandName === undefined && error
              ? "Please fill in the brand name."
              : undefined
          }
        />

        <TextField
          name="productType"
          label="Product type"
          value={values.productType ?? ""}
          onChange={handleChange}
          error={
            values.productType === undefined && error
              ? "Please fill in the product type."
              : undefined
          }
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs text-muted">
            Does this product fit the CG method?
          </legend>

          <div className="mt-1.5 flex gap-2.5">
            <label
              htmlFor="radiotrue"
              className={`${choice} ${
                values.fitsSystem === "true"
                  ? "border-ok bg-ok-bg text-ok"
                  : "border-line text-ink"
              }`}
            >
              <input
                id="radiotrue"
                type="radio"
                name="fitsSystem"
                value="true"
                checked={values.fitsSystem === "true"}
                onChange={handleChangeButtons}
                className="sr-only"
              />
              Yes
            </label>

            <label
              htmlFor="radiofalse"
              className={`${choice} ${
                values.fitsSystem === "false"
                  ? "border-bad bg-bad-bg text-bad"
                  : "border-line text-ink"
              }`}
            >
              <input
                id="radiofalse"
                type="radio"
                name="fitsSystem"
                value="false"
                checked={values.fitsSystem === "false"}
                onChange={handleChangeButtons}
                className="sr-only"
              />
              No
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={submit}
          className="mt-2 w-full rounded-full bg-brand py-3.5 text-[15px] font-bold text-bg"
        >
          Submit
        </button>

        {thanks && (
          <p className="rounded-xl bg-ok-bg px-3.5 py-3 text-[13px] text-ok">
            Thank you! This product has been logged in our database.
          </p>
        )}
      </div>
    </div>
  );
};
