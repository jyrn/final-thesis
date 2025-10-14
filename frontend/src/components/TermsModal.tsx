import React from 'react'
import styles from './TermsModal.module.css'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
  type: 'terms' | 'privacy'
  userRole?: 'employer' | 'jobseeker'
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept, type, userRole = 'jobseeker' }) => {
  if (!isOpen) return null

  const isTerms = type === 'terms'
  const isEmployer = userRole === 'employer'

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isTerms ? 'Terms and Conditions' : 'Privacy Policy'}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          {isTerms ? (
            <div className={styles.termsContent}>
              <h3>1. Acceptance of Terms</h3>
              <p>
                By accessing and using the PESO Job Portal as {isEmployer ? 'an employer' : 'a job seeker'}, you accept and agree to be bound by the terms 
                and provisions of this agreement in accordance with the <strong>Philippine Data Privacy Act of 2012 (RA 10173)</strong> 
                and other relevant Philippine labor and cybercrime laws.
              </p>

<h3>2. Use License</h3>
              <p>
                Permission is granted to temporarily use the PESO Job Portal for personal, non-commercial 
                job searching and recruitment purposes only, in compliance with the <strong>Department of Labor and Employment (DOLE)</strong> 
                regulations and the <strong>Bureau of Local Employment (BLE)</strong> guidelines. This is the grant of a limited, 
                non-exclusive, non-transferable license to use the service.
              </p>

              <h3>3. User Account</h3>
              <div>
                <p>You are responsible for safeguarding your password and maintaining the confidentiality of your 
                account in accordance with <strong>National Privacy Commission (NPC)</strong> guidelines. You agree to:</p>
                <ul>
                  <li>Use strong, unique passwords</li>
                  <li>Not share your login credentials</li>
                  <li>Immediately report any unauthorized access</li>
                  <li>Comply with the <strong>Cybercrime Prevention Act of 2012 (RA 10175)</strong></li>
                </ul>
              </div>

              {isEmployer ? (
                <>
                  <h3>4. Employer Obligations and Compliance</h3>
                  <div>
                    <p>As an employer using this platform, you agree to comply with all applicable Philippine employment laws:</p>
                    <ul>
                      <li><strong>Labor Code of the Philippines (PD 442):</strong> All employment practices must comply with minimum wage, working hours, and benefits requirements</li>
                      <li><strong>Equal Employment Opportunity:</strong> No discrimination based on gender, age, disability, or other protected characteristics</li>
                      <li><strong>DOLE Department Order No. 174-17:</strong> Compliance with digital recruitment guidelines</li>
                      <li><strong>Social Security System (SSS):</strong> Mandatory registration and contributions for employees</li>
                      <li><strong>PhilHealth and Pag-IBIG:</strong> Mandatory enrollment and contributions</li>
                    </ul>
                  </div>

                  <h3>5. Job Posting Requirements</h3>
                  <div>
                    <p>All job postings must include accurate information and comply with:</p>
                    <ul>
                      <li><strong>Truthful Job Descriptions:</strong> Accurate representation of job duties, requirements, and compensation</li>
                      <li><strong>Salary Transparency:</strong> Clear indication of salary ranges in Philippine Pesos (₱)</li>
                      <li><strong>Anti-Discrimination:</strong> No discriminatory language or requirements</li>
                      <li><strong>Work Arrangement Clarity:</strong> Clear indication of remote, hybrid, or on-site work requirements</li>
                    </ul>
                  </div>

                  <h3>6. Data Controller Responsibilities</h3>
                  <div>
                    <p>As a data controller under the Data Privacy Act, you must:</p>
                    <ul>
                      <li><strong>Lawful Processing:</strong> Only process applicant data for legitimate recruitment purposes</li>
                      <li><strong>Data Minimization:</strong> Collect only necessary information for the hiring process</li>
                      <li><strong>Consent Management:</strong> Obtain proper consent before processing sensitive personal information</li>
                      <li><strong>Data Security:</strong> Implement appropriate security measures for applicant data</li>
                      <li><strong>Retention Limits:</strong> Delete applicant data when no longer needed for recruitment</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <h3>4. Job Matching Service and Data Processing</h3>
                  <div>
                    <p>Our AI-powered job matching service uses pdf-parse to extract information from your 
                    resume in compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>. By uploading 
                    your resume, you provide explicit consent for automated processing. We ensure compliance with:</p>
                    <ul>
                      <li><strong>DOLE Department Order No. 174-17:</strong> Guidelines on the Use of Information Technology in Employment</li>
                      <li><strong>National Privacy Commission Circular 16-01:</strong> Rules on Data Processing</li>
                      <li><strong>Fair Credit Reporting Act principles</strong> for background verification</li>
                    </ul>
                  </div>

                  <h3>5. Job Seeker Rights and Protections</h3>
                  <div>
                    <p>As a job seeker, you are protected under Philippine labor laws:</p>
                    <ul>
                      <li><strong>Right to Fair Treatment:</strong> Protection from discrimination during the hiring process</li>
                      <li><strong>Privacy Rights:</strong> Control over your personal data and resume information</li>
                      <li><strong>Right to Information:</strong> Access to clear job descriptions and compensation details</li>
                      <li><strong>Protection from Fraud:</strong> Report suspicious job postings or recruitment scams</li>
                      <li><strong>Data Portability:</strong> Right to download and transfer your profile data</li>
                    </ul>
                  </div>

                  <h3>6. Resume and Profile Management</h3>
                  <div>
                    <p>Your resume and profile data are handled with strict privacy controls:</p>
                    <ul>
                      <li><strong>Visibility Control:</strong> You control which employers can view your profile</li>
                      <li><strong>Application Tracking:</strong> Monitor which employers have accessed your information</li>
                      <li><strong>Data Updates:</strong> Right to update or correct your profile information at any time</li>
                      <li><strong>Withdrawal Rights:</strong> Right to withdraw applications and delete your profile</li>
                    </ul>
                  </div>
                </>
              )}

              <h3>{isEmployer ? '7' : '7'}. Prohibited Uses and Legal Compliance</h3>
              <div>
                <p>You may not use our service for any unlawful purpose or to solicit others to perform 
                unlawful acts. Specifically prohibited under Philippine law:</p>
                <ul>
                  <li>Violations of the <strong>Cybercrime Prevention Act of 2012 (RA 10175)</strong></li>
                  <li>Discrimination based on <strong>Magna Carta of Women (RA 9710)</strong> and <strong>Solo Parents' Welfare Act (RA 8972)</strong></li>
                  <li>Age discrimination under <strong>Anti-Age Discrimination in Employment Act (RA 10911)</strong></li>
                  <li>Disability discrimination under <strong>Magna Carta for Persons with Disability (RA 7277)</strong></li>
                  <li>Transmitting malicious software or engaging in cyber attacks</li>
                  {isEmployer && <li><strong>Illegal recruitment practices</strong> under the Migrant Workers Act and POEA regulations</li>}
                  {isEmployer && <li><strong>False job advertisements</strong> or misleading employment offers</li>}
                </ul>
              </div>

              <h3>6. Employment Law Compliance</h3>
              <p>
                All job postings and employment practices through this portal must comply with:
              </p>
              <ul>
                <li><strong>Labor Code of the Philippines (Presidential Decree No. 442)</strong></li>
                <li><strong>DOLE Department Order No. 156-16:</strong> Guidelines on Occupational Safety and Health</li>
                <li><strong>Bayanihan to Heal as One Act (RA 11469)</strong> and related COVID-19 workplace guidelines</li>
                <li><strong>Telecommuting Act (RA 11165)</strong> for remote work arrangements</li>
              </ul>

              <h3>7. Disclaimer and Limitation of Liability</h3>
              <p>
                The information on this portal is provided on an 'as is' basis. To the fullest extent 
                permitted by Philippine law, PESO excludes all representations, warranties, conditions and terms, 
                except those required under the <strong>Consumer Act of the Philippines (RA 7394)</strong> and 
                other mandatory consumer protection laws.
              </p>

              <h3>8. Dispute Resolution and Governing Law</h3>
              <p>
                These terms and conditions are governed by and construed in accordance with the laws of 
                the Republic of the Philippines. Any disputes shall be resolved through:
              </p>
              <ul>
                <li>Primary jurisdiction: <strong>Regional Trial Courts of the Philippines</strong></li>
                <li>Alternative dispute resolution under <strong>Alternative Dispute Resolution Act (RA 9285)</strong></li>
                <li>Labor disputes: <strong>National Labor Relations Commission (NLRC)</strong></li>
                <li>Data privacy complaints: <strong>National Privacy Commission (NPC)</strong></li>
              </ul>

              <h3>9. Amendments and Updates</h3>
              <p>
                We reserve the right to modify these terms in compliance with Philippine law. Users will be 
                notified of material changes through the platform and given 30 days to review, as required 
                by the <strong>Data Privacy Act implementing rules</strong>.
              </p>
            </div>
          ) : (
            <div className={styles.privacyContent}>
              <h3>Information We Collect (Data Privacy Act Compliance)</h3>
              <div>
                <p>In compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>, we collect the following categories of personal data:</p>
                <ul>
                  <li><strong>Basic Personal Information:</strong> Name, email, phone number, address</li>
                  <li><strong>Employment Data:</strong> Work history, skills, educational background</li>
                  <li><strong>Sensitive Personal Information:</strong> Government IDs (with explicit consent)</li>
                  <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
                  <li><strong>Biometric Data:</strong> None collected (in compliance with NPC guidelines)</li>
                </ul>
                <p>All data collection follows the principles of transparency, legitimate purpose, and proportionality as required by Philippine law.</p>
              </div>

              <h3>Resume Processing and AI Technology</h3>
              <div>
                <p>When you upload your resume, we use OCR (Optical Character Recognition) technology to 
                extract text and information for job matching purposes. This automated processing complies with:</p>
                <ul>
                  <li><strong>NPC Circular 16-01:</strong> Rules on Automated Decision-Making</li>
                  <li><strong>DOLE guidelines</strong> on digital recruitment practices</li>
                  <li><strong>ISO 27001</strong> standards for information security management</li>
                </ul>
                <p>You have the right to request human review of any automated decisions affecting your employment prospects.</p>
              </div>

              <h3>Lawful Basis for Processing</h3>
              <div>
                <p>We process your personal data based on the following lawful grounds under the Data Privacy Act:</p>
                <ul>
                  <li><strong>Consent:</strong> For resume processing and job matching</li>
                  <li><strong>Contract:</strong> To fulfill our service agreement with you</li>
                  <li><strong>Legal Obligation:</strong> To comply with DOLE reporting requirements</li>
                  <li><strong>Legitimate Interest:</strong> To improve our platform and prevent fraud</li>
                </ul>
              </div>

              <h3>Information Sharing and Third-Party Disclosure</h3>
              <div>
                <p>We may share your information under the following circumstances, in compliance with Philippine law:</p>
                <ul>
                  <li><strong>Employer Matching:</strong> With your explicit consent when applying for jobs</li>
                  <li><strong>Government Agencies:</strong> DOLE, PESO offices for employment statistics (anonymized)</li>
                  <li><strong>Legal Requirements:</strong> When required by court orders or regulatory authorities</li>
                  <li><strong>Service Providers:</strong> Third-party processors under strict data processing agreements</li>
                </ul>
                <p>We <strong>never sell</strong> your personal information to third parties for commercial purposes.</p>
              </div>

              <h3>Comprehensive Data Security Framework</h3>
              <div>
                <p>In compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>, <strong>NPC Circular 16-02</strong> 
                (Security of Personal Data), and international standards, we implement:</p>
                
                <h4>Technical Safeguards:</h4>
                <ul>
                  <li><strong>Encryption:</strong> AES-256 encryption for data at rest, TLS 1.3 for data in transit</li>
                  <li><strong>Database Security:</strong> Encrypted databases with field-level encryption for sensitive data</li>
                  <li><strong>Access Controls:</strong> Zero-trust architecture with role-based access control (RBAC)</li>
                  <li><strong>Multi-Factor Authentication:</strong> Required for all administrative access</li>
                  <li><strong>Network Security:</strong> Firewall protection, intrusion detection systems (IDS)</li>
                  <li><strong>Secure File Storage:</strong> Cloud storage with end-to-end encryption</li>
                </ul>

                <h4>Administrative Safeguards:</h4>
                <ul>
                  <li><strong>Data Protection Officer (DPO):</strong> Designated DPO registered with NPC</li>
                  <li><strong>Privacy Impact Assessments:</strong> Conducted for all new features</li>
                  <li><strong>Employee Training:</strong> Quarterly data privacy and cybersecurity training</li>
                  <li><strong>Background Checks:</strong> For all personnel with data access</li>
                  <li><strong>Incident Response Plan:</strong> 24/7 monitoring and response procedures</li>
                </ul>

                <h4>Physical Safeguards:</h4>
                <ul>
                  <li><strong>Secure Data Centers:</strong> ISO 27001 certified facilities in the Philippines</li>
                  <li><strong>Access Logs:</strong> Biometric access controls and comprehensive audit trails</li>
                  <li><strong>Environmental Controls:</strong> Fire suppression, climate control, power backup</li>
                </ul>

                <h4>Breach Response Protocol:</h4>
                <ul>
                  <li><strong>Detection:</strong> Automated monitoring systems with real-time alerts</li>
                  <li><strong>Assessment:</strong> Risk evaluation within 1 hour of detection</li>
                  <li><strong>Notification:</strong> NPC notification within 72 hours as required by law</li>
                  <li><strong>User Notification:</strong> Affected individuals notified within 72 hours</li>
                  <li><strong>Remediation:</strong> Immediate containment and system restoration</li>
                  <li><strong>Documentation:</strong> Comprehensive incident reports for regulatory compliance</li>
                </ul>
              </div>

              <h3>Your Rights Under the Data Privacy Act</h3>
              <div>
                <p>As a data subject, you have the following rights under the Philippine Data Privacy Act:</p>
                <ul>
                  <li><strong>Right to be Informed:</strong> Know how your personal data is being processed</li>
                  <li><strong>Right to Access:</strong> Request a copy of your personal data in our system</li>
                  <li><strong>Right to Correct:</strong> Update or correct any inaccuracies in your data</li>
                  <li><strong>Right to Erase:</strong> Request deletion of your personal data under certain conditions</li>
                  <li><strong>Right to Data Portability:</strong> Request a copy of your data in a structured format</li>
                  <li><strong>Right to File a Complaint:</strong> Lodge a complaint with the National Privacy Commission</li>
                </ul>
                <p>To exercise these rights, please contact our Data Protection Officer at the PESO office.</p>
              </div>

              <h3>Data Retention and Deletion</h3>
              <div>
                <p>In compliance with <strong>NPC Circular 16-03</strong> on Data Retention, we retain personal data according to:</p>
                <ul>
                  <li><strong>Active Job Seekers:</strong> Data retained for 2 years after last login</li>
                  <li><strong>Inactive Accounts:</strong> Automatic deletion after 3 years of inactivity</li>
                  <li><strong>Employment Records:</strong> 5 years as required by DOLE regulations</li>
                  <li><strong>Legal Requirements:</strong> Extended retention when required by court orders</li>
                  <li><strong>Audit Logs:</strong> Security logs retained for 1 year minimum</li>
                </ul>
                <p>You may request earlier deletion of your data unless retention is required by law.</p>
              </div>

              <h3>International Data Transfers</h3>
              <div>
                <p>If we transfer your data outside the Philippines, we ensure adequate protection through:</p>
                <ul>
                  <li><strong>Adequacy Decisions:</strong> Transfers only to countries with NPC adequacy decisions</li>
                  <li><strong>Standard Contractual Clauses:</strong> EU-approved data transfer agreements</li>
                  <li><strong>Binding Corporate Rules:</strong> For transfers within our corporate group</li>
                  <li><strong>Your Explicit Consent:</strong> When required for specific transfers</li>
                </ul>
              </div>

              <h3>Cookies and Tracking Technologies</h3>
              <div>
                <p>We use cookies and similar technologies in compliance with Philippine privacy laws:</p>
                <ul>
                  <li><strong>Essential Cookies:</strong> Required for platform functionality (no consent needed)</li>
                  <li><strong>Analytics Cookies:</strong> To improve user experience (with your consent)</li>
                  <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
                  <li><strong>Marketing Cookies:</strong> For job recommendations (opt-in only)</li>
                </ul>
                <p>You can manage cookie preferences through your browser settings or our cookie preference center.</p>
              </div>

              <h3>Children's Privacy Protection</h3>
              <div>
                <p>In compliance with the <strong>Special Protection of Children Against Abuse, Exploitation and Discrimination Act</strong>:</p>
                <ul>
                  <li>Our platform is intended for users 18 years and older</li>
                  <li>We do not knowingly collect data from minors under 18</li>
                  <li>If we discover data from a minor, we will delete it immediately</li>
                  <li>Parents/guardians may contact us to request deletion of their child's data</li>
                </ul>
              </div>

              <h3>Contact Information and Data Protection Officer</h3>
              <div>
                <p>For privacy-related inquiries, data subject requests, or complaints:</p>
                <ul>
                  <li><strong>Data Protection Officer:</strong> [DPO Name], Registered with NPC</li>
                  <li><strong>Email:</strong> dpo@peso-jobportal.gov.ph</li>
                  <li><strong>Address:</strong> PESO Office, [Local Government Address]</li>
                  <li><strong>Phone:</strong> [PESO Office Contact Number]</li>
                  <li><strong>NPC Hotline:</strong> (02) 8234-2228 for privacy complaints</li>
                </ul>
                <p>We will respond to your requests within 30 days as required by the Data Privacy Act.</p>
              </div>

              <h3>Policy Updates and Notifications</h3>
              <div>
                <p>This Privacy Policy may be updated to reflect changes in:</p>
                <ul>
                  <li>Philippine privacy laws and regulations</li>
                  <li>NPC circulars and guidelines</li>
                  <li>Our data processing practices</li>
                  <li>Platform features and functionality</li>
                </ul>
                <p>Material changes will be communicated through email and platform notifications 30 days before implementation.</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.acceptButton} onClick={onAccept}>
            {isTerms ? 'Accept Terms' : 'Accept Privacy Policy'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TermsModal
