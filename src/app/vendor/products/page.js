"use client";
import { useState, useEffect } from "react";
import { 
  Plus, Search, Edit, Trash2, MoreVertical, 
  ChevronRight, Filter, ShoppingBag, Eye, Package, X, Save
} from "lucide-react";
import Modal from "@/app/components/Modal";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";

/**
 * @file page.js
 * @description Vendor Product Management - Full CRUD & Modern Light Theme.
 */

const ProductSchema = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    price: Yup.number().required("Price is required").min(0),
    stock: Yup.number().required("Stock is required").min(0),
    category: Yup.string().required("Category is required"),
});

export default function VendorProducts() {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [conf, setConf] = useState({ open: false, title: "", message: "", type: "warning", onConfirm: () => { }, hideCancel: false });
    
    const showAlert = (title, message, type = "success") => setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => { } });

    useEffect(() => {
        fetchProducts();
    }, []);

    // PRIVILEGE 1: View Own Inventory
    // Vendors can only fetch the products they created themselves. The backend uses their
    // token to filter the database so they never see or edit a competitor's products.
    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem("vendorToken");
            const res = await fetch("/api/vendor/products", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error("Load error:", err);
        } finally {
            setLoading(false);
        }
    };

    // PRIVILEGE 2: Create & Update Products
    // Vendors have the authority to add new items to their catalog or change prices and stock.
    const handleSave = async (values, { setSubmitting, resetForm }) => {
        try {
            const token = localStorage.getItem("vendorToken");
            const method = editingProduct ? "PUT" : "POST";
            const url = editingProduct ? `/api/vendor/products/${editingProduct.id}` : "/api/vendor/products";
            
            const res = await fetch(url, {
                method,
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(values)
            });

            if (res.ok) {
                fetchProducts();
                setModalOpen(false);
                setEditingProduct(null);
                resetForm();
                showAlert("Success", editingProduct ? "Product updated." : "Product added.");
            } else {
                showAlert("Error", "Failed to save product.", "warning");
            }
        } catch (err) {
            showAlert("Error", "Network error occurred.", "warning");
        } finally {
            setSubmitting(false);
        }
    };

    // PRIVILEGE 3: Remove Products
    // Vendors can delete their own products from the system entirely.
    const handleDelete = async (id) => {
        setConf({
            open: true,
            title: "Delete Product",
            message: "Are you sure you want to remove this product?",
            type: "warning",
            hideCancel: false,
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem("vendorToken");
                    const res = await fetch(`/api/vendor/products/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setProducts(prev => prev.filter(p => p.id !== id));
                        setConf({ ...conf, open: false });
                        showAlert("Success", "Product removed successfully.");
                    }
                } catch (err) {
                    showAlert("Error", "Failed to delete product.", "warning");
                }
            }
        });
    };

    const filteredProducts = products.filter(p => 
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                   <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Inventory</h2>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">My Products</h1>
                   <p className="text-sm font-medium text-slate-500 mt-2">Manage your collection and update availability.</p>
                </div>
                <button 
                  onClick={() => { setEditingProduct(null); setModalOpen(true); }}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all shadow-xl shadow-slate-200 flex items-center gap-3"
                >
                   <Plus size={18} /> Add Product
                </button>
            </div>

            {/* Control Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input
                     type="text"
                     placeholder="SEARCH PRODUCTS..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-[#F97316] transition-all"
                   />
                </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Product Info</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Category</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Price</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory</th>
                                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Loading Products...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No products found</td></tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform">
                                                   <img src={product.image || 'https://images.unsplash.com/photo-1551028919-ac7fa7ea40bd?q=80&w=200'} alt={product.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                   <h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">{product.name}</h3>
                                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: #{product.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{product.category}</span>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tighter">Rs {Number(product.price).toLocaleString()}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                               <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 10 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                               <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{product.stock} In Stock</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { setEditingProduct(product); setModalOpen(true); }} className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(product.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
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

            {/* PRODUCT MODAL */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? "Edit Product" : "Add New Product"} maxWidth="max-w-xl">
                <Formik
                    initialValues={{
                        name: editingProduct?.name || "",
                        price: editingProduct?.price || "",
                        stock: editingProduct?.stock || "",
                        category: editingProduct?.category || "",
                        image: editingProduct?.image || "",
                        status: editingProduct?.status || "Active"
                    }}
                    validationSchema={ProductSchema}
                    enableReinitialize
                    onSubmit={handleSave}
                >
                    {({ isSubmitting, errors, touched, values, setFieldValue }) => (
                        <Form className="space-y-6 p-4">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Product Title</label>
                                    <Field name="name" placeholder="E.G. CLASSIC LEATHER JACKET" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                                    {errors.name && touched.name && <p className="text-[8px] text-rose-500 font-black uppercase mt-1 px-1">{errors.name}</p>}
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Product Image</label>
                                    <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                                        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                                            {values.image ? (
                                                <img src={values.image} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="text-slate-300" size={32} />
                                            )}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 w-full space-y-2">
                                            <div className="flex gap-2">
                                                <Field name="image" placeholder="PASTE IMAGE URL..." className="flex-1 px-4 py-3 bg-white border-2 border-slate-100 focus:border-[#F97316] rounded-xl text-[10px] font-black uppercase tracking-widest outline-none transition-all" />
                                                <label className="px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all cursor-pointer inline-flex items-center justify-center flex-shrink-0">
                                                    {uploading ? "Uploading..." : "Upload File"}
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
                                                                const token = localStorage.getItem("vendorToken");
                                                                const formData = new FormData();
                                                                formData.append("image", file);
                                                                
                                                                const res = await fetch("/api/vendor/products/upload", {
                                                                    method: "POST",
                                                                    headers: {
                                                                        Authorization: `Bearer ${token}`
                                                                    },
                                                                    body: formData
                                                                });
                                                                const data = await res.json();
                                                                if (res.ok && data.imagePath) {
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
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                                    <Field name="category" as="select" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all">
                                        <option value="">Select Category</option>
                                        <option value="Jackets">Jackets</option>
                                        <option value="Accessories">Accessories</option>
                                        <option value="Footwear">Footwear</option>
                                        <option value="Apparel">Apparel</option>
                                    </Field>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Price (Rs)</label>
                                    <Field name="price" type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Inventory Stock</label>
                                    <Field name="stock" type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                                    <Field name="status" as="select" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all">
                                        <option value="Active">Active</option>
                                        <option value="Draft">Draft</option>
                                        <option value="Out of Stock">Out of Stock</option>
                                    </Field>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] shadow-xl transition-all flex items-center gap-2">
                                    <Save size={16} /> {isSubmitting ? "Saving..." : "Save Product"}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Modal>

            <ConfirmationModal isOpen={conf.open} onClose={() => setConf({ ...conf, open: false })} onConfirm={conf.onConfirm} title={conf.title} message={conf.message} type={conf.type} hideCancel={conf.hideCancel} confirmText="Confirm" />
        </div>
    );
}
