import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { FileText, Eye, Search, Trash2, Loader2, Calendar, User, History, X, Printer, Download, ClipboardList, ChevronLeft, ChevronRight, MoreVertical, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Patient, ClinicDetails } from "../types/types";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { MedicalCertificatePreview, MedicalCertificateData } from "../components/previews/MedicalCertificatePreview";
import { DischargeSummaryPreview, DischargeSummaryData } from "../components/previews/DischargeSummaryPreview";

interface CertificateRecord {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  certificate_data: any;
  certificate_type: 'medical' | 'discharge';
  created_at: string;
  patient?: Patient;
}

export default function DocumentHistory() {
  const { clinic } = useAuth();
  const [documents, setDocuments] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<CertificateRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<string | null>(null);
  const [userZoomLevel, setUserZoomLevel] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<CertificateRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [modalPreviewScale, setModalPreviewScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!clinic?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("certificates")
        .select(`
          *,
          patient:patients(*)
        `, { count: 'exact' })
        .eq("clinic_id", clinic.id);

      if (activeSearchTerm) {
        query = query.or(`certificate_type.ilike.%${activeSearchTerm}%,certificate_data->>patientName.ilike.%${activeSearchTerm}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;
      const records = data as CertificateRecord[];
      setDocuments(records);
      if (count !== null) setTotalCount(count);

      if (records.length > 0) {
        setSelectedDoc(prev => (prev && records.find(r => r.id === prev.id) ? prev : records[0]));
      } else {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  }, [clinic?.id, page, pageSize, activeSearchTerm]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Scaling logic for preview
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const a4WidthPx = 21 * 37.7952755906;
        const scale = Math.min(containerWidth / a4WidthPx, 1);
        setPreviewScale(scale);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [selectedDoc]);

  // Scaling logic for mobile modal preview
  useEffect(() => {
    const updateModalScale = () => {
      if (modalContainerRef.current && isPreviewModalOpen) {
        const containerWidth = modalContainerRef.current.clientWidth - 32;
        const a4WidthPx = 21 * 37.7952755906;
        const scale = Math.min(containerWidth / a4WidthPx, 1);
        setModalPreviewScale(scale);
      }
    };
    
    if (isPreviewModalOpen) {
      setUserZoomLevel(1);
      // Small delay to ensure modal is rendered and dimensions are available
      const timer = setTimeout(updateModalScale, 100);
      window.addEventListener("resize", updateModalScale);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", updateModalScale);
      };
    }
  }, [selectedDoc, isPreviewModalOpen]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("certificates").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      
      const newDocs = documents.filter((d) => d.id !== deleteTarget.id);
      setDocuments(newDocs);
      
      if (selectedDoc?.id === deleteTarget.id) {
        setSelectedDoc(newDocs.length > 0 ? newDocs[0] : null);
      }
      
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !selectedDoc || !clinic) return;
    
    setIsDownloading(true);
    try {
      // Temporarily remove transform for high quality capture
      const originalTransform = printRef.current.style.transform;
      const originalMarginBottom = printRef.current.style.marginBottom;
      
      printRef.current.style.transform = "none";
      printRef.current.style.marginBottom = "0";
      
      const canvas = await html2canvas(printRef.current, {
        scale: 1.5, // Reduced scale slightly for smaller file size but still sharp
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      
      // Restore original styles
      printRef.current.style.transform = originalTransform;
      printRef.current.style.marginBottom = originalMarginBottom;
      
      // Use JPEG with 0.8 quality for significant size reduction over PNG
      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const fileName = `${selectedDoc.certificate_type}_${selectedDoc.patient?.name || selectedDoc.certificate_data.patientName || "document"}_${format(new Date(selectedDoc.created_at), "ddMMMyyyy")}.pdf`.replace(/\s+/g, '_');
      
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Bridge for type mismatch between ClinicSettings and ClinicDetails
  const mappedClinicDetails = clinic ? (clinic as unknown as ClinicDetails) : null;

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 no-print">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <History className="text-[#006e7e]" size={28} />
            <span>Document History</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            View and manage your previously generated documents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        {/* Left Column: List */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-[calc(100dvh-180px)] lg:h-[calc(100vh-180px)] no-print">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search patient or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveSearchTerm(searchTerm);
                  setPage(1);
                }
              }}
              className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-slate-800 border border-[#d6eaee] dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#006e7e] transition-all"
            />
            <button 
              onClick={() => { setActiveSearchTerm(searchTerm); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#006e7e]/10 text-[#006e7e] rounded-lg hover:bg-[#006e7e] hover:text-white transition-colors"
              title="Search"
            >
              <Search size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#006e7e] mb-3" />
                <p className="text-slate-500 text-sm">Loading history...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center flex-1 flex flex-col justify-center items-center">
                <FileText size={40} className="text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No documents found</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 mb-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (mobileMenuOpen) {
                        setMobileMenuOpen(null);
                        return;
                      }
                      setSelectedDoc(doc);
                      if (window.innerWidth < 1024) {
                        setIsPreviewModalOpen(true);
                      }
                    }}
                    className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedDoc?.id === doc.id
                        ? "bg-[#006e7e]/5 border-[#006e7e] shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-[#006e7e]/30 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          doc.certificate_type === 'medical' 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-purple-50 text-purple-600'
                        }`}>
                          {doc.certificate_type === 'medical' ? <FileText size={20} /> : <ClipboardList size={20} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">
                            {doc.patient?.name || doc.certificate_data.patientName || "Unknown Patient"}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="font-medium uppercase tracking-wider">
                              {doc.certificate_type === 'medical' ? 'Medical' : 'Discharge'}
                            </span>
                            <span>•</span>
                            <span>{format(new Date(doc.created_at), "dd MMM yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      {/* Desktop Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(doc);
                        }}
                        className="hidden lg:block p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Mobile 3-Dot Menu */}
                      <div className="lg:hidden relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMobileMenuOpen(mobileMenuOpen === doc.id ? null : doc.id);
                          }}
                          className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <MoreVertical size={20} />
                        </button>
                        
                        {mobileMenuOpen === doc.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[60] overflow-hidden animate-fade-in-up">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileMenuOpen(null);
                                setSelectedDoc(doc);
                                setIsPreviewModalOpen(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Eye size={16} className="text-[#006e7e]" /> View PDF
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileMenuOpen(null);
                                setSelectedDoc(doc);
                                setIsPreviewModalOpen(true);
                                setTimeout(() => handleDownloadPDF(), 300);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Download size={16} className="text-blue-500" /> Download PDF
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileMenuOpen(null);
                                setSelectedDoc(doc);
                                setIsPreviewModalOpen(true);
                                setTimeout(() => handlePrint(), 300);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Printer size={16} className="text-slate-500" /> Print PDF
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileMenuOpen(null);
                                setDeleteTarget(doc);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={16} /> Delete PDF
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
            {totalCount > 0 && !loading && (
              <div className="flex flex-col gap-3 pt-2 pb-2 mt-auto border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Per page:</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="text-xs border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 outline-none focus:border-[#006e7e]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => {
                      const p = i + 1;
                      if (p === 1 || p === Math.ceil(totalCount / pageSize) || Math.abs(page - p) <= 1) {
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg transition-colors ${
                              page === p 
                                ? 'bg-[#006e7e] text-white' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      }
                      if (p === 2 && page > 3) return <span key={`dots-1-${p}`} className="text-slate-400 text-xs">...</span>;
                      if (p === Math.ceil(totalCount / pageSize) - 1 && page < Math.ceil(totalCount / pageSize) - 2) return <span key={`dots-2-${p}`} className="text-slate-400 text-xs">...</span>;
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Right Column: Preview */}
        <div className={`hidden lg:flex lg:col-span-7 flex-col gap-4 lg:h-[calc(100vh-180px)] ${isPreviewModalOpen ? 'print:hidden' : 'print:flex print:col-span-12 print:w-full print:h-auto print:overflow-visible'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print flex-shrink-0 sm:min-h-[34px]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Eye size={20} className="text-[#006e7e]" />
              Preview
            </h2>
            {selectedDoc && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="text-sm bg-[#006e7e] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a68] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Printer size={18} /> Print
                </button>
              </div>
            )}
          </div>

          <div
            ref={containerRef}
            className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-2xl border border-slate-300 dark:border-slate-600 shadow-inner no-print-bg max-h-full w-full overflow-y-auto custom-scrollbar flex justify-center items-start p-4 no-print-wrapper"
          >
            {selectedDoc ? (
              <div
                style={{
                  width: `${21 * previewScale}cm`,
                  height: "max-content",
                  transition: "width 0.2s ease-out",
                }}
                className="flex-shrink-0 print-width-reset relative"
              >
                {selectedDoc.certificate_type === 'medical' ? (
                  <MedicalCertificatePreview 
                    data={selectedDoc.certificate_data as MedicalCertificateData} 
                    clinicDetails={mappedClinicDetails}
                    previewScale={previewScale}
                    printRef={printRef}
                  />
                ) : (
                  <DischargeSummaryPreview 
                    data={selectedDoc.certificate_data as DischargeSummaryData} 
                    clinicDetails={mappedClinicDetails}
                    previewScale={previewScale}
                    printRef={printRef}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-16 h-16 bg-slate-300/20 rounded-full flex items-center justify-center mb-4">
                  <Eye size={32} />
                </div>
                <p>Select a document to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document from your history? This action cannot be undone."
        confirmButtonText="Delete Permanently"
        cancelButtonText="Cancel"
        confirmButtonVariant="danger"
        isLoading={isDeleting}
      />

      {/* Mobile Preview Full-Screen Overlay */}
      {isPreviewModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300 no-print-wrapper">
          {/* Viewer Toolbar */}
          <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-10 no-print">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={20} />
              <span className="text-sm font-bold uppercase tracking-tight">Close Preview</span>
            </button>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#006e7e] text-white text-xs font-bold rounded-lg hover:bg-[#005a68] transition-all disabled:opacity-50 active:scale-95"
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                PDF
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                title="Print"
              >
                <Printer size={20} />
              </button>
            </div>
          </div>

          {/* Viewer Content */}
          <div 
            ref={modalContainerRef}
            className="flex-1 overflow-y-auto w-full flex justify-center p-4 bg-slate-200 dark:bg-slate-800/30 custom-scrollbar shadow-inner relative no-print-wrapper no-print-bg"
          >
            {/* Floating Zoom Controls */}
            {selectedDoc && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-4 shadow-xl z-20 no-print">
                <button 
                  onClick={() => setUserZoomLevel(Math.max(0.5, userZoomLevel - 0.25))}
                  className="p-1 hover:text-[#00e5ff] transition-colors"
                >
                  <Minus size={18} />
                </button>
                <span className="text-sm font-bold w-12 text-center">{Math.round(userZoomLevel * 100)}%</span>
                <button 
                  onClick={() => setUserZoomLevel(Math.min(2.5, userZoomLevel + 0.25))}
                  className="p-1 hover:text-[#00e5ff] transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}

            {selectedDoc ? (
              <div
                style={{
                  width: `${21 * modalPreviewScale * userZoomLevel}cm`,
                  height: "max-content",
                  transition: "width 0.2s ease-out",
                }}
                className="flex-shrink-0 print-width-reset relative mb-20 origin-top"
              >
                {selectedDoc.certificate_type === 'medical' ? (
                  <MedicalCertificatePreview 
                    data={selectedDoc.certificate_data as MedicalCertificateData} 
                    clinicDetails={mappedClinicDetails}
                    previewScale={modalPreviewScale * userZoomLevel}
                    printRef={printRef}
                  />
                ) : (
                  <DischargeSummaryPreview 
                    data={selectedDoc.certificate_data as DischargeSummaryData} 
                    clinicDetails={mappedClinicDetails}
                    previewScale={modalPreviewScale * userZoomLevel}
                    printRef={printRef}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3 text-[#006e7e]" />
                <p className="text-sm font-medium">Preparing Viewer...</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @media screen {
          .no-print-bg {
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 20px 20px;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 10px;
          }
          .custom-scrollbar:hover::-webkit-scrollbar-thumb {
            background: #cbd5e1;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        }
        @media print {
          @page { margin: 0; size: A4 portrait; }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            height: 100% !important; 
            overflow: hidden !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .no-print-wrapper, .no-print-bg, #root, [id^="root"] { 
            background: none !important; 
            border: none !important; 
            padding: 0 !important; 
            margin: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important; 
            display: block !important; 
          }
          
          /* Target everything and remove backgrounds except for the print document */
          * { -webkit-print-color-adjust: economy !important; color-adjust: economy !important; print-color-adjust: economy !important; }
          
          .print-document, .print-document * { 
            visibility: visible !important; 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }

          /* Reset all potential height constraints that cause overflow */
          .min-h-screen, .bg-slate-50 dark:bg-slate-900, .bg-zinc-50, main, [class*="bg-"], [class*="h-"] { 
            background: none !important; 
            background-color: transparent !important; 
            min-height: 0 !important; 
            height: auto !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            overflow: visible !important; 
          }
          
          .max-w-7xl { max-width: 100% !important; margin: 0 !important; overflow: visible !important; }
          .bg-white dark:bg-slate-800 { box-shadow: none !important; border: none !important; }
          .lg\\:grid-cols-2 { display: block !important; }
          .no-print-bg { background: none !important; border: none !important; padding: 0 !important; box-shadow: none !important; display: block !important; height: auto !important; width: 100% !important; overflow: visible !important; }
          .print-width-reset { width: 100% !important; transform: none !important; height: auto !important; margin-bottom: 0 !important; }
          
          /* The actual document should be the only thing with dimensions */
          .print-document { 
            background: white !important; 
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            border: none !important; 
            box-shadow: none !important; 
            overflow: hidden !important; 
            padding: 15mm !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 9999 !important;
          }
          
          header, footer, .aurora-background, #chatbot-container, .fixed, .absolute.inset-0.overflow-hidden { display: none !important; }
          .certificate-container { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; min-height: auto !important; }
        }
      `}</style>
    </div>
  );
}
