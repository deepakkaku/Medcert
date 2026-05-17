import React from "react";
import { ClinicDetails } from "../../types/types";

export interface MedicalCertificateData {
  doctorName: string;
  qualification: string;
  registrationNo: string;
  clinicName: string;
  clinicAddress: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  dateOfExamination: string;
  diagnosis: string;
  recommendation: "rest" | "fit" | "unfit";
  restDays: string;
  additionalNotes: string;
}

interface MedicalCertificatePreviewProps {
  data: MedicalCertificateData;
  clinicDetails: ClinicDetails | null;
  previewScale?: number;
  printRef?: React.RefObject<HTMLDivElement>;
}

export const MedicalCertificatePreview: React.FC<MedicalCertificatePreviewProps> = ({
  data,
  clinicDetails,
  previewScale = 1,
  printRef,
}) => {
  return (
    <div
      ref={printRef}
      className="bg-white shadow-2xl border border-slate-200 text-slate-900 overflow-hidden font-sans flex flex-col print-document p-[20mm]"
      style={{
        width: "21cm",
        minHeight: "29.7cm",
        height: "auto",
        transform: `scale(${previewScale})`,
        transformOrigin: "top left",
        marginBottom: `calc(-29.7cm + ${29.7 * previewScale}cm)`,
        boxShadow: "0 0 20px rgba(0,0,0,0.1)",
        position: "relative",
      }}
    >
      {/* Certificate Header */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-[10pt] mb-[20pt] gap-4 relative z-10">
        {clinicDetails?.logo ? (
          <div className="shrink-0">
            <img
              src={clinicDetails.logo}
              alt="Clinic Logo"
              className="max-h-[30mm] max-w-[50mm] w-auto object-contain"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex-1 text-right">
          <h3 className="text-[20pt] font-bold text-slate-900 tracking-tight leading-none">
            {data.clinicName || clinicDetails?.name || "Clinic Name"}
          </h3>
          <div className="mt-[8pt]">
            <p className="text-[12pt] font-normal text-slate-800 leading-none">
              {data.doctorName || clinicDetails?.doctor || "Dr. Name"}
            </p>
          </div>
          <div className="mt-[6pt]">
            <p className="text-[10pt] text-slate-600 leading-none">
              {data.qualification || clinicDetails?.degree || "Qualifications"}
            </p>
          </div>
          <div className="mt-[6pt]">
            <p className="text-[10pt] text-slate-600 max-w-sm ml-auto leading-tight">
              {data.clinicAddress || clinicDetails?.address || "Clinic Address"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Heading */}
      <div className="text-center mb-10 relative z-10">
        <h4 className="text-xl font-bold uppercase underline underline-offset-8">
          Medical Certificate
        </h4>
        <p className="mt-4 text-slate-600 italic">To Whomsoever It May Concern</p>
      </div>

      {/* Certificate Content */}
      <div className="text-slate-800 leading-relaxed text-base space-y-6 relative z-10">
        <p>
          This is to certify that{" "}
          <span className="font-bold border-b border-dotted border-slate-800 px-2 min-w-[150px] inline-block text-center">
            {data.patientName || "____________________"}
          </span>
          , aged{" "}
          <span className="font-bold border-b border-dotted border-slate-800 px-2 min-w-[40px] inline-block text-center">
            {data.patientAge || "____"}
          </span>{" "}
          years,{" "}
          <span className="font-bold border-b border-dotted border-slate-800 px-2 min-w-[60px] inline-block text-center">
            {data.patientGender}
          </span>
          , was under my professional clinical examination on{" "}
          <span className="font-bold border-b border-dotted border-slate-800 px-2 min-w-[120px] inline-block text-center">
            {new Date(data.dateOfExamination).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          .
        </p>

        <div>
          <p className="mb-2 font-semibold">Diagnosis / Findings:</p>
          <div className="whitespace-pre-wrap text-slate-700">
            {data.diagnosis || "No diagnosis provided."}
          </div>
        </div>

        <p>
          {data.recommendation === "fit" && (
            <>
              After clinical examination and observation, I found the patient to be{" "}
              <span className="font-bold underline">physically fit</span> to resume their
              normal duties.
            </>
          )}
          {data.recommendation === "unfit" && (
            <>
              Based on my clinical evaluation, the patient is currently{" "}
              <span className="font-bold underline">unfit for duty</span> and requires
              further medical attention/observation.
            </>
          )}
          {data.recommendation === "rest" && (
            <>
              I have advised the patient to take medical rest for a period of{" "}
              <span className="font-bold underline">
                {data.restDays || "____ days"}
              </span>{" "}
              starting from{" "}
              <span className="font-bold border-b border-dotted border-slate-800 px-2 min-w-[120px] inline-block text-center">
                {new Date(data.dateOfExamination).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              .
            </>
          )}
        </p>

        {data.additionalNotes && (
          <div className="mt-4">
            <p className="mb-1 font-semibold">Additional Advice:</p>
            <div className="whitespace-pre-wrap italic text-slate-700">
              {data.additionalNotes}
            </div>
          </div>
        )}
      </div>

      {/* Signature Block */}
      <div className="mt-20 flex justify-between items-end relative z-10">
        <div className="text-sm">
          <p>Date: {new Date().toLocaleDateString("en-IN")}</p>
          <p>Place: {data.clinicAddress.split(",").pop()?.trim() || "__________"}</p>
        </div>
        <div className="text-center w-64 border-t border-slate-800 pt-4 flex flex-col items-center">
          {clinicDetails?.signature && (
            <img
              src={clinicDetails.signature}
              alt="Doctor Signature"
              className="h-12 w-auto object-contain mb-1"
            />
          )}
          <p className="font-bold uppercase">{data.doctorName || "Dr. Signature"}</p>
          <p className="text-xs">{data.registrationNo}</p>
        </div>
      </div>
    </div>
  );
};
