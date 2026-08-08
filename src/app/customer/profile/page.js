"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  Pencil,
  X,
  LogOut,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Shield,
  Mail,
  Settings,
  ShoppingBag,
  Phone,
  Camera
} from "lucide-react";
import Footer from '@/app/components/AppFooter';
import UserAvatarMenu from '@/app/components/AppUserAvatar';
import Logo from '@/app/components/Logo';
import AccountLayout from "../components/AccountLayout";

/**
 * @file page.js
 * @description Customer Profile Page.
 * View and Edit personal details (Name, Address, Phone).
 * Updates user profile via `/api/auth/profile`.
 */

const API_BASE = "/api/auth";

const PersonalSchema = Yup.object().shape({
  firstName: Yup.string().required("First name is required"),
  lastName: Yup.string().required("Last name is required"),
});

const ContactSchema = Yup.object().shape({
  phone_number: Yup.string().required("Phone number is required"),
  address: Yup.string().required("Address is required"),
  city: Yup.string().required("City is required"),
  country: Yup.string().required("Country is required"),
  postal_code: Yup.string().required("Postal code is required"),
});

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone_number: "",
    address: "",
    city: "",
    country: "",
    postal_code: ""
  });

  const [alert, setAlert] = useState({ type: "", message: "" });
  const [uploadingImage, setUploadingImage] = useState(false);

  const token = () => (typeof window === "undefined" ? null : localStorage.getItem("token"));

  const showAlert = (type, message, ms = 4000) => {
    setAlert({ type, message });
    if (ms) setTimeout(() => setAlert({ type: "", message: "" }), ms);
  };

  // This effect runs automatically when the Profile page loads
  useEffect(() => {
    // STEP 1: Verify the User
    // Get the user's security token (which proves they are logged in) from local storage
    const t = token();
    if (!t) {
      // If they don't have a token, kick them back to the login screen immediately
      router.replace("/login");
      return;
    }

    // STEP 2: Fetch Data from the Database
    // We create an async function to ask the backend server for this user's profile details
    const fetchProfile = async () => {
      try {
        // We use fetch to call the backend API endpoint (`/api/auth/profile`)
        const res = await fetch(`${API_BASE}/profile`, {
          // We attach the token in the headers so the server knows exactly who is asking
          headers: { Authorization: `Bearer ${t}` }
        });
        
        // Convert the server's text response into a JavaScript object
        const data = await res.json();

        // If the server says something went wrong (e.g., error 404 or 500)
        if (!res.ok) throw new Error("Failed to fetch profile");

        // Save all the raw profile data into our React state variable (`profile`)
        setProfile(data);

        // STEP 3: Auto-fill the Form Fields
        // We need to split the data. The backend sends generic 'user' data (name, email)
        // and specific 'customer' data (address, phone number) separated.
        const customer = data.customer || {}; // If they have no customer data yet, use an empty object
        
        // We set the initial values of our text boxes to whatever the database just gave us
        setInitialFormValues({
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          email: data.email || "",
          phone_number: customer.phone_number || "",
          address: customer.address || "",
          city: customer.city || "",
          country: customer.country || "",
          postal_code: customer.postal_code || ""
        });
      } catch (err) {
        // If there was a network error or the server crashed, log it for developers
        console.error("Profile fetch error:", err);
        // Show a red error popup to the user
        showAlert("error", "Failed to load profile information");
      } finally {
        // STEP 4: Clean up
        // Whether it succeeded or failed, turn off the loading spinner so they can see the screen
        setLoading(false);
      }
    };

    fetchProfile(); // Actually run the async function we just defined
  }, [router]); // This empty array means it runs exactly once when the component mounts

  const handleInputChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const cancelEdit = () => {
    if (!profile) return;
    const customer = profile.customer || {};
    setForm({
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      email: profile.email,
      phone_number: customer.phone_number || "",
      address: customer.address || "",
      city: customer.city || "",
      country: customer.country || "",
      postal_code: customer.postal_code || ""
    });
    setEditing(false);
  };

  // This function runs when the user clicks "Save Changes" on their profile form
  const handleUpdateProfile = async (values, { setSubmitting }) => {
    try {
      // STEP 1: Send the new edited values to the backend server
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT", // PUT is the HTTP method used when we want to UPDATE existing data
        headers: {
          "Content-Type": "application/json", // Tell the server we are sending JSON data
          Authorization: `Bearer ${token()}` // Show our digital ID card
        },
        // We package all the form inputs into a JSON string to send over the internet
        // Notice how we put the address details inside a nested 'customer' object, matching what the backend expects
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          customer: {
            phone_number: values.phone_number || null,
            address: values.address || null,
            city: values.city || null,
            country: values.country || null,
            postal_code: values.postal_code || null
          }
        }),
      });

      // Parse the server's response
      const data = await res.json();
      
      // STEP 2: Check for Server Errors
      // If the server rejected the update (e.g., invalid phone number format)
      if (!res.ok) throw new Error(data.message || "Update failed");
      
      // STEP 3: Update the Screen with the New Data
      // We manually update our React state so the new name/address shows up instantly
      // without needing to refresh the webpage.
      setProfile(data.user ? { ...data.user, customer: data.customer } : data);

      const newCustomer = (data.user ? data.customer : data.customer) || {};
      const newUser = data.user || data;
      
      // Also update the hidden form values, so if they click 'Edit' again, it shows the new data
      setInitialFormValues({
        firstName: newUser.first_name || "",
        lastName: newUser.last_name || "",
        email: newUser.email || "",
        phone_number: newCustomer.phone_number || "",
        address: newCustomer.address || "",
        city: newCustomer.city || "",
        country: newCustomer.country || "",
        postal_code: newCustomer.postal_code || ""
      });

      // STEP 4: Success Cleanup
      // Turn off editing mode (changes the Save button back to a Pencil icon)
      setEditing(false);
      setEditingContact(false);
      // Show a green success popup at the bottom of the screen
      showAlert("success", "Profile updated successfully");
      
    } catch (err) {
      // If anything crashed, log it and show a red error popup
      console.error("Update error:", err);
      showAlert("error", err.message);
    } finally {
      // STEP 5: Final Cleanup
      // Turn off the "Saving..." spinning state on the button so they can click it again
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploadingImage(true);
    try {
      const res = await fetch(`${API_BASE}/profile/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setProfile({ ...profile, profile_image: data.imagePath });
      showAlert("success", "Profile picture updated");
    } catch (err) {
      console.error("Upload error:", err);
      showAlert("error", err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const initials = profile ? (profile.first_name?.[0] || "U").toUpperCase() : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-orange-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-zinc-400 font-medium">Loading your profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <AccountLayout>
      <div className="space-y-6">
        <Formik
          initialValues={initialFormValues}
          validationSchema={editing ? PersonalSchema : ContactSchema}
          enableReinitialize={true}
          onSubmit={handleUpdateProfile}
        >
          {({ isSubmitting, resetForm, dirty }) => (
            <Form>
              {/* Profile Header / Avatar Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-6 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2rem] bg-orange-600 text-white flex items-center justify-center text-4xl font-black shadow-xl overflow-hidden relative border-4 border-white ring-1 ring-slate-100">
                    {profile.profile_image ? (
                      <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-400 hover:text-[#F97316]">
                    <Camera size={18} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                </div>
                <div className="text-center md:text-left relative z-10">
                  <h2 className="text-3xl font-black text-[#1E293B] tracking-tight">{profile.first_name} {profile.last_name}</h2>
                  <p className="text-slate-500 font-bold mt-1">{profile.email}</p>
                  <div className="mt-4 flex items-center justify-center md:justify-start gap-2">
                    <span className="px-3 py-1 bg-orange-50 text-[#F97316] text-[10px] font-black uppercase tracking-widest rounded-full border border-orange-100">
                      {profile.role}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                      Verified Account
                    </span>
                  </div>
                </div>
              </div>

              <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 text-[#F97316] rounded-xl">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#1E293B] text-lg">Personal Details</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-sm font-bold text-[#F97316] hover:bg-orange-50 px-4 py-2 rounded-xl transition-all border border-orange-100"
                      >
                        <Pencil className="w-4 h-4 inline-block mr-2" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-8 md:p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Field
                      label="First Name"
                      name="firstName"
                      disabled={!editing}
                      component={SecurityInput}
                    />
                    <Field
                      label="Last Name"
                      name="lastName"
                      disabled={!editing}
                      component={SecurityInput}
                    />
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          disabled
                          value={initialFormValues.email}
                          className="block w-full pl-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-400 text-sm font-bold py-4 px-4 cursor-not-allowed"
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 ml-1">
                        <Shield className="w-3.5 h-3.5" />
                        Email cannot be changed for security
                      </p>
                    </div>

                    {editing && (
                      <div className="md:col-span-2 flex items-center gap-4 pt-4">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-8 py-3.5 bg-[#F97316] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-[#e66000] transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                        >
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetForm();
                            setEditing(false);
                          }}
                          className="px-8 py-3.5 bg-slate-100 text-slate-600 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-12 pt-12 border-t border-slate-50">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Phone className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-[#1E293B] text-lg">Contact Information</h3>
                      </div>
                      {!editingContact && (
                        <button
                          type="button"
                          onClick={() => setEditingContact(true)}
                          className="text-sm font-bold text-[#F97316] hover:bg-orange-50 px-4 py-2 rounded-xl transition-all border border-orange-100"
                        >
                          <Pencil className="w-4 h-4 inline-block mr-2" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Field
                        label="Phone Number"
                        name="phone_number"
                        type="tel"
                        disabled={!editingContact}
                        component={SecurityInput}
                      />
                      <Field
                        label="City"
                        name="city"
                        disabled={!editingContact}
                        component={SecurityInput}
                      />
                      <div className="md:col-span-2">
                        <Field
                          label="Address"
                          name="address"
                          disabled={!editingContact}
                          component={SecurityInput}
                        />
                      </div>
                      <Field
                        label="Country"
                        name="country"
                        disabled={!editingContact}
                        component={SecurityInput}
                      />
                      <Field
                        label="Postal Code"
                        name="postal_code"
                        disabled={!editingContact}
                        component={SecurityInput}
                      />

                      {editingContact && (
                        <div className="md:col-span-2 flex items-center gap-4 pt-4">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-3.5 bg-[#F97316] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-[#e66000] transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                          >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              resetForm();
                              setEditingContact(false);
                            }}
                            className="px-8 py-3.5 bg-slate-100 text-slate-600 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </Form>
          )}
        </Formik>
      </div>

      <AnimatePresence>
        {alert.message && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 p-5 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-sm backdrop-blur-md ${alert.type === 'error'
              ? 'bg-rose-50 border-rose-100 text-rose-800'
              : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}
          >
            {alert.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
            <p className="text-sm font-bold">{alert.message}</p>
            <button onClick={() => setAlert({ type: "", message: "" })} className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AccountLayout>
  );
}

function SecurityInput({ label, disabled, field, form: { touched, errors }, ...props }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input
        {...field}
        {...props}
        disabled={disabled}
        className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-slate-700 font-bold text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all outline-none ${disabled ? 'opacity-70 bg-slate-50 cursor-not-allowed border-slate-100' : 'border-slate-100 hover:border-slate-200'} ${touched[field.name] && errors[field.name] ? 'border-rose-200' : ''}`}
      />
      {touched[field.name] && errors[field.name] && (
        <div className="mt-2 text-xs text-rose-500 font-bold ml-1 uppercase">{errors[field.name]}</div>
      )}
    </div>
  );
}

function FormikInput({ label, disabled, field, form: { touched, errors }, ...props }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input
        disabled={disabled}
        className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-slate-700 font-bold text-sm placeholder-slate-400 transition-all outline-none ${disabled
          ? "opacity-70 bg-slate-50 border-slate-100 cursor-not-allowed"
          : "border-slate-100 hover:border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316]"
          } ${touched[field.name] && errors[field.name] ? 'border-rose-200' : ''}`}
        {...field}
        {...props}
      />
      {touched[field.name] && errors[field.name] && (
        <div className="mt-2 text-xs text-rose-500 font-bold ml-1 uppercase">{errors[field.name]}</div>
      )}
    </div>
  );
}