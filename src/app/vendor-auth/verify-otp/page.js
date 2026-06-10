"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Cookies from "js-cookie";
import axios from "axios";
import ConfirmationModal from "@/app/components/ConfirmationModal";

/**
 * @file page.js
 * @description Vendor OTP Verification.
 * Verifies email via OTP code during registration/login.
 */

const VerifyOTPSchema = Yup.object().shape({
  otp: Yup.string()
    .length(6, "Please enter a valid 6-digit OTP")
    .matches(/^[0-9]+$/, "OTP must be numeric")
    .required("OTP is required"),
});

export default function VerifyOTP() {
  const router = useRouter();
  const email = Cookies.get("tempVendorEmail");

  // Custom Alert State
  const [conf, setConf] = useState({ 
    open: false, 
    title: "", 
    message: "", 
    type: "warning", 
    onConfirm: () => {}, 
    hideCancel: false 
  });

  const showAlert = (title, message, type = "success") => {
    setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => {} });
  };

  const handleVerify = async (values, { setSubmitting }) => {
    try {
      const res = await axios.post("/api/vendor/verify-otp", {
        email,
        otp: values.otp,
      });

      if (res.data.success) {
        Cookies.set("vendorToken", res.data.token);
        Cookies.remove("tempVendorEmail");
        router.push("/vendor/dashboard");
      } else {
        showAlert("Invalid OTP", "The code you entered is incorrect. Please try again.", "warning");
      }
    } catch (err) {
      showAlert("Verification Error", "Something went wrong during verification. Please try again later.", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 p-4">
      <Formik
        initialValues={{ otp: "" }}
        validationSchema={VerifyOTPSchema}
        onSubmit={handleVerify}
      >
        {({ isSubmitting }) => (
          <Form className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
              Verify OTP
            </h1>
            <div className="mb-4">
              <Field
                type="text"
                name="otp"
                placeholder="Enter OTP"
                maxLength={6}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <ErrorMessage name="otp" component="div" className="text-rose-500 text-xs mt-1" />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-70"
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>
          </Form>
        )}
      </Formik>

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
