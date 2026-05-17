import React, { useState, useRef, useEffect, useMemo } from "react";
import { FileText, Download, Printer, User, Stethoscope, ClipboardList, Calendar, Info, RotateCcw, Copy, Eye, ArrowLeft, Search, UserCheck, UserPlus, X, Save, Loader2, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Snackbar, { SnackbarType } from "../components/ui/Snackbar";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { useAuth } from "../context/AuthContext";
import { Patient, ClinicDetails } from "../types/types";
import { supabase } from "../lib/supabase";
import { MedicalCertificateData, MedicalCertificatePreview } from "../components/previews/MedicalCertificatePreview";

const normalizePhoneNumber = (p: string) => p.replace(/\D/g, "");

const initialData: MedicalCertificateData = {
  doctorName: "",
  qualification: "",
  registrationNo: "",
  clinicName: "",
  clinicAddress: "",
  patientName: "",
  patientAge: "",
  patientGender: "Male",
  dateOfExamination: new Date().toISOString().split("T")[0],
  diagnosis: "",
  recommendation: "fit",
  restDays: "",
  additionalNotes: "",
};

export function MedicalCertificate() {
  const { clinic: clinicDetails } = useAuth();
  const [patients, setPatients] = React.useState<Patient[]>([]);

  React.useEffect(() => {
    if (!clinicDetails?.id) return;
    supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicDetails.id)
      .then(({ data }) => {
        if (data) setPatients(data as unknown as Patient[]);
      });
  }, [clinicDetails?.id]);

  const [data, setData] = useState<MedicalCertificateData>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    const searchLower = searchTerm.toLowerCase();
    const normalizedSearch = normalizePhoneNumber(searchTerm);

    return patients
      .filter((p) => {
        const normalizedPatientContact = normalizePhoneNumber(p.contact);
        return (
          p.name.toLowerCase().includes(searchLower) ||
          p.contact.includes(searchTerm) ||
          (normalizedSearch &&
            (normalizedPatientContact === normalizedSearch ||
              normalizedPatientContact.includes(normalizedSearch)))
        );
      })
      .slice(0, 5);
  }, [searchTerm, patients]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setData((prev) => ({
      ...prev,
      patientName: p.name,
      patientAge: p.age.toString(),
      patientGender: p.gender,
    }));
    setSearchTerm("");
    setIsSearching(false);
  };

  const handleUnlinkPatient = () => {
    setSelectedPatient(null);
    setCertificateId(null);
  };

  useEffect(() => {
    if (clinicDetails) {
      setData((prev) => ({
        ...prev,
        doctorName: prev.doctorName || clinicDetails.doctor || "",
        qualification: prev.qualification || clinicDetails.degree || "",
        registrationNo: prev.registrationNo || (clinicDetails as any).registration_no || "",
        clinicName: prev.clinicName || clinicDetails.name || "",
        clinicAddress: prev.clinicAddress || clinicDetails.address || "",
      }));
    }
  }, [clinicDetails]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !(event.target as HTMLElement).closest(".more-menu-container")) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  const [snackbar, setSnackbar] = useState<{
    isVisible: boolean;
    message: string;
    type: SnackbarType;
  }>({
    isVisible: false,
    message: "",
    type: "success",
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [previewScale, setPreviewScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        // Container has p-4 = 16px each side, total 32px
        const containerWidth = containerRef.current.clientWidth - 32;
        const a4WidthPx = 21 * 37.7952755906; // 21cm in pixels
        const scale = Math.min(containerWidth / a4WidthPx, 1);
        setPreviewScale(scale);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const showSnackbar = (message: string, type: SnackbarType = "success") => {
    setSnackbar({ isVisible: true, message, type });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    setIsDownloading(true);
    try {
      const originalTransform = printRef.current.style.transform;
      const originalMarginBottom = printRef.current.style.marginBottom;

      printRef.current.style.transform = "none";
      printRef.current.style.marginBottom = "0";

      const canvas = await html2canvas(printRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      printRef.current.style.transform = originalTransform;
      printRef.current.style.marginBottom = originalMarginBottom;

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

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const fileName = `medical_certificate_${data.patientName || "document"}_${format(
        new Date(),
        "ddMMMyyyy"
      )}.pdf`.replace(/\s+/g, "_");
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!clinicDetails?.id) {
      showSnackbar("Clinic information missing", "error");
      return;
    }

    if (!data.patientName) {
      showSnackbar("Patient name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (certificateId) {
        const { error } = await supabase
          .from("certificates")
          .update({
            certificate_data: data,
            patient_id: selectedPatient?.id || null,
          })
          .eq("id", certificateId);

        if (error) throw error;
        showSnackbar("Certificate updated successfully");
      } else {
        const { data: newCert, error } = await supabase
          .from("certificates")
          .insert({
            clinic_id: clinicDetails.id,
            patient_id: selectedPatient?.id || null,
            certificate_data: data,
            certificate_type: "medical",
          })
          .select()
          .single();

        if (error) throw error;
        setCertificateId(newCert.id);
        showSnackbar("Certificate saved successfully");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      showSnackbar(err.message || "Failed to save certificate", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmReset = () => {
    setData({
      ...initialData,
      doctorName: clinicDetails?.doctor || "",
      qualification: clinicDetails?.degree || "",
      registrationNo: (clinicDetails as any)?.registration_no || "",
      clinicName: clinicDetails?.name || "",
      clinicAddress: clinicDetails?.address || "",
    });
    setCertificateId(null);
    setIsConfirmOpen(false);
    setShowMoreMenu(false);
    showSnackbar("Form reset successfully");
  };

  const copyToClipboard = () => {
    const text = `MEDICAL CERTIFICATE
    
Doctor: ${data.doctorName}
Qualification: ${data.qualification}
Reg No: ${data.registrationNo}
Clinic: ${data.clinicName}
Address: ${data.clinicAddress}

This is to certify that ${data.patientGender === "Male" ? "Mr." : "Ms."} ${
      data.patientName
    }, aged ${data.patientAge} years, was under my professional clinical examination on ${new Date(
      data.dateOfExamination
    ).toLocaleDateString("en-IN")}.

Diagnosis: ${data.diagnosis}

Recommendation: ${
      data.recommendation === "fit"
        ? "Fit for duty"
        : data.recommendation === "unfit"
        ? "Unfit for duty"
        : `Rest for ${data.restDays}`
    }

Additional Notes: ${data.additionalNotes || "N/A"}`;

    navigator.clipboard.writeText(text);
    showSnackbar("Text copied to clipboard");
    setShowMoreMenu(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in-up">
      <div className="w-full">
        <div className="mb-8 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex-1">
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <FileText className="text-[#006e7e] shrink-0" size={28} />
              <span>Medical Certificate Generator</span>
            </h1>
          </div>

          <div className="w-full md:w-80 relative no-print">
            {selectedPatient ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#006e7e]/10 rounded-xl border border-[#006e7e]/20">
                <UserCheck size={18} className="text-[#006e7e]" />
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {selectedPatient.name}
                  </div>
                  <div className="text-[10px] text-[#006e7e] font-bold uppercase">Selected Patient</div>
                </div>
                <button
                  onClick={handleUnlinkPatient}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search existing patient..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-[#d6eaee] dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#006e7e] transition-all"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                />

                {isSearching && searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-[#d6eaee] dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                        >
                          <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                          <div className="text-xs text-slate-500">
                            {p.contact} • {p.age} years
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <UserPlus size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No patients found</p>
                      </div>
                    )}
                  </div>
                )}
                {isSearching && (
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsSearching(false)}></div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="flex flex-col gap-4 lg:h-[calc(100vh-180px)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print flex-shrink-0 sm:h-[34px]">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ClipboardList size={20} className="text-[#006e7e]" />
                Enter Details
              </h2>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_35px_90px_rgba(0,110,126,0.12)] border border-[#d6eaee] p-6 md:p-10 no-print flex-1 lg:overflow-y-auto custom-scrollbar animate-fade-in-right">
              <form className="space-y-8">
                {/* Doctor Details */}
                <section>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 uppercase text-xs tracking-wider">
                    <Stethoscope size={18} className="text-[#006e7e]" />
                    Doctor & Clinic Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Doctor Name
                      </label>
                      <input
                        type="text"
                        name="doctorName"
                        value={data.doctorName}
                        onChange={handleChange}
                        placeholder="Dr. John Doe"
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Qualification
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={data.qualification}
                        onChange={handleChange}
                        placeholder="MBBS, MD"
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Registration No.
                      </label>
                      <input
                        type="text"
                        name="registrationNo"
                        value={data.registrationNo}
                        onChange={handleChange}
                        placeholder="Reg No. 12345"
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Clinic Name
                      </label>
                      <input
                        type="text"
                        name="clinicName"
                        value={data.clinicName}
                        onChange={handleChange}
                        placeholder="City Health Clinic"
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Clinic Address
                      </label>
                      <input
                        type="text"
                        name="clinicAddress"
                        value={data.clinicAddress}
                        onChange={handleChange}
                        placeholder="123, Medical Square, City"
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                  </div>
                </section>

                {/* Patient Details */}
                <section>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 uppercase text-xs tracking-wider">
                    <User size={18} className="text-[#006e7e]" />
                    Patient Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Patient Name
                      </label>
                      <input
                        type="text"
                        name="patientName"
                        value={data.patientName}
                        onChange={handleChange}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Age</label>
                      <input
                        type="text"
                        name="patientAge"
                        value={data.patientAge}
                        onChange={handleChange}
                        placeholder="25"
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Gender
                      </label>
                      <select
                        name="patientGender"
                        value={data.patientGender}
                        onChange={handleChange}
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400 appearance-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Clinical Details */}
                <section>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 uppercase text-xs tracking-wider">
                    <ClipboardList size={18} className="text-[#006e7e]" />
                    Clinical Details
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Date of Examination
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="dateOfExamination"
                          value={data.dateOfExamination}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400 pl-10"
                        />
                        <Calendar className="absolute left-3 top-4 text-slate-400 dark:text-slate-500" size={18} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Diagnosis / Condition
                      </label>
                      <textarea
                        name="diagnosis"
                        value={data.diagnosis}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Describe the medical condition..."
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                  </div>
                </section>

                {/* Recommendation */}
                <section>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 uppercase text-xs tracking-wider">
                    <Info size={18} className="text-[#006e7e]" />
                    Recommendation
                  </h2>
                  <div className="space-y-5">
                    <div className="flex flex-wrap gap-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-[18px] border border-slate-100 dark:border-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="recommendation"
                          value="fit"
                          checked={data.recommendation === "fit"}
                          onChange={handleChange}
                          className="w-5 h-5 text-[#006e7e] focus:ring-[#006e7e] border-[#d6eaee] dark:bg-slate-800"
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-[#006e7e] transition-colors">
                          Fit for duty
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="recommendation"
                          value="unfit"
                          checked={data.recommendation === "unfit"}
                          onChange={handleChange}
                          className="w-5 h-5 text-[#006e7e] focus:ring-[#006e7e] border-[#d6eaee] dark:bg-slate-800"
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-[#006e7e] transition-colors">
                          Unfit for duty
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="recommendation"
                          value="rest"
                          checked={data.recommendation === "rest"}
                          onChange={handleChange}
                          className="w-5 h-5 text-[#006e7e] focus:ring-[#006e7e] border-[#d6eaee] dark:bg-slate-800"
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-[#006e7e] transition-colors">
                          Rest for X days
                        </span>
                      </label>
                    </div>

                    {data.recommendation === "rest" && (
                      <div className="mt-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Number of Days Rest
                        </label>
                        <input
                          type="text"
                          name="restDays"
                          value={data.restDays}
                          onChange={handleChange}
                          placeholder="e.g. 5 days"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        name="additionalNotes"
                        value={data.additionalNotes}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Any other instructions..."
                        className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#006e7e] placeholder:text-slate-400 dark:placeholder-slate-400"
                      />
                    </div>
                  </div>
                </section>
              </form>
            </div>
          </div>

          {/* Preview Section */}
          <div className="flex flex-col gap-4 lg:h-[calc(100vh-180px)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print flex-shrink-0 sm:h-[34px]">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Eye size={20} className="text-[#006e7e]" />
                Live Preview
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-sm flex items-center gap-1.5 px-3 py-1.5 bg-[#006e7e] text-white rounded-lg hover:bg-[#005a68] transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save
                </button>

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
                  className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={18} /> Print
                </button>

                <div className="relative more-menu-container">
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      showMoreMenu
                        ? "bg-slate-100 dark:bg-slate-700 border-[#006e7e] text-[#006e7e]"
                        : "border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <MoreVertical size={18} />
                  </button>

                  <AnimatePresence>
                    {showMoreMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-[60]"
                      >
                        <button
                          onClick={copyToClipboard}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Copy size={16} /> Copy Text
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                        <button
                          onClick={() => setIsConfirmOpen(true)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <RotateCcw size={16} /> Reset Form
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Print Container Wrapper */}
            <div
              ref={containerRef}
              className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-2xl border border-slate-300 dark:border-slate-600 shadow-inner no-print-bg max-h-full w-full overflow-y-auto custom-scrollbar flex justify-center items-start p-4 no-print-wrapper"
            >
              <div
                style={{
                  width: `${21 * previewScale}cm`,
                  height: "max-content",
                  transition: "width 0.2s ease-out",
                }}
                className="flex-shrink-0 print-width-reset relative"
              >
                <MedicalCertificatePreview
                  data={data}
                  clinicDetails={clinicDetails as unknown as ClinicDetails}
                  previewScale={previewScale}
                  printRef={printRef}
                />
              </div>
            </div>
          </div>
        </div>
      </div>


      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar((prev) => ({ ...prev, isVisible: false }))}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmReset}
        title="Reset Form?"
        message="Are you sure you want to clear all fields? This action cannot be undone."
        confirmButtonText="Yes, Clear Everything"
        cancelButtonText="No, Keep Data"
        confirmButtonVariant="danger"
      />



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
