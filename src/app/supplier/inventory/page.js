"use client";
// Import React hooks for managing state and running side effects
import { useState, useEffect } from "react";
// Import icons from lucide-react library to display on buttons and UI elements
import { 
  Plus, Search, Edit, Trash2, MoreVertical, 
  ChevronRight, Filter, ShoppingBag, Eye, Package, Box, X, Save
} from "lucide-react";
// Import custom reusable components for modals and popups
import Modal from "@/app/components/Modal";
import ConfirmationModal from "@/app/components/ConfirmationModal";
// Import Formik and Yup for handling form data and input validation
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";

/**
 * File: page.js
 * Description: Supplier Inventory Management page.
 * Allows suppliers to view, add, edit, search, and delete raw materials.
 */

// Form validation schema using Yup library to make sure user enters valid data
const MaterialSchema = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    type: Yup.string().required("Type is required"),
    price: Yup.number().required("Price is required").min(0),
    stock: Yup.number().required("Stock is required").min(0),
});

// Main component for the Supplier Inventory page
export default function SupplierInventory() {
    // State variable to store the list of inventory items fetched from database
    const [inventory, setInventory] = useState([]);
    // State variable to store the user text input for searching materials
    const [searchQuery, setSearchQuery] = useState("");
    // State variable to track if data is still loading from the server
    const [loading, setLoading] = useState(true);
    // State variable to control whether the Add/Edit form modal is open or closed
    const [modalOpen, setModalOpen] = useState(false);
    // State variable to store the material item currently being edited (null if creating a new one)
    const [editingItem, setEditingItem] = useState(null);
    // State variable to track if an image file is currently being uploaded
    const [uploading, setUploading] = useState(false);
    // State variable to control the confirmation alert popup dialog
    const [conf, setConf] = useState({ open: false, title: "", message: "", type: "warning", onConfirm: () => { }, hideCancel: false });
    
    // Helper function to show a simple notification alert popup
    const showAlert = (title, message, type = "success") => setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => { } });

  // STEP 1: Fetching Inventory Data
  // This asynchronous function asks the database for a list of all raw materials this supplier owns
  async function fetchInventory() {
      try {
          // 1A: Get the digital ID card (token) to prove who we are
          const token = localStorage.getItem("supplierToken");
          
          // 1B: Send a network request to the backend server API
          const res = await fetch("/api/supplier/inventory", {
              // We must attach our token to the 'headers' so the server knows we have permission
              headers: { Authorization: `Bearer ${token}` }
          });
          
          // 1C: Process the server's reply
          if (res.ok) {
              // Convert the raw server data (text) into a Javascript array
              const data = await res.json();
              // Save that array into our React state, which updates the screen with the new items!
              setInventory(data);
          }
      } catch (err) {
          // If the internet cuts out or the server crashes, log it so developers can see the error
          console.error("Load error:", err);
      } finally {
          // 1D: Clean up
          // Whether it worked or failed, we are done loading. Turn off the loading spinner.
          setLoading(false);
      }
  }

  // STEP 2: Automatic Data Loading
  // This `useEffect` hook runs exactly once when the Supplier Inventory page first opens
  useEffect(() => {
      // We use a tiny setTimeout delay (0 milliseconds) as a safe way to trigger the fetch
      // without causing React state warning errors during the initial screen drawing phase.
      setTimeout(() => {
          fetchInventory();
      }, 0);
  }, []); // The empty array [] means "only do this ONCE when the page loads"

  // STEP 3: Saving a New or Edited Material
  // This function is triggered when the user fills out the material form and clicks "Save Material"
  const handleSave = async (values, { setSubmitting, resetForm }) => {
      try {
          // 3A: Authentication
          const token = localStorage.getItem("supplierToken");
          
          // 3B: Determine Action (Create vs Update)
          // If `editingItem` has data, it means we clicked 'Edit' on an existing material, so we use "PUT" (update)
          // If `editingItem` is null, we are creating a brand new material, so we use "POST" (create)
          const method = editingItem ? "PUT" : "POST";
          
          // Similarly, if updating, we need to tell the server exactly *which* item ID to update.
          const url = editingItem ? `/api/supplier/inventory/${editingItem.id}` : "/api/supplier/inventory";
          
          // 3C: Send the Data
          const res = await fetch(url, {
              method, // PUT or POST
              headers: { 
                  "Content-Type": "application/json", // Tell the server we are sending JSON format
                  Authorization: `Bearer ${token}` 
              },
              // Package the form input values into a JSON string to send over the network
              body: JSON.stringify(values)
          });

          // 3D: Handle Success
          if (res.ok) {
              fetchInventory(); // Reload the list from the database to show the new changes
              setModalOpen(false); // Close the popup form
              setEditingItem(null); // Clear the edit state so we are ready for a new item next time
              resetForm(); // Empty the form text boxes
              // Show a green success popup alert
              showAlert("Success", editingItem ? "Material updated." : "Material added.");
          } else {
              // Show a red warning popup if the server rejected our save attempt
              showAlert("Error", "Failed to save material.", "warning");
          }
      } catch (err) {
          showAlert("Error", "Network error.", "warning");
      } finally {
          // 3E: Clean up
          // Turn off the spinning "Saving..." text on the button so the user can click it again
          setSubmitting(false);
      }
  };

  // STEP 4: Deleting a Material
  // This function is triggered when the user clicks the red trash can icon next to a material
  const handleDelete = (id) => {
      // First, we show a popup asking "Are you sure?" so they don't accidentally delete something
      setConf({
          open: true,
          title: "Delete Material",
          message: "Permanently remove this material from inventory?",
          type: "warning",
          hideCancel: false, // Show the 'Cancel' button in case they change their mind
          
          // If they click 'Confirm', this inner function runs:
          onConfirm: async () => {
              try {
                  const token = localStorage.getItem("supplierToken");
                  // Send a network request using the "DELETE" method to completely erase it from the database
                  const res = await fetch(`/api/supplier/inventory/${id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  if (res.ok) {
                      // 4A: Instant Screen Update
                      // Instead of waiting to fetch the entire inventory again, we just quickly filter out 
                      // the deleted item from our current React state list so it vanishes instantly!
                      setInventory(prev => prev.filter(i => i.id !== id));
                      
                      // 4B: Close the confirmation popup
                      setConf({ ...conf, open: false });
                      // Show a green success message
                      showAlert("Deleted", "Material removed from system.");
                  }
              } catch (err) {
                  // Silently ignore network errors during delete to prevent console spam
              }
          }
      });
  };

    // Filter inventory items based on what user typed in search bar (matches name or type)
    const filtered = inventory.filter(p => 
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.type || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {/* Header section with title, description, and Add Material button */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                   <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Supply</h2>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Raw Materials</h1>
                   <p className="text-sm font-medium text-slate-500 mt-2">Manage your material stock levels and categories.</p>
                </div>
                {/* Button to open form modal for adding a brand new material */}
                <button 
                  onClick={() => { setEditingItem(null); setModalOpen(true); }}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all shadow-xl shadow-slate-200 flex items-center gap-3"
                >
                   <Plus size={18} /> Add Material
                </button>
            </div>

            {/* Control bar containing search input box */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   {/* Text input to filter inventory list by search keyword */}
                   <input
                     type="text"
                     placeholder="SEARCH MATERIALS..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-[#F97316] transition-all"
                   />
                </div>
            </div>

            {/* Inventory Data Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        {/* Table Header Row */}
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Material Info</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Type</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Price per Unit</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Stock Level</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        {/* Table Body Content */}
                        <tbody className="divide-y divide-slate-50">
                            {/* Conditional Rendering: Show loading message if data is still fetching */}
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Loading Inventory...</td></tr>
                            ) : filtered.length === 0 ? (
                                /* Show empty state message if no matching materials are found */
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No materials found</td></tr>
                            ) : (
                                /* Loop through each filtered material item and display a table row */
                                filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* Material image, name, and ID column */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-300 group-hover:scale-105 group-hover:bg-[#F97316] group-hover:text-white transition-all">
                                                   {/* Show image thumbnail if exists, otherwise show default box icon */}
                                                   {item.image ? (
                                                       <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                   ) : (
                                                       <Box size={24} />
                                                   )}
                                                </div>
                                                <div>
                                                   <h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">{item.name}</h3>
                                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: #{item.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Category / Type column */}
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{item.type}</span>
                                        </td>
                                        {/* Unit Price formatted with local currency style */}
                                        <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tighter">Rs {Number(item.price).toLocaleString()}</td>
                                        {/* Stock quantity column with visual status dot (green for >10, red for <=10) */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                               <div className={`w-1.5 h-1.5 rounded-full ${item.stock > 10 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                               <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.stock} Units</span>
                                            </div>
                                        </td>
                                        {/* Edit and Delete action buttons column */}
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Button to edit this item */}
                                                <button onClick={() => { setEditingItem(item); setModalOpen(true); }} className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                                                    <Edit size={18} />
                                                </button>
                                                {/* Button to delete this item */}
                                                <button onClick={() => handleDelete(item.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal for Adding or Editing a Raw Material */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Edit Material" : "Add New Material"} maxWidth="max-w-xl">
                {/* Formik form container */}
                <Formik
                    initialValues={{
                        name: editingItem?.name || "",
                        type: editingItem?.type || "",
                        price: editingItem?.price || "",
                        stock: editingItem?.stock || "",
                        size: editingItem?.size || "",
                        image: editingItem?.image || "",
                        status: editingItem?.status || "Active"
                    }}
                    validationSchema={MaterialSchema}
                    enableReinitialize
                    onSubmit={handleSave}
                >
                    {({ isSubmitting, errors, touched, values, setFieldValue }) => (
                        <Form className="space-y-6 p-4">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Material Name input field */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Material Name</label>
                                    <Field name="name" placeholder="E.G. PREMIUM LEATHER" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-[#FFFFFF] rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                                    {errors.name && touched.name && <p className="text-[8px] text-rose-500 font-black uppercase mt-1 px-1">{errors.name}</p>}
                                </div>
                                {/* Material Type dropdown select field */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Material Type</label>
                                    <Field name="type" as="select" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-[#FFFFFF] rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all">
                                        <option value="">Select Type</option>
                                        <option value="Leather">Leather</option>
                                        <option value="Fabric">Fabric</option>
                                        <option value="Hardware">Hardware</option>
                                        <option value="Textile">Textile</option>
                                    </Field>
                                </div>
                                {/* Material Image upload section (supports image URL or file upload) */}
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Material Image</label>
                                    <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                                        {/* Image preview box */}
                                        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                                            {values.image ? (
                                                <img src={values.image} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Box className="text-slate-300" size={32} />
                                            )}
                                            {/* Show spinning loader indicator while image file uploads */}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Input fields for Image URL and File Upload trigger */}
                                        <div className="flex-1 w-full space-y-2">
                                            <div className="flex gap-2">
                                                <Field name="image" placeholder="PASTE IMAGE URL..." className="flex-1 px-4 py-3 bg-white border-2 border-slate-100 focus:border-[#F97316] rounded-xl text-[10px] font-black uppercase tracking-widest outline-none transition-all" />
                                                <label className="px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all cursor-pointer inline-flex items-center justify-center flex-shrink-0">
                                                    {uploading ? "Uploading..." : "Upload File"}
                                                    {/* Hidden file input element */}
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*" 
                                                        disabled={uploading}
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            setUploading(true);
                                                            try {
                                                                const token = localStorage.getItem("supplierToken");
                                                                const formData = new FormData();
                                                                formData.append("image", file);
                                                                
                                                                // Upload file to server API
                                                                const res = await fetch("/api/supplier/inventory/upload", {
                                                                    method: "POST",
                                                                    headers: {
                                                                        Authorization: `Bearer ${token}`
                                                                    },
                                                                    body: formData
                                                                });
                                                                const data = await res.json();
                                                                if (res.ok && data.imagePath) {
                                                                    // Update image field value in Formik
                                                                    setFieldValue("image", data.imagePath);
                                                                } else {
                                                                    showAlert("Error", data.error || "Upload failed", "warning");
                                                                }
                                                            } catch (err) {
                                                                console.error("Upload error:", err);
                                                                showAlert("Error", "Failed to upload image", "warning");
                                                            } finally {
                                                                setUploading(false);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Type an image link or upload a local image file directly.</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Price input field */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Price (Rs)</label>
                                    <Field name="price" type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-[#FFFFFF] rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                                </div>
                                {/* Stock units input field */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Stock Units</label>
                                    <Field name="stock" type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-[#FFFFFF] rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                                </div>
                            </div>
                            {/* Modal Action Buttons: Cancel and Save */}
                            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] shadow-xl transition-all flex items-center gap-2">
                                    <Save size={16} /> {isSubmitting ? "Saving..." : "Save Material"}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Modal>

            {/* Reusable confirmation modal dialog */}
            <ConfirmationModal isOpen={conf.open} onClose={() => setConf({ ...conf, open: false })} onConfirm={conf.onConfirm} title={conf.title} message={conf.message} type={conf.type} hideCancel={conf.hideCancel} confirmText="Confirm" />
        </div>
    );
}

