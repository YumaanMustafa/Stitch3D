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

  /* =========================================================================
     1. LOAD CART & AUTHENTICATION
     This effect runs as soon as the checkout page opens. It checks if the user
     is logged in, loads their shopping cart, and pre-fills their address.
     ========================================================================= */
  useEffect(() => {
    // STEP 1A: Security Check
    // We look in local storage for a "token". This is the user's digital ID card.
    const token = localStorage.getItem("token");
    if (!token) {
      // If they don't have a token, they aren't logged in. 
      // We send them to the login page and tell the login page to send them back here afterwards.
      router.push("/login?redirect=/customer/checkout");
      return;
    }

    // STEP 1B: Load the User's Specific Shopping Cart
    try {
      // The token is actually a secure string with 3 parts separated by dots.
      // We split it, take the middle part (the payload), and decode it using `atob`
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // We extract their unique User ID from the decoded payload
      const userId = payload.id || payload.userId;
      
      // We use their User ID to find THEIR specific cart in local storage (e.g., "cart_123")
      // If we can't find their ID for some reason, we fall back to the default "cart"
      const cartKey = userId ? `cart_${userId}` : 'cart';
      
      // We read the cart data. If there is no data, we use an empty array "[]"
      const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
      
      // We use a tiny timeout to safely update the screen state without crashing React
      setTimeout(() => {
        setCartItems(cart);
      }, 0);
    } catch (e) {
      // If decoding the token fails, we just empty the cart to be safe
      setTimeout(() => {
        setCartItems([]);
      }, 0);
    }

    // STEP 1C: Auto-fill the Shipping Address
    // We ask the backend database for the user's saved profile details
    fetch("/api/customer/profile", {
      headers: { Authorization: `Bearer ${token}` }, // We show our ID card
    })
      .then((res) => res.json())
      .then((data) => {
        // We take the data from the database and plug it directly into our form's starting values!
        setInitialFormValues({
          phone_number: data.phone_number || "",
          address: data.address || "",
          city: data.city || "",
          country: data.country || "Pakistan",
          postal_code: data.postal_code || "",
          // If they have a saved card ending in 4 digits, default to "Card", otherwise "COD" (Cash on Delivery)
          payment_method: data.payment_card_last4 ? "Card" : "COD",
          card_number: data.payment_card_last4 ? `•••• •••• •••• ${data.payment_card_last4}` : "",
          card_expiry: data.payment_card_expiry || "",
          card_cvv: data.payment_card_last4 ? "•••" : "",
        });
      })
      .finally(() => {
        // Once we are completely done loading data, we turn off the loading spinner
        setLoading(false);
      });
  }, [router]); // This empty-ish array means it only runs when the page first loads

  /* =========================================================================
     2. PRICE CALCULATIONS
     We calculate the total cost of the order dynamically based on the cart.
     ========================================================================= */
     
  // STEP 2A: Calculate the Subtotal (the price of the items themselves)
  // useMemo remembers the result so it doesn't recalculate unless the cart changes.
  const subtotal = useMemo(
    () =>
      // `.reduce` loops through every item in the cart.
      // For each item, it takes the price, multiplies it by how many they bought (quantity),
      // and adds it to a running `sum` that starts at 0.
      cartItems.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      ),
    [cartItems]
  );

  // STEP 2B: Calculate Shipping Fee
  // If their subtotal is greater than or equal to the FREE_SHIPPING_THRESHOLD (e.g., 5000), 
  // shipping is 0 (Free!). Otherwise, they pay the standard SHIPPING_FEE.
  const shippingFee =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  // STEP 2C: Calculate Taxes
  // We multiply the subtotal by the TAX_RATE (e.g., 0.17 for 17%) and round it to a whole number.
  const taxAmount = Math.round(subtotal * TAX_RATE);
  
  // STEP 2D: Final Grand Total
  // We add the items, the shipping, and the taxes together.
  const total = subtotal + shippingFee + taxAmount;

  /* =========================================================================
     3. HANDLERS AND SUBMISSIONS
     What happens when they actually click the "Place Order" button.
     ========================================================================= */
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // This function is triggered by the Formik form when it is successfully submitted and validated
  const handlePlaceOrder = async (values, { setSubmitting }) => {
    // Grab the ID card again
    const token = localStorage.getItem("token");

    try {
      /* STEP 3A: Update their Profile Settings */
      // We send their typed-in address back to the database to save it for next time!
      await fetch("/api/customer/profile", {
        method: "POST", // POST means we are sending data TO the server
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json", // We tell the server we are sending JSON data
        },
        body: JSON.stringify(values), // We convert the form data into a text string
      });

      /* STEP 3B: Create the Official Order */
      // We send the cart items and the final calculated prices to the Orders database
      const res = await fetch("/api/customer/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems, // Everything they are buying
          shipping_address: values, // Where to send it
          payment_method: values.payment_method, // How they are paying
          subtotal,
          shipping_fee: shippingFee,
          tax: taxAmount,
          total, // The grand total calculated earlier
        }),
      });

      // If the server rejects the order for some reason, throw an error to trigger the catch block below
      if (!res.ok) throw new Error("Order failed");

      /* STEP 3C: Clean up the Cart */
      // Because the order was successful, they don't need these items in their cart anymore!
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.id || payload.userId;
        const cartKey = userId ? `cart_${userId}` : 'cart';
        localStorage.removeItem(cartKey); // Delete the cart from local storage
      } catch (e) {
        localStorage.removeItem("cart"); // Fallback just in case
      }
      
      // We also tell the global website system that the cart is now empty
      clearCart(); 
      
      /* STEP 3D: Success Redirect */
      // We send them to their order history page, and pass a secret message in the URL (?success=true) 
      // so that page knows to show a confetti celebration!
      router.push("/customer/orders?success=true");
      
    } catch (err) {
      // If ANY step above fails, the code jumps straight down here.
      console.error(err);
      // Show an error popup to the user
      showAlert("Order Error", "Something went wrong while placing your order. Please try again later.", "warning");
    } finally {
      // Whether it succeeded or failed, we tell the form it is no longer "submitting" 
      // so the button becomes clickable again.
      setSubmitting(false);
    }
  };

  if (loading) return null;

  // Render empty cart warning if user has no items to check out
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
