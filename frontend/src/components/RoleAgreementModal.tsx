"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import styles from "../pages/auth/AuthPage.module.css"

export type UserRole = "jobseeker" | "employer" | "admin"

interface RoleAgreementModalProps {
  role: UserRole
  open: boolean
  onAccept: () => void
  onCancel: () => void
  appName: string
  orgName: string
  termsUrl?: string
  privacyUrl?: string
}

const getSimplifiedTerms = (role: UserRole) => {
  const commonTerms = [
    "Provide accurate and truthful information",
    "Use the platform responsibly and legally",
    "Respect other users and maintain professionalism",
    "Comply with Philippine laws and regulations",
  ]

  const roleSpecificTerms = {
    jobseeker: [
      "Keep your profile and resume up to date",
      "Apply only to jobs you're genuinely interested in",
      "Allow AI processing of your resume for better job matching",
      "Understand that job placement is not guaranteed",
    ],
    employer: [
      "Post only legitimate job opportunities",
      "Provide accurate job descriptions and compensation",
      "Respect candidate privacy and data protection",
      "Follow fair hiring practices and labor laws",
    ],
    admin: [
      "Use administrative access only for official duties",
      "Maintain strict confidentiality of user data",
      "Verify employer legitimacy and monitor compliance",
      "Report any violations or security concerns",
    ],
  }

  return [...commonTerms, ...roleSpecificTerms[role]]
}

const RoleAgreementModal: React.FC<RoleAgreementModalProps> = ({
  role,
  open,
  onAccept,
  onCancel,
  appName,
  orgName,
  termsUrl = "#",
  privacyUrl = "#",
}) => {
  const [agreed, setAgreed] = useState(false)
  const [showFullTerms, setShowFullTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setAgreed(false)
      setIsProcessing(false)
      document.body.style.overflow = "hidden"
      
      // Focus the first focusable element when modal opens
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector('button, input, [tabindex]:not([tabindex="-1"])') as HTMLElement
        if (firstFocusable) {
          firstFocusable.focus()
        }
      }, 100)
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.preventDefault()
        event.stopPropagation()
        onCancel()
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onCancel])

  useEffect(() => {
    const handleTabKey = (event: KeyboardEvent) => {
      if (!open) return
      
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>
      
      if (!focusableElements || focusableElements.length === 0) return
      
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    if (open) {
      document.addEventListener('keydown', handleTabKey)
    }

    return () => {
      document.removeEventListener('keydown', handleTabKey)
    }
  }, [open])

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel()
    }
  }

  const handleAccept = async () => {
    if (!agreed || isProcessing) return
    
    setIsProcessing(true)
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      onAccept()
    } catch (error) {    } finally {
      setIsProcessing(false)
    }
  }

  const getRoleColor = () => {
    switch (role) {
      case "employer":
        return "#3b82f6" // Light blue (more cohesive)
      case "admin":
        return "#8b5cf6" // Light purple (more cohesive)
      default:
        return "#10b981" // Light green (more cohesive)
    }
  }

  const getRoleIcon = () => {
    switch (role) {
      case "employer":
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
          </svg>
        )
      case "admin":
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
              clipRule="evenodd"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  if (!open) return null

  const terms = getSimplifiedTerms(role)
  const roleColor = getRoleColor()

  // Debug log  return (
    <div
      className={`${styles.modalOverlay} fixed inset-0 flex items-center justify-center p-4 z-[9999]`}
      onClick={handleBackdropClick}
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-agreement-title"
      aria-describedby="role-agreement-content"
      tabIndex={-1}
      data-modal="role-agreement"
      style={{
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        className={`${styles.modalContent} ${styles.roleAgreementModal} w-full max-w-2xl max-h-[90vh] overflow-hidden`}
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          zIndex: 10000,
          position: "relative",
          width: "100%",
          maxWidth: "42rem",
          maxHeight: "90vh",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          className={`${styles.modalHeader} p-6 text-white text-center relative`}
          style={{
            background: `linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)`,
            borderRadius: "24px 24px 0 0",
            position: "relative",
            zIndex: 10001
          }}
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-white hover:text-gray-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200 z-10"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div style={{ color: "white", fontSize: "2rem" }}>{getRoleIcon()}</div>
            </div>
            <div className="space-y-2">
              <h2 id="role-agreement-title" className="text-3xl font-bold">
                Welcome, {role.charAt(0).toUpperCase() + role.slice(1)}!
              </h2>
              <p className="text-lg opacity-90 font-medium">Let's get you started with {appName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className={`${styles.modalBody} ${styles.modalScroll} p-8 overflow-y-auto max-h-[60vh]`}>
          <div className="space-y-6">
            {/* Terms Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 text-center">
                By continuing, you agree to:
              </h3>
              
              <div className="grid gap-3">
                {getSimplifiedTerms(role).map((term, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors duration-200">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-blue-500" />
                    <span className="text-gray-700 font-medium leading-relaxed">{term}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links Section */}
            <div className="text-center space-y-4">
              <p className="text-gray-600 font-medium">Want to read the complete details?</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowFullTerms(true)}
                  className={`${styles.quickLinkButton} text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105`}
                  style={{
                    color: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    border: "2px solid rgba(59, 130, 246, 0.3)",
                  }}
                >
                  📋 Full Terms & Conditions
                </button>
                <button
                  onClick={() => setShowFullTerms(true)}
                  className={`${styles.quickLinkButton} text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105`}
                  style={{
                    color: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    border: "2px solid rgba(59, 130, 246, 0.3)",
                  }}
                >
                  🔒 Privacy Policy
                </button>
              </div>
            </div>

            {/* Agreement Section */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="agreement"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className={`${styles.agreementCheckbox} w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  style={{ accentColor: "#3b82f6" }}
                />
                <label htmlFor="agreement" className={`${styles.agreementLabel} text-sm text-gray-700 leading-relaxed cursor-pointer select-none`}>
                  I understand and agree to the terms above and acknowledge that I have access to the complete Terms & Conditions and Privacy Policy.
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`${styles.modalFooter} p-6 border-t border-gray-200 bg-gray-50`}>
          <div className="space-y-4">
            <button
              onClick={handleAccept}
              disabled={!agreed || isProcessing}
              className={`${styles.processingButton} w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{
                background: agreed && !isProcessing 
                  ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" 
                  : "#e5e7eb",
                color: agreed && !isProcessing ? "white" : "#6b7280",
                boxShadow: agreed && !isProcessing 
                  ? "0 4px 14px rgba(59, 130, 246, 0.4)" 
                  : "none"
              }}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className={styles.loadingSpinner} />
                  <span>Processing...</span>
                </div>
              ) : agreed ? (
                "Continue to Dashboard"
              ) : (
                "Please agree to continue"
              )}
            </button>
            
            <p className="text-center text-sm text-gray-500">
              This agreement is required to use {appName} in partnership with PESO Lipa.
            </p>
          </div>
        </div>
      </div>

      {/* Full Terms Modal */}
      {showFullTerms && (
        <div className={`${styles.modalOverlay} ${styles.fullTermsModal} fixed inset-0 flex items-center justify-center p-4 z-[10000]`}>
          <div className={`${styles.modalContent} w-full max-w-4xl max-h-[90vh] overflow-hidden`}>
            {/* Header */}
            <div
              className={`${styles.modalHeader} p-6 text-white relative`}
              style={{ backgroundColor: "#3b82f6" }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Complete Terms & Conditions</h2>
                    <p className="text-blue-100 text-sm">For {role} users</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFullTerms(false)}
                  className="text-white hover:text-blue-200 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-10"
                  aria-label="Close Full Terms"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className={`${styles.modalBody} ${styles.modalScroll} p-8 overflow-y-auto max-h-[calc(90vh-200px)]`}>
              <div className="prose max-w-none">
                <h4 className="text-2xl font-bold text-gray-800 mb-6 text-center">Complete Terms & Conditions for {role} users:</h4>
                
                <div className="space-y-8">
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <h5 className="text-xl font-bold text-gray-800 mb-4 text-blue-800">Common Terms:</h5>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-blue-500" />
                        <span className="text-gray-700 font-medium">Provide accurate and truthful information</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-blue-500" />
                        <span className="text-gray-700 font-medium">Use the platform responsibly and legally</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-blue-500" />
                        <span className="text-gray-700 font-medium">Respect other users and maintain professionalism</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-blue-500" />
                        <span className="text-gray-700 font-medium">Comply with Philippine laws and regulations</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h5 className="text-xl font-bold text-gray-800 mb-4">Role-Specific Terms:</h5>
                    <ul className="space-y-3">
                      {getSimplifiedTerms(role).slice(4).map((term, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-blue-500" />
                          <span className="text-gray-700 font-medium">{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <h5 className="text-xl font-bold text-gray-800 mb-4 text-green-800">Important Notes:</h5>
                    <div className="space-y-3 text-gray-700">
                      <p className="font-medium">• These terms are subject to change. Please review them regularly to ensure compliance.</p>
                      <p className="font-medium">• Your privacy and data security are our top priorities.</p>
                      <p className="font-medium">• For questions about these terms, please contact our support team.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`${styles.modalFooter} p-6 border-t border-gray-200 bg-gray-50`}>
              <button
                onClick={() => setShowFullTerms(false)}
                className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: "#3b82f6" }}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleAgreementModal
