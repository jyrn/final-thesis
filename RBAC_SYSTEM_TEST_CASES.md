# Role-Based Access Control (RBAC) System Test Cases

## Test Environment Setup
- **Application URL**: https://skillsync-frontend.onrender.com
- **Backend API**: https://skillsync-backend-gwwo.onrender.com
- **Test Data**: Pre-created accounts for each role
- **Browser**: Chrome/Firefox latest version

---

## RBAC Test Cases Summary Table

| Test Case ID | Role | Test Case Description | Test Steps | Test Input | Expected Result | Status | Actual Result | Severity |
|--------------|------|----------------------|------------|------------|-----------------|--------|---------------|----------|
| ST-RBAC-01 | Jobseeker/Employer | Unauthorized Admin Panel Access | 1. Navigate to login page<br>2. Login with jobseeker credentials<br>3. Access `/admin/auth`<br>4. Try `/admin/dashboard`<br>5. Verify redirection<br>6. Repeat with employer | - Jobseeker email/password<br>- Employer email/password<br>- URLs: `/admin/auth`, `/admin/dashboard` | - Redirect to unauthorized page<br>- 403 Forbidden response<br>- No admin features accessible<br>- "Access denied" message | Pending | - | Critical |
| ST-RBAC-02 | Jobseeker | Employer Features Access | 1. Login with jobseeker credentials<br>2. Navigate to jobseeker dashboard<br>3. Access employer routes<br>4. Try employer API calls<br>5. Check developer tools<br>6. Verify UI elements | - Jobseeker credentials<br>- Employer endpoints<br>- Sample job data | - Employer routes redirect/403<br>- API returns 403 Forbidden<br>- No employer features accessible<br>- No employer UI elements | Pending | - | Major |
| ST-RBAC-03 | Employer | Admin Features Access | 1. Login with verified employer<br>2. Navigate to employer dashboard<br>3. Access admin routes<br>4. Try admin API calls<br>5. Check network responses<br>6. Verify UI elements | - Verified employer credentials<br>- Admin endpoints<br>- Sample user IDs | - Admin routes redirect/403<br>- API returns 403 Forbidden<br>- No admin features accessible<br>- No admin UI elements | Pending | - | Major |
| ST-RBAC-04 | Employer (Unverified) | Job Posting Restriction | 1. Login with unverified employer<br>2. Navigate to dashboard<br>3. Access "Post Job" feature<br>4. Submit job form<br>5. Make direct API call<br>6. Verify error handling | - Unverified employer account<br>- Complete job form data<br>- Valid job posting JSON | - Job form disabled/message shown<br>- API returns 403<br>- Verification required message<br>- No job created | Pending | - | Major |
| ST-RBAC-05 | All Users | Cross-User Data Access | 1. Login with jobseeker A<br>2. Note user ID<br>3. Access other user's data<br>4. Repeat with employer B<br>5. Verify ownership validation | - User A credentials/ID<br>- User B credentials/ID<br>- Other user IDs | - API returns 403 Forbidden<br>- "Access own data only" message<br>- No sensitive data exposed<br>- Ownership validation enforced | Pending | - | Critical |
| ST-RBAC-06 | Admin/PESO Staff | User Management Access | 1. Login with admin credentials<br>2. Navigate to admin dashboard<br>3. Access user management<br>4. Test admin API endpoints<br>5. Verify functionality | - Admin/PESO credentials<br>- Sample user IDs<br>- Verification data | - Full user management access<br>- Admin APIs return 200<br>- Management functions work<br>- All admin UI visible | Pending | - | Critical |
| ST-RBAC-07 | All Roles | UI Element Visibility | 1. Login with each role<br>2. Verify navigation menus<br>3. Check feature visibility<br>4. Verify dashboard content | - All role credentials<br>- UI elements<br>- Navigation menus | - Role-appropriate UI elements<br>- Correct navigation menus<br>- Matching dashboard content<br>- No unauthorized buttons | Pending | - | Major |
| ST-RBAC-08 | All Roles | Session Role Validation | 1. Login with jobseeker<br>2. Navigate multiple pages<br>3. Perform various actions<br>4. Check browser storage<br>5. Modify role manually<br>6. Test session timeout | - Jobseeker credentials<br>- Browser storage data<br>- Session tokens | - Consistent role throughout<br>- Manual modification ineffective<br>- Session timeout works<br>- Server-side validation | Pending | - | Major |
| ST-RBAC-09 | All Roles | API Token Authentication | 1. Login and capture token<br>2. Test with valid token<br>3. Test with invalid token<br>4. Test without token<br>5. Test cross-role token<br>6. Verify refresh mechanism | - Valid auth token<br>- Invalid/expired token<br>- Cross-role token | - Valid tokens allow access<br>- Invalid tokens return 401<br>- Missing tokens return 401<br>- Cross-role returns 403 | Pending | - | Critical |
| ST-RBAC-10 | Employer/Jobseeker | Data Filtering by Role | 1. Login with employer<br>2. Search jobseekers<br>3. Verify public data only<br>4. Login with jobseeker<br>5. View employer profiles<br>6. Verify data filtering | - Employer credentials<br>- Jobseeker credentials<br>- Complete user profiles | - Only public data visible<br>- Sensitive info hidden<br>- Appropriate employer info shown<br>- Privacy settings respected | Pending | - | Major |

---

## Detailed Test Case Descriptions

### ST-RBAC-01: Unauthorized Admin Panel Access
**Detailed Steps:**
1. Navigate to the application login page
2. Login with a valid jobseeker account credentials
3. Attempt to access admin dashboard by navigating to `/admin/auth`
4. Try to access admin routes directly: `/admin/dashboard`
5. Verify response and redirection behavior
6. Logout and repeat steps 2-5 with employer account

**API Endpoints to Test:**
- `GET /admin/auth`
- `GET /admin/dashboard`
- `GET /api/admin/stats`

### ST-RBAC-02: Jobseeker Accessing Employer Features
**Detailed Steps:**
1. Login with valid jobseeker credentials
2. Navigate to jobseeker dashboard
3. Attempt to access employer routes: `/employer/dashboard`, `/employer/post-job`, `/employer/applicants`
4. Try to make API calls to employer endpoints
5. Verify browser developer tools for API response codes
6. Check if any employer UI elements are visible

**API Endpoints to Test:**
- `POST /api/jobs` (create job posting)
- `GET /api/employer/applications` (view applications)
- `PUT /api/employer/profile` (update employer profile)

### ST-RBAC-03: Employer Accessing Admin Features
**Detailed Steps:**
1. Login with valid verified employer credentials
2. Navigate to employer dashboard
3. Attempt to access admin routes: `/admin/dashboard`, `/admin/users`, `/admin/reports`
4. Try to make API calls to admin endpoints
5. Check browser network tab for response codes
6. Verify no admin UI elements are visible

**API Endpoints to Test:**
- `GET /api/admin/stats` (dashboard statistics)
- `POST /api/admin/employers/verify` (verify employers)
- `DELETE /api/admin/jobseekers/:id` (delete jobseekers)
- `GET /api/admin/reports/generate` (generate reports)

---

## Test Execution Requirements

### Pre-requisites:
1. Test accounts created for each role (jobseeker, employer, admin, PESO staff)
2. Sample data populated (jobs, applications, profiles)
3. Browser developer tools enabled for API monitoring
4. Test environment accessible and stable

### Test Data Requirements:
- **Jobseeker Account**: Active jobseeker with complete profile
- **Employer Account**: Both verified and unverified employer accounts
- **Admin Account**: PESO staff and admin level accounts
- **Sample Jobs**: Various job postings for testing
- **Applications**: Sample job applications for testing

### Success Criteria:
- All unauthorized access attempts should be properly blocked
- Appropriate error messages should be displayed
- Role-based features should work correctly for authorized users
- No security vulnerabilities should be present
- User experience should be smooth for authorized actions

### Risk Assessment:
- **Critical**: Unauthorized admin access, cross-user data access, API token validation
- **Major**: Role-based feature access, UI element visibility, session validation
- **Minor**: Error message clarity, user experience issues
