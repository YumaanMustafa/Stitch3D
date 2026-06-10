"use client";
import Logo from '@/app/components/Logo';
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Truck, CheckCircle, AlertCircle, CreditCard, Banknote } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Footer from '@/app/components/AppFooter';
import { useCart } from "@/app/context/CartContext";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";

/**
 * @file page.js
 * @description Checkout Page.
 * Collects shipping details and places the order via `/api/customer/orders`.
 * Handles COD payment method logic.
 */

const SHIPPING_FEE = 500;
const FREE_SHIPPING_THRESHOLD = 5000;
const TAX_RATE = 0.17;

const CheckoutSchema = Yup.object().shape({
  phone_number: Yup.string().required("Phone number is required"),
  address: Yup.string().required("Shipping address is required"),
  city: Yup.string().required("City is required"),
  country: Yup.string().required("Country is required"),
  postal_code: Yup.string().required("Postal code is required"),
  payment_method: Yup.string().oneOf(["COD", "Card"]).required("Payment method is required"),
  card_number: Yup.string().when("payment_method", {
    is: "Card",
    then: (schema) => schema.required("Card number is required").matches(/^(\d{16}|•••• •••• •••• \d{4})$/, "Invalid card format"),
    otherwise: (schema) => schema.notRequired()
  }),
  card_expiry: Yup.string().when("payment_method", {
    is: "Card",
    then: (schema) => schema.required("Expiry is required").matches(/^(0[1-9]|1[0-2])\/\d{2}$/, "MM/YY"),
    otherwise: (schema) => schema.notRequired()
  }),
  card_cvv: Yup.string().when("payment_method", {
    is: "Card",
    then: (schema) => schema.required("CVV is required").matches(/^(\d{3}|•••)$/, "Invalid CVV"),
    otherwise: (schema) => schema.notRequired()
  }),
});

export default function CheckoutPage() {
  const router = useRouter();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);

  // Custom Alert State
  const [conf, setConf] = useState({
    open: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: () => { },
    hideCancel: false
  });

  const showAlert = (title, message, type = "success") => {
    setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => { } });
  };

  const [initialFormValues, setInitialFormValues] = useState({
    phone_number: "",
    address: "",
    city: "",
    country: "Pakistan",
    postal_code: "",
    payment_method: "COD",
    card_number: "",
    card_expiry: "",
    card_cvv: "",
  });

  /* =========================
     LOAD CART + AUTH
  ========================== */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login?redirect=/customer/checkout");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id || payload.userId;
      const cartKey = userId ? `cart_${userId}` : 'cart';
      const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
      setCartItems(cart);
    } catch (e) {
      setCartItems([]);
    }

    fetch("/api/customer/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setInitialFormValues({
          phone_number: data.phone_number || "",
          address: data.address || "",
          city: data.city || "",
          country: data.country || "Pakistan",
          postal_code: data.postal_code || "",
          payment_method: data.payment_card_last4 ? "Card" : "COD",
          card_number: data.payment_card_last4 ? `•••• •••• •••• ${data.payment_card_last4}` : "",
          card_expiry: data.payment_card_expiry || "",
          card_cvv: data.payment_card_last4 ? "•••" : "",
        });
      })
      .finally(() => setLoading(false));
  }, [router]);

  /* =========================
     PRICE CALCULATIONS
  ========================== */
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      ),
    [cartItems]
  );

  const shippingFee =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  const taxAmount = Math.round((subtotal + shippingFee) * TAX_RATE);
  const total = subtotal + shippingFee + taxAmount;

  /* =========================
     HANDLERS
  ========================== */
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePlaceOrder = async (values, { setSubmitting }) => {
    const token = localStorage.getItem("token");

    try {
      /* 1️⃣ SAVE CUSTOMER PROFILE */
      await fetch("/api/customer/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      /* 2️⃣ PLACE ORDER (COD) */
      const res = await fetch("/api/customer/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems,
          shipping_address: values,
          payment_method: values.payment_method,
          subtotal,
          shipping_fee: shippingFee,
          tax: taxAmount,
          total,
        }),
      });

      if (!res.ok) throw new Error("Order failed");

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.id || payload.userId;
        const cartKey = userId ? `cart_${userId}` : 'cart';
        localStorage.removeItem(cartKey);
      } catch (e) {
        localStorage.removeItem("cart"); // Fallback
      }
      clearCart(); // NEW: sync context!
      router.push("/customer/orders?success=true");
    } catch (err) {
      console.error(err);
      showAlert("Order Error", "Something went wrong while placing your order. Please try again later.", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-orange-500" />
        <p className="mt-4 font-semibold">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10">
        {/* SHIPPING FORM */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Truck /> Shipping Details
          </h2>

          <Formik
            initialValues={initialFormValues}
            validationSchema={CheckoutSchema}
            enableReinitialize={true}
            onSubmit={handlePlaceOrder}
          >
            {({ isSubmitting, values, setFieldValue }) => (
              <Form>
                <Field
                  label="Phone Number"
                  name="phone_number"
                  component={FormikInput}
                />
                <Field
                  label="Address"
                  name="address"
                  component={FormikInput}
                />
                <Field
                  label="City"
                  name="city"
                  component={FormikInput}
                />
                <Field
                  label="Postal Code"
                  name="postal_code"
                  component={FormikInput}
                />
                <Field
                  label="Country"
                  name="country"
                  component={FormikInput}
                />

                <div className="mt-8 mb-6">
                  <h3 className="font-bold text-md mb-4 flex items-center gap-2">
                    <CreditCard size={20} /> Payment Method
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => values.payment_method !== "COD" && setFieldValue("payment_method", "COD")}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${values.payment_method === "COD" ? "border-orange-500 bg-orange-50" : "border-slate-100 hover:border-slate-200"}`}
                    >
                      <Banknote className={values.payment_method === "COD" ? "text-orange-600" : "text-slate-400"} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${values.payment_method === "COD" ? "text-orange-600" : "text-slate-400"}`}>Cash on Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => values.payment_method !== "Card" && setFieldValue("payment_method", "Card")}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${values.payment_method === "Card" ? "border-orange-500 bg-orange-50" : "border-slate-100 hover:border-slate-200"}`}
                    >
                      <CreditCard className={values.payment_method === "Card" ? "text-orange-600" : "text-slate-400"} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${values.payment_method === "Card" ? "text-orange-600" : "text-slate-400"}`}>Credit Card</span>
                    </button>
                  </div>
                </div>

                {values.payment_method === "Card" && (
                  <div className="mt-6 p-6 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 animate-fade-in">
                    <Field
                      label="Card Number"
                      name="card_number"
                      placeholder="0000 0000 0000 0000"
                      component={FormikInput}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Expiry (MM/YY)"
                        name="card_expiry"
                        placeholder="12/25"
                        component={FormikInput}
                      />
                      <Field
                        label="CVV"
                        name="card_cvv"
                        placeholder="123"
                        component={FormikInput}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex gap-2">
                  <CheckCircle className="text-emerald-600" />
                  <p className="text-sm text-emerald-800 italic font-medium">
                    {values.payment_method === "COD" ? "You'll pay when your order arrives." : "Secure payment will be processed immediately."}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="solid"
                  className="mt-6 w-full"
                >
                  {isSubmitting
                    ? "Placing Order..."
                    : `Place Order (Rs. ${total.toLocaleString("en-PK")})`}
                </Button>
              </Form>
            )}
          </Formik>
        </div>

        {/* ORDER SUMMARY */}
        <div className="bg-white p-6 rounded-xl shadow h-fit">
          <h2 className="font-bold text-lg mb-4">Order Summary</h2>

          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm mb-2">
              <span>{item.title} × {item.quantity}</span>
              <span>Rs. {(item.price * item.quantity).toLocaleString("en-PK")}</span>
            </div>
          ))}

          <hr className="my-4" />

          <Summary label="Subtotal" value={subtotal} />
          <Summary label="Shipping" value={shippingFee} />
          <Summary label="Tax" value={taxAmount} />

          <div className="flex justify-between font-extrabold mt-4">
            <span>Total</span>
            <span>Rs. {total.toLocaleString("en-PK")}</span>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={conf.open}
        onClose={() => setConf({ ...conf, open: false })}
        onConfirm={conf.onConfirm}
        title={conf.title}
        message={conf.message}
        type={conf.type}
        hideCancel={conf.hideCancel}
        confirmText="OK"
      />
    </div>
  );
}

/* =========================
   COMPONENTS
========================== */

function FormikInput({ label, field, form: { touched, errors }, ...props }) {
  return (
    <div className="mb-4">
      <Input
        label={label}
        {...field}
        {...props}
        error={errors[field.name]}
        touched={touched[field.name]}
      />
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="flex justify-between text-sm mb-2">
      <span>{label}</span>
      <span>Rs. {value.toLocaleString("en-PK")}</span>
    </div>
  );
}
