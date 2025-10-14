# Authentication Flow Documentation

This document outlines the authentication flow for the SkillSync job portal.

## Components

### Role Selection (`RoleSelectionPage.tsx`)
- Entry point for authentication
- Users choose between Jobseeker and Employer roles
- Routes to respective auth components

### Jobseeker Authentication (`JobseekerAuth.tsx`)
- Handles both login and registration for job seekers
- Features:
  - Email/password authentication
  - Google OAuth integration
  - Form validation
  - Resume upload during registration
  - Terms and privacy policy acceptance

### Employer Authentication (`EmployerAuth.tsx`)
- Manages employer login and registration
- Features:
  - Email/password authentication
  - Google OAuth integration
  - Multi-step registration process
  - Document uploads (business permits, etc.)
  - Terms and privacy policy acceptance

### Supporting Components
- `EmployerDocuments.tsx`: Handles document uploads for employer verification
- `ForgotPasswordPage.tsx`: Password recovery
- `ResetPasswordPage.tsx`: Password reset
- `EmailVerificationPage.tsx`: Email verification
- `TermsModal.tsx`: Displays terms of service
- `PrivacyModal.tsx`: Shows privacy policy
- `SuccessModal.tsx`: Displays success messages
- `VerificationModal.tsx`: Shows verification status

## Shared Utilities

### `authTypes.ts`
- TypeScript interfaces and types for forms and validation

### `authValidation.ts`
- Validation functions for form fields
- Email, password, name validations

### `authUtils.ts`
- Google OAuth utilities
- JWT token handling
- Authentication helper functions

## Flow

1. User selects role (Jobseeker/Employer)
2. Based on selection, user is directed to appropriate auth component
3. For new users:
   - Fills out registration form
   - Accepts terms and conditions
   - (For employers) Uploads required documents
   - Receives email verification
4. For returning users:
   - Logs in with email/password or Google OAuth
   - Redirected to appropriate dashboard

## Security Notes
- Passwords are never stored in plain text
- JWT tokens are used for session management
- All API calls use HTTPS
- Form inputs are validated both client and server side
