const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Employer = require('../models/Employer');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleBasedAccess');

// GET /api/jobs - Get all active jobs (public endpoint for job seekers)
router.get('/', async (req, res) => {
  try {
    const {
      search,
      location,
      type,
      level,
      workplaceType,
      department,
      salaryMin,
      salaryMax,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {};
    if (location) filters.location = location;
    if (type) filters.type = type;
    if (level) filters.level = level;
    if (workplaceType) filters.workplaceType = workplaceType;
    if (department) filters.department = department;
    if (salaryMin) filters.salaryMin = parseInt(salaryMin);
    if (salaryMax) filters.salaryMax = parseInt(salaryMax);

    let jobs;
    if (search) {
      jobs = await Job.searchJobs(search, filters);
    } else {
      jobs = await Job.getActiveJobs(filters);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedJobs = jobs.slice(startIndex, endIndex);

    // Convert to public format and add company profile pictures
    const publicJobs = await Promise.all(paginatedJobs.map(async (job) => {
      const jobData = job.getPublicData();
      
      // Get employer's profile picture
      try {
        const employer = await Employer.findById(job.employerId);
        if (employer) {
          const user = await User.findOne({ uid: employer.uid });
          if (user && user.profilePicture) {
            jobData.companyLogo = user.profilePicture;
          }
        }
      } catch (error) {      }
      
      return jobData;
    }));

    res.json({
      success: true,
      data: {
        jobs: publicJobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(jobs.length / limit),
          totalJobs: jobs.length,
          hasNext: endIndex < jobs.length,
          hasPrev: startIndex > 0
        }
      }
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
});

// GET /api/jobs/stats - Get job statistics (public)
router.get('/stats/overview', async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments({ status: 'active' });
    const totalCompanies = await Job.distinct('employerId', { status: 'active' });
    const jobsByType = await Job.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const jobsByLocation = await Job.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        totalJobs,
        totalCompanies: totalCompanies.length,
        jobsByType,
        topLocations: jobsByLocation
      }
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching job statistics',
      error: error.message
    });
  }
});

// GET /api/jobs/employer/my-jobs - Get employer's jobs
router.get('/employer/my-jobs', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Get employer details
    const employer = await Employer.findOne({ uid: req.user.uid });
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    const query = { employerUid: req.user.uid };
    if (status && status !== 'all') {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalJobs = await Job.countDocuments(query);


    // Format jobs for employer dashboard
    const formattedJobs = jobs.map(job => ({
      id: job._id,
      title: job.title,
      description: job.description,
      location: job.location,
      salary: job.salary,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      type: job.type,
      level: job.level,
      department: job.department,
      workplaceType: job.workplaceType,
      remote: job.remote,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      educationLevel: job.educationLevel,
      preferredCourse: job.preferredCourse,
      status: job.status,
      applicationCount: job.applicationCount,
      applicantCount: job.applicationCount, // Add this for frontend compatibility
      applicants: job.applicationCount, // Add this for frontend compatibility
      viewCount: job.viewCount,
      postedDate: job.postedDate,
      createdAt: job.createdAt,
      lastUpdated: job.lastUpdated,
      expiryDate: job.expiryDate,
      isAcceptingApplications: job.isAcceptingApplications()
    }));

    res.json({
      success: true,
      data: {
        jobs: formattedJobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / limit),
          totalJobs,
          hasNext: page * limit < totalJobs,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching your job postings',
      error: error.message
    });
  }
});

// GET /api/jobs/:id - Get specific job details (public)
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employerId', 'companyName isVerified accountStatus companyDescription website');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Increment view count
    await job.incrementViewCount();

    // Get public job data with employer info
    const jobData = job.getPublicData();
    if (job.employerId) {
      jobData.companyDetails = {
        ...jobData.companyDetails,
        name: job.employerId.companyName,
        description: job.employerId.companyDescription,
        website: job.employerId.website,
        isVerified: job.employerId.accountStatus === 'verified'
      };
    }

    // Get employer's profile picture
    try {
      const employer = await Employer.findById(job.employerId);
      if (employer) {
        const user = await User.findOne({ uid: employer.uid });
        if (user && user.profilePicture) {
          jobData.companyLogo = user.profilePicture;
        }
      }
    } catch (error) {    }

    res.json({
      success: true,
      data: jobData
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching job details',
      error: error.message
    });
  }
});

// POST /api/jobs - Create new job (employer only)
router.post('/', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      salary,
      salaryMin,
      salaryMax,
      type,
      level,
      department,
      workplaceType,
      remote,
      requirements,
      responsibilities,
      benefits,
      educationLevel,
      preferredCourse,
      status = 'active',
      maxApplications
    } = req.body;

    // Get employer details
    const employer = await Employer.findOne({ uid: req.user.uid });
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    // Check if employer can post jobs
    if (!employer.canPerform('post_jobs')) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to post jobs. Please verify your account first.'
      });
    }

    // Create job
    const jobData = {
      title,
      description,
      employerId: employer._id,
      employerUid: req.user.uid, // Add the Firebase UID for proper application linking
      companyName: employer.companyName,
      companyDetails: {
        name: employer.companyName,
        description: employer.companyDescription,
        industry: employer.industry,
        website: employer.website,
        size: employer.companySize,
        founded: employer.foundedYear,
        headquarters: employer.address?.city ? 
          `${employer.address.city}, ${employer.address.province || ''}, ${employer.address.country || 'Philippines'}`.trim() : 
          'Philippines'
      },
      location,
      salary,
      salaryMin: salaryMin ? parseInt(salaryMin) : null,
      salaryMax: salaryMax ? parseInt(salaryMax) : null,
      type,
      level,
      department,
      workplaceType: workplaceType || (remote ? 'Remote' : 'On-site'),
      remote: remote || workplaceType === 'Remote',
      requirements: Array.isArray(requirements) ? requirements.filter(req => req.trim()) : [],
      responsibilities: Array.isArray(responsibilities) ? responsibilities.filter(resp => resp.trim()) : [],
      benefits: Array.isArray(benefits) ? benefits.filter(ben => ben.trim()) : [],
      educationLevel: educationLevel || '',
      preferredCourse: preferredCourse || '',
      status,
      maxApplications: maxApplications ? parseInt(maxApplications) : null
    };

    const job = new Job(jobData);
    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: {
        id: job._id,
        _id: job._id,
        title: job.title,
        status: job.status,
        postedDate: job.postedDate,
        createdAt: job.createdAt,
        description: job.description,
        location: job.location,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        type: job.type,
        level: job.level,
        department: job.department,
        workplaceType: job.workplaceType,
        remote: job.remote,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        benefits: job.benefits,
        educationLevel: job.educationLevel,
        preferredCourse: job.preferredCourse
      }
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error creating job posting',
      error: error.message
    });
  }
});

// PUT /api/jobs/:id - Update job (employer only)
router.put('/:id', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Get employer details
    const employer = await Employer.findOne({ uid: req.user.uid });
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    // Check if employer owns this job
    if (!job.employerId.equals(employer._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own job postings'
      });
    }

    const {
      title,
      description,
      location,
      salary,
      salaryMin,
      salaryMax,
      type,
      level,
      department,
      workplaceType,
      remote,
      requirements,
      responsibilities,
      benefits,
      educationLevel,
      preferredCourse,
      status,
      maxApplications
    } = req.body;

    // Update job fields
    if (title) job.title = title;
    if (description) job.description = description;
    if (location) job.location = location;
    if (salary !== undefined) job.salary = salary;
    if (salaryMin !== undefined) job.salaryMin = salaryMin ? parseInt(salaryMin) : null;
    if (salaryMax !== undefined) job.salaryMax = salaryMax ? parseInt(salaryMax) : null;
    if (type) job.type = type;
    if (level) job.level = level;
    if (department) job.department = department;
    if (workplaceType) job.workplaceType = workplaceType;
    if (remote !== undefined) job.remote = remote;
    if (requirements) job.requirements = Array.isArray(requirements) ? requirements.filter(req => req.trim()) : [];
    if (responsibilities) job.responsibilities = Array.isArray(responsibilities) ? responsibilities.filter(resp => resp.trim()) : [];
    if (benefits) job.benefits = Array.isArray(benefits) ? benefits.filter(ben => ben.trim()) : [];
    if (educationLevel !== undefined) job.educationLevel = educationLevel || '';
    if (preferredCourse !== undefined) job.preferredCourse = preferredCourse || '';
    if (status) job.status = status;
    if (maxApplications !== undefined) job.maxApplications = maxApplications ? parseInt(maxApplications) : null;

    await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: {
        id: job._id,
        title: job.title,
        status: job.status,
        lastUpdated: job.lastUpdated
      }
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error updating job posting',
      error: error.message
    });
  }
});

// DELETE /api/jobs/:id - Delete job (employer only)
router.delete('/:id', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Get employer details
    const employer = await Employer.findOne({ uid: req.user.uid });
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    // Check if employer owns this job
    if (!job.employerId.equals(employer._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own job postings'
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error deleting job posting',
      error: error.message
    });
  }
});


module.exports = router;
